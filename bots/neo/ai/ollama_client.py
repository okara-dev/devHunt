import json
import re
from pathlib import Path
from ollama import Client


def _strip_thinking(text: str) -> str:
    """Entfernt  ... -Blöcke und Neo-Prefix."""
    text = re.sub(r"[\s\S]*?", "", text, flags=re.IGNORECASE)
    if "" in text:
        text = text.split("")[-1]
    text = re.sub(r"^\s*Neo:\s*", "", text, flags=re.IGNORECASE)
    return text.strip()


class OllamaClient:
    def __init__(self, config: dict, tools: list = None):
        self.host = config.get("ollama_host", "http://localhost:11434")
        self.model = config.get("model", "llama3.2:3b")
        self.client = Client(host=self.host)
        self.tools = tools or []

        personality_path = Path(__file__).resolve().parent.parent / config.get(
            "personality_file", "data/personality.json"
        )
        with open(personality_path, "r", encoding="utf-8") as f:
            personality = json.load(f)

        self.system_prompt = personality.get("system_prompt", "")
        self.history = [{"role": "system", "content": self.system_prompt}]

    def chat(self, user_message: str) -> dict:
        self.history.append({"role": "user", "content": user_message})

        try:
            response = self.client.chat(
                model=self.model,
                messages=self.history,
                tools=self.tools if self.tools else None,
                options={"temperature": 0.7, "top_p": 0.9},
            )
            msg = response["message"]

            if "tool_calls" in msg and msg["tool_calls"]:
                call = msg["tool_calls"][0]
                fn = call["function"]
                return {
                    "type": "tool_call",
                    "tool": fn["name"],
                    "arguments": fn.get("arguments", {}),
                }

            answer = _strip_thinking(msg.get("content", ""))
            self.history.append({"role": "assistant", "content": answer})
            return {"type": "text", "content": answer}

        except Exception as e:
            return {"type": "text", "content": f"Verzeihung, Sir. Fehler: {e}"}

    def send_tool_result(self, tool_name: str, result: str):
        self.history.append({
            "role": "tool",
            "content": result,
            "name": tool_name,
        })

    def final_answer(self) -> str:
        try:
            response = self.client.chat(
                model=self.model,
                messages=self.history,
                options={"temperature": 0.7},
            )
            answer = _strip_thinking(response["message"]["content"])
            self.history.append({"role": "assistant", "content": answer})
            return answer
        except Exception as e:
            return f"Verzeihung, Sir. Fehler: {e}"

    def reset(self):
        self.history = [{"role": "system", "content": self.system_prompt}]