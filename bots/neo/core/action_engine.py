"""
Führt Aktionen aus.
"""

from actions.system_info import get_system_info
from actions.time_date import get_time_date
from actions.pc_control import open_app
from actions.browser import open_url, search_web
from actions.files import read_file, list_files
from actions.folder import open_folder
from actions.media import media_control
from actions.system_actions import system_action
from actions.notes import add_note, list_notes
from actions.email_classifier import classify_email
from apis.weather_api import get_weather
from apis.calendar_api import (
    get_calendar, add_event, delete_event, clear_calendar
)
from apis.news_api import get_news


class ActionEngine:
    def __init__(self, logger):
        self.logger = logger

    def execute(self, tool_name: str, arguments: dict) -> str:
        self.logger.info(f"Action: {tool_name} mit {arguments}")
        try:
            # ---------- Kalender ----------
            if tool_name == "get_calendar":
                return get_calendar(arguments.get("date", "today"))
            if tool_name == "add_calendar_event":
                return add_event(arguments.get("text", ""))
            if tool_name == "delete_calendar_event":
                return delete_event(arguments.get("text", ""))
            if tool_name == "clear_calendar":
                return clear_calendar()

            # ---------- System ----------
            if tool_name == "get_system_info":
                return get_system_info(arguments.get("info_type", "all"))
            if tool_name == "get_time_date":
                return get_time_date()
            if tool_name == "system_action":
                return system_action(arguments.get("action", "lock"))

            # ---------- PC ----------
            if tool_name == "open_app":
                return open_app(arguments.get("target", ""))
            if tool_name == "open_url":
                return open_url(arguments.get("url", ""))
            if tool_name == "search_web":
                return search_web(arguments.get("query", ""))
            if tool_name == "open_folder":
                return open_folder(arguments.get("path", ""))

            # ---------- Dateien ----------
            if tool_name == "read_file":
                return read_file(arguments.get("path", ""))
            if tool_name == "list_files":
                return list_files(arguments.get("path", "."))

            # ---------- Media ----------
            if tool_name == "media_control":
                return media_control(arguments.get("action", "play_pause"))

            # ---------- Notizen ----------
            if tool_name == "add_note":
                return add_note(arguments.get("text", ""))
            if tool_name == "list_notes":
                return list_notes()

            # ---------- APIs ----------
            if tool_name == "get_weather":
                return get_weather(arguments.get("city", "Berlin"))
            if tool_name == "get_news":
                return get_news(arguments.get("category", "general"))

            # ---------- KI ----------
            if tool_name == "classify_email":
                return classify_email(arguments.get("text", ""))

            return f"Unbekanntes Tool: {tool_name}"

        except Exception as e:
            self.logger.exception(f"Action-Fehler: {e}")
            return f"Verzeihung, Sir. Fehler: {e}"