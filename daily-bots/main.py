#!/usr/bin/env python3
import os
import json
import time
import logging
import tempfile
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from pathlib import Path
from threading import Lock
from slack_sdk import WebClient

from bots.weather_bot import WeatherBot
from bots.news_bot import NewsBot
from bots.joke_bot import JokeBot
from bots.dev_bot import DevBot
from bots.learn_bot import LearnBot
from bots.astronomy_bot import AstronomyBot
from bots.history_bot import HistoryBot
from bots.nasa_bot import NasaBot

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

DAILY_SCHEDULE = {
    (8, 0): [("joke", "send_joke"), ("news", "check_news")],
    (10, 0): [("learn", "send_lesson")],
    (11, 0): [("history", "send_history")],
    (12, 0): [("astronomy", "send_fact")],
    (14, 0): [("dev", "send_dev_idea")],
    (16, 0): [("learn", "send_lesson")],
    (18, 0): [("nasa", "send_apod")],
    (20, 0): [("news", "check_news")],
}
SCHEDULE_GRACE = timedelta(minutes=5)
POLL_INTERVAL_SECONDS = 1


class SchedulerState:
    def __init__(self, path):
        self.path = Path(path)
        self.lock = Lock()
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            self.completed = set()
            return

        if not isinstance(data, dict) or not isinstance(data.get("completed"), list):
            raise ValueError(f"Ungültige Scheduler-State-Datei: {self.path}")
        if any(not isinstance(key, str) for key in data["completed"]):
            raise ValueError(f"Ungültige Scheduler-State-Datei: {self.path}")

        cutoff = (datetime.now().date() - timedelta(days=30)).isoformat()
        self.completed = {key for key in data["completed"] if key[:10] >= cutoff}

    def mark_completed(self, run_key):
        with self.lock:
            updated = self.completed | {run_key}
            self.path.parent.mkdir(parents=True, exist_ok=True)
            temp_path = None
            try:
                with tempfile.NamedTemporaryFile(
                    mode="w",
                    encoding="utf-8",
                    dir=self.path.parent,
                    prefix=f".{self.path.name}.",
                    suffix=".tmp",
                    delete=False,
                ) as temp_file:
                    temp_path = temp_file.name
                    json.dump({"completed": sorted(updated)}, temp_file)
                    temp_file.write("\n")
                os.replace(temp_path, self.path)
            except OSError:
                if temp_path and os.path.exists(temp_path):
                    os.remove(temp_path)
                raise
            self.completed = updated


def load_config():
    cfg = {
        "slack": {"bot_token": os.getenv("SLACK_BOT_TOKEN"), "channel": os.getenv("SLACK_CHANNEL", "#general")},
        "groq": {"api_key": os.getenv("GROQ_API_KEY")},
        "weather": {"lat": 49.1427, "lon": 9.2109, "name": "Heilbronn", "interval": 60}
    }
    if os.path.exists("config.json"):
        with open("config.json", "r") as f:
            local = json.load(f)
            for key in cfg:
                if key in local:
                    cfg[key].update(local[key])
    cfg["slack"]["bot_token"] = os.getenv("SLACK_BOT_TOKEN")
    cfg["groq"]["api_key"] = os.getenv("GROQ_API_KEY")
    return cfg


def due_jobs(now, submitted):
    """Return today's overdue jobs and recently due hourly weather checks once."""
    jobs = []
    for (hour, minute), actions in DAILY_SCHEDULE.items():
        due_at = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if due_at <= now:
            for bot_name, method_name in actions:
                run_key = f"{now:%Y-%m-%d}_{hour:02d}{minute:02d}_{bot_name}_{method_name}"
                if run_key not in submitted:
                    submitted.add(run_key)
                    jobs.append((run_key, bot_name, method_name))

    if now.minute < SCHEDULE_GRACE.seconds // 60:
        run_key = f"{now:%Y-%m-%d}_{now.hour}_weather"
        if run_key not in submitted:
            submitted.add(run_key)
            jobs.append((run_key, "weather", "check_weather"))

    return jobs


def run_job(bots, state, run_key, bot_name, method_name):
    logger.info("Führe %s.%s aus...", bot_name, method_name)
    try:
        getattr(bots[bot_name], method_name)()
    except Exception:
        logger.exception("Fehler bei %s.%s", bot_name, method_name)
        return

    try:
        state.mark_completed(run_key)
    except OSError:
        logger.exception("Ausführung von %s.%s konnte nicht gespeichert werden", bot_name, method_name)


def main():
    config = load_config()
    if not config["slack"]["bot_token"]:
        raise SystemExit("SLACK_BOT_TOKEN ist nicht gesetzt.")
    
    slack_client = WebClient(token=config["slack"]["bot_token"], timeout=10)
    state_path = os.getenv(
        "DAILY_BOT_STATE_FILE",
        str(Path(__file__).with_name(".daily-bot-state.json")),
    )
    state = SchedulerState(state_path)

    # Bots initialisieren (als Objekte, keine Threads mehr!)
    bots = {
        "weather": WeatherBot(config, slack_client),
        "news": NewsBot(config, slack_client),
        "joke": JokeBot(config, slack_client),
        "dev": DevBot(config, slack_client),
        "learn": LearnBot(config, slack_client),
        "astronomy": AstronomyBot(config, slack_client),
        "history": HistoryBot(config, slack_client),
        "nasa": NasaBot(config, slack_client)
    }

    # Start-Nachricht
    try:
        bots["weather"].send_slack("🤖 *Daily-Bot startet...*")
    except Exception:
        logger.exception("Start-Nachricht konnte nicht gesendet werden")
    submitted = set(state.completed)

    try:
        with ThreadPoolExecutor(max_workers=4, thread_name_prefix="daily-bot") as executor:
            now = datetime.now()
            weather_key = f"{now:%Y-%m-%d}_{now.hour}_weather"
            if weather_key not in submitted:
                submitted.add(weather_key)
                executor.submit(run_job, bots, state, weather_key, "weather", "check_weather")
            logger.info("Scheduler aktiv; prüfe jede Sekunde auf fällige Jobs.")

            while True:
                for run_key, bot_name, method_name in due_jobs(datetime.now(), submitted):
                    executor.submit(run_job, bots, state, run_key, bot_name, method_name)
                time.sleep(POLL_INTERVAL_SECONDS)
    except KeyboardInterrupt:
        logger.info("👋 Beende Bot...")

if __name__ == "__main__":
    main()