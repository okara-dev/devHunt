"""
Neo 
"""

import json
import sys
from pathlib import Path

from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from core.logger import setup_logger
from core.action_engine import ActionEngine
from core.intent_classifier import detect_intent
from ai.ollama_client import OllamaClient


def load_config() -> dict:
    with open(BASE_DIR / "config.json", "r", encoding="utf-8") as f:
        return json.load(f)


def load_tools() -> list:
    with open(BASE_DIR / "data" / "commands.json", "r", encoding="utf-8") as f:
        return json.load(f)["tools"]


def _format_butler_answer(tool: str, result: str) -> str:
    """Kurze Butler-Antworten ohne LLM."""
    simple = {
        "open_app": "Erledigt, Sir.",
        "open_url": "Browser läuft, Sir.",
        "search_web": "Suche läuft, Sir.",
        "open_folder": "Explorer geöffnet, Sir.",
    }
    if tool in simple:
        return simple[tool]
    return result


def main():
    console = Console()
    config = load_config()
    logger = setup_logger(config.get("log_level", "INFO"))
    tools = load_tools()

    console.print(Panel.fit(
        f"[bold cyan]{config['assistant_name']}[/bold cyan] – Phase 2 (Actions + Kalender)\n"
        f"Modell: [yellow]{config['model']}[/yellow]  |  Thinking: [red]aus[/red]\n"
        f"Tools: [green]{len(tools)}[/green]  |  Beenden mit [red]'Ciao Neo'[/red]",
        border_style="cyan",
    ))

    logger.info("Neo Phase 2 gestartet")
    neo = OllamaClient(config, tools=tools)
    engine = ActionEngine(logger)

    try:
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

            intent = detect_intent(user_input)

            if intent:
                logger.info(f"Intent: {intent}")
                result = engine.execute(intent["tool"], intent["arguments"])
                logger.info(f"Ergebnis: {result}")
                answer = _format_butler_answer(intent["tool"], result)
            else:
                response = neo.chat(user_input)
                if response["type"] == "tool_call":
                    tool = response["tool"]
                    args = response["arguments"]
                    result = engine.execute(tool, args)
                    answer = _format_butler_answer(tool, result)
                else:
                    answer = response["content"]

            logger.info(f"Neo: {answer}")
            console.print(f"[cyan]Neo:[/cyan] {answer}")

    except Exception as e:
        logger.exception(f"Fehler: {e}")
        console.print(f"[red]Fehler:[/red] {e}")


if __name__ == "__main__":
    main()