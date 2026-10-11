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
from apis.weather_api import get_weather
from apis.calendar_api import (
    get_calendar, add_event, delete_event, clear_calendar
)
from core.safety import SafetyCheck


class ActionEngine:
    SUPPORTED_TOOLS = {
        "get_calendar", "add_calendar_event", "delete_calendar_event", "clear_calendar",
        "get_system_info", "get_time_date", "system_action", "open_app", "open_url",
        "search_web", "open_folder", "read_file", "list_files", "media_control",
        "add_note", "list_notes", "get_weather",
    }

    def __init__(self, logger, tools: list[dict] | None = None):
        self.logger = logger
        self.safety = SafetyCheck(logger)
        self.tool_schemas = {
            tool["name"]: tool
            for tool in (tools or [])
            if isinstance(tool, dict) and isinstance(tool.get("name"), str)
        }
        self.supported_tools = set(self.tool_schemas) or self.SUPPORTED_TOOLS

    def execute(self, tool_name: str, arguments: dict, confirmed: bool = False) -> str:
        self.logger.info(f"Action: {tool_name} mit {arguments}")
        if not isinstance(arguments, dict):
            return "Ungültige Werkzeugargumente: Es wird ein JSON-Objekt erwartet."
        if tool_name not in self.supported_tools:
            return f"Unbekanntes Tool: {tool_name}"

        schema = self.tool_schemas.get(tool_name, {}).get("parameters", {})
        properties = schema.get("properties", {})
        required = schema.get("required", [])
        missing = [key for key in required if key not in arguments]
        if missing:
            return f"Erforderliche Werkzeugargumente fehlen: {', '.join(missing)}"
        unexpected = [key for key in arguments if key not in properties]
        if unexpected:
            return f"Unbekannte Werkzeugargumente: {', '.join(unexpected)}"
        for key, value in arguments.items():
            property_schema = properties.get(key, {})
            expected_type = property_schema.get("type")
            if expected_type == "string" and not isinstance(value, str):
                return f"Ungültiger Wert für Werkzeugargument '{key}': Text erwartet."
            if isinstance(value, str) and not value.strip() and key in required:
                return f"Erforderliches Werkzeugargument '{key}' darf nicht leer sein."
            allowed_values = property_schema.get("enum")
            if allowed_values and value not in allowed_values:
                return (
                    f"Ungültiger Wert für Werkzeugargument '{key}'. "
                    f"Erlaubt: {', '.join(allowed_values)}"
                )

        safe, reason = self.safety.is_safe_tool(tool_name, arguments)
        if not safe:
            return reason
        if reason == "confirmation_required" and not confirmed:
            return "Aktion nicht ausgeführt: Vorherige Bestätigung erforderlich."

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

            return f"Unbekanntes Tool: {tool_name}"

        except Exception as e:
            self.logger.exception(f"Action-Fehler: {e}")
            return f"Verzeihung, Sir. Fehler: {e}"