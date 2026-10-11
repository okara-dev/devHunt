"""
Lokaler LLM-Client für Neo.
Nutzt onnxruntime-genai mit dem offiziellen Qwen2.5-1.5B-Instruct-ONNX Paket.
"""

import json
import re
from pathlib import Path

import onnxruntime_genai as og


TOOL_PROMPT_TEMPLATE = """
Du bist ein KI-Assistent mit Werkzeugen. Wenn der Nutzer eine Aktion verlangt,
antworte AUSSCHLIESSLICH mit einem JSON-Objekt in genau diesem Format:

{{"tool": "<tool_name>", "arguments": {{...}}}}

Wenn keine Aktion noetig ist, antworte normal auf Deutsch.

Nutze nach einem Werkzeugaufruf das Werkzeugergebnis als einzige Faktenquelle.
Behaupte niemals, eine Aktion sei erfolgreich gewesen, wenn das Ergebnis einen
Fehler oder eine Ablehnung meldet. Verwende nur die unten aufgefuehrten Werkzeuge
und frage bei fehlenden Pflichtangaben nach, statt Werte zu erfinden.

Verfuegbare Werkzeuge:
{tools}

Beispiele:
Nutzer: "Wie ist das Wetter in Berlin?"
Antwort: {{"tool": "get_weather", "arguments": {{"city": "Berlin"}}}}

Nutzer: "Erzaehl mir einen Witz."
Antwort: Warum koennen Geister so schlecht luegen? Weil man durch sie hindurchsieht.
""".strip()


def _strip_thinking(text: str) -> str:
    """Entfernt optional den Neo-Prefix. Qwen2.5 nutzt kein Thinking."""
    text = re.sub(r"^\s*Neo\s*:\s*", "", text, flags=re.IGNORECASE)
    return text.strip()


class LocalLLMClient:
    def __init__(self, config: dict, tools: list | None = None):
        self.config = config
        self.tools = tools or []

        base_dir = Path(__file__).resolve().parent.parent
        self.model_dir = (base_dir / config["model_dir"]).resolve()
        if not self.model_dir.exists():
            raise FileNotFoundError(f"Modell-Ordner nicht gefunden: {self.model_dir}")

        print(f"-> Lade Modell aus {self.model_dir} ...")
        self.model = og.Model(str(self.model_dir))
        self.tokenizer = og.Tokenizer(self.model)
        print(f"OK Modell geladen: {self.model.type}")

        self.max_new_tokens = config.get("max_new_tokens", 256)
        self.temperature = config.get("temperature", 0.7)
        self.top_p = config.get("top_p", 0.9)

        # Persoenlichkeit laden
        personality_path = base_dir / config.get(
            "personality_file", "data/personality.json"
        )
        with open(personality_path, "r", encoding="utf-8") as f:
            personality = json.load(f)
        self.system_prompt = personality.get("system_prompt", "")

        self.tools_text = self._format_tools()
        self.history: list[dict] = []

    # ---------------------------------------------------------- Helpers
    def _format_tools(self) -> str:
        lines = []
        for t in self.tools:
            params = t.get("parameters", {}).get("properties", {})
            param_str = ", ".join(
                f"{k}: {v.get('type', 'string')}" for k, v in params.items()
            ) or "-"
            lines.append(
                f"- {t['name']}({param_str}): {t.get('description', '')}"
            )
        return "\n".join(lines)

    def _build_prompt(self, user_message: str | None = None) -> str:
        """Baut Qwen2.5-Chat-Prompt im <|im_start|>-Format auf."""
        tool_block = TOOL_PROMPT_TEMPLATE.format(tools=self.tools_text)

        im_start = "<|im_start|>"
        im_end = "<|im_end|>"

        parts = []
        parts.append(f"{im_start}system\n{self.system_prompt}\n\n{tool_block}{im_end}")
        for msg in self.history:
            role = msg["role"]
            parts.append(f"{im_start}{role}\n{msg['content']}{im_end}")
        if user_message is not None:
            parts.append(f"{im_start}user\n{user_message}{im_end}")
        parts.append(f"{im_start}assistant\n")
        return "\n".join(parts)

    # ---------------------------------------------------------- Generierung
    def _generate(self, prompt: str) -> str:
        prompt_tokens = self.tokenizer.encode(prompt)

        params = og.GeneratorParams(self.model)
        params.set_search_options(
            max_length=len(prompt_tokens) + self.max_new_tokens,
            temperature=self.temperature,
            top_p=self.top_p,
        )

        generator = og.Generator(self.model, params)
        generator.append_tokens(prompt_tokens)

        out_tokens: list[int] = []
        while not generator.is_done():
            generator.generate_next_token()
            new_tok = generator.get_next_tokens()[0]
            out_tokens.append(new_tok)
            if len(out_tokens) >= self.max_new_tokens:
                break

        return self.tokenizer.decode(out_tokens)

    # ---------------------------------------------------------- Tool-Parsing
    def _parse_tool_call(self, text: str) -> dict | None:
        text = text.strip()

        decoder = json.JSONDecoder()
        for match in re.finditer(r"\{", text):
            try:
                obj, _ = decoder.raw_decode(text[match.start():])
            except json.JSONDecodeError:
                continue
            if not isinstance(obj, dict) or "tool" not in obj:
                continue
            tool = obj["tool"]
            arguments = obj.get("arguments", {})
            if (
                isinstance(tool, str)
                and tool in {item["name"] for item in self.tools}
                and isinstance(arguments, dict)
            ):
                return {"tool": tool, "arguments": arguments}
        return None

    # ---------------------------------------------------------- Public API
    def chat(self, user_message: str) -> dict:
        self.history.append({"role": "user", "content": user_message})
        return self._generate_response()

    def record_tool_call(self, user_message: str, tool_name: str, arguments: dict):
        self.history.append({"role": "user", "content": user_message})
        self.history.append({
            "role": "assistant",
            "content": json.dumps(
                {"tool": tool_name, "arguments": arguments},
                ensure_ascii=False,
            ),
        })
        self._trim_history()

    def _generate_response(self) -> dict:
        raw = self._generate(self._build_prompt(None))
        text = _strip_thinking(raw).strip()

        tool_call = self._parse_tool_call(text)
        if tool_call:
            self.history.append({"role": "assistant", "content": text})
            self._trim_history()
            return {
                "type": "tool_call",
                "tool": tool_call["tool"],
                "arguments": tool_call["arguments"],
            }

        self.history.append({"role": "assistant", "content": text})
        self._trim_history()
        return {"type": "text", "content": text}

    def send_tool_result(self, tool_name: str, result: str):
        self.history.append(
            {"role": "user", "content": f"Ergebnis des Werkzeugs {tool_name}:\n{result}"}
        )
        self._trim_history()

    def continue_after_tool(self) -> dict:
        return self._generate_response()

    def _trim_history(self):
        if len(self.history) > 20:
            self.history = self.history[-20:]

    def reset(self):
        self.history = []