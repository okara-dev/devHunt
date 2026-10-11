"""
Neo – persönlicher KI-Assistent mit lokalem ONNX-LLM.
"""

import json
import sys
from pathlib import Path

from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm, Prompt

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from core.logger import setup_logger
from core.action_engine import ActionEngine
from core.intent_classifier import detect_intent
from core.safety import SafetyCheck
from ai.local_llm_client import LocalLLMClient


MAX_TOOL_CALLS_PER_TURN = 4


def load_config() -> dict:
    with open(BASE_DIR / "config.json", "r", encoding="utf-8") as f:
        return json.load(f)


def load_tools() -> list:
    with open(BASE_DIR / "data" / "commands.json", "r", encoding="utf-8") as f:
        return json.load(f)["tools"]


def _execute_tool(engine: ActionEngine, tool: str, arguments: dict) -> str:
    safe, reason = engine.safety.is_safe_tool(tool, arguments)
    if not safe:
        return reason

    confirmed = False
    if reason == "confirmation_required":
        description = engine.safety.confirmation_description(tool, arguments)
        confirmed = Confirm.ask(
            f"[yellow]Soll ich wirklich {description}?[/yellow]",
            default=False,
        )
        if not confirmed:
            return "Nicht ausgeführt: Die erforderliche Bestätigung wurde nicht erteilt."

    return engine.execute(tool, arguments, confirmed=confirmed)


def main():
    console = Console()
    config = load_config()
    logger = setup_logger(config.get("log_level", "INFO"))
    tools = load_tools()

    console.print(Panel.fit(
        f"[bold cyan]{config['assistant_name']}[/bold cyan] – Lokales ONNX-LLM\n"
        f"Modell: [yellow]{config.get('model_dir', 'model')}[/yellow]  |  Thinking: [red]aus[/red]\n"
        f"Tools: [green]{len(tools)}[/green]  |  Beenden mit [red]'Ciao Neo'[/red]",
        border_style="cyan",
    ))

    logger.info("Neo gestartet (lokales ONNX-LLM)")

    # Modell laden – kann ein paar Sekunden dauern
    try:
        neo = LocalLLMClient(config, tools=tools)
    except Exception as e:
        logger.exception(f"Konnte LLM nicht laden: {e}")
        console.print(f"[red]Modell konnte nicht geladen werden:[/red] {e}")
        return

    engine = ActionEngine(logger, tools=tools)
    safety = SafetyCheck(logger)

    while True:
        try:
            user_input = Prompt.ask("[bold green]Du[/bold green]").strip()
        except (KeyboardInterrupt, EOFError):
            console.print("\n[cyan]Neo:[/cyan] Auf Wiedersehen, Sir.")
            break

        if not user_input:
            continue

        if user_input.lower() in ("exit", "quit", "beenden", "ciao neo"):
            console.print("[cyan]Neo:[/cyan] Auf Wiedersehen, Sir.")
            break

        if user_input.lower() in ("reset", "neu", "clear"):
            neo.reset()
            console.print("[cyan]Neo:[/cyan] Frisch gewischt, Sir.")
            continue

        logger.info(f"Sir: {user_input}")
        allowed, reason = safety.is_safe(user_input)
        if not allowed:
            console.print(f"[yellow]Neo:[/yellow] {reason}")
            continue

        try:
            intent = detect_intent(user_input)
            if intent:
                logger.info(f"Intent (pattern): {intent}")
                neo.record_tool_call(user_input, intent["tool"], intent["arguments"])
                response = {
                    "type": "tool_call",
                    "tool": intent["tool"],
                    "arguments": intent["arguments"],
                }
            else:
                response = neo.chat(user_input)

            tool_results = []
            tool_call_count = 0
            while response["type"] == "tool_call":
                if tool_call_count >= MAX_TOOL_CALLS_PER_TURN:
                    break

                tool = response["tool"]
                arguments = response["arguments"]
                logger.info(f"Tool-Aufruf: {tool} {arguments}")
                result = _execute_tool(engine, tool, arguments)
                logger.info(f"Ergebnis: {result}")
                tool_results.append(result)
                neo.send_tool_result(tool, result)
                tool_call_count += 1

                if tool_call_count < MAX_TOOL_CALLS_PER_TURN:
                    response = neo.continue_after_tool()

            if response["type"] == "tool_call":
                answer = (
                    "Ich habe die Aktion nach mehreren Werkzeugaufrufen begrenzt, "
                    "damit keine Endlosschleife entsteht."
                )
            else:
                answer = response["content"]

            if tool_results:
                answer = f"{answer}\n\nErgebnis:\n" + "\n".join(tool_results)

            logger.info(f"Neo: {answer}")
            console.print(f"[cyan]Neo:[/cyan] {answer}")
        except Exception as e:
            logger.exception(f"Fehler bei der Verarbeitung: {e}")
            console.print(f"[red]Fehler:[/red] {e}")


if __name__ == "__main__":
    main()