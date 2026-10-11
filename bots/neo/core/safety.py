"""
Sicherheits-Checks für gefährliche Aktionen.
"""

import ntpath


BLOCKED_COMMANDS = [
    "format c:",
    "format d:",
    "del /f /s /q c:\\",
    "rmdir /s /q c:\\",
    "shutdown /s /t 0",
    "reg delete hklm",
    "bcdedit",
    "diskpart",
    "cipher /w",
]

BLOCKED_KEYWORDS = [
    "formatieren",
    "lösche alles",
    "delete all",
    "wipe",
    "factory reset",
]

CONFIRM_ACTIONS = {"sleep", "shutdown", "restart", "logout"}
CONFIRM_TOOLS = {"delete_calendar_event", "clear_calendar"}


class SafetyCheck:
    def __init__(self, logger):
        self.logger = logger

    def is_safe(self, text: str) -> tuple[bool, str]:
        """Prüft, ob eine Anfrage sicher ist. Gibt (is_safe, reason) zurück."""
        lower = text.lower()

        for cmd in BLOCKED_COMMANDS:
            if cmd in lower:
                self.logger.warning(f"Blockierter Befehl erkannt: {cmd}")
                return False, f"Der Befehl '{cmd}' ist aus Sicherheitsgründen blockiert, Sir."

        for kw in BLOCKED_KEYWORDS:
            if kw in lower:
                self.logger.warning(f"Blockiertes Schlüsselwort: {kw}")
                return False, f"Diese Aktion ist zu gefährlich, Sir. Ich muss ablehnen."

        return True, ""

    def is_safe_tool(self, tool_name: str, arguments: dict) -> tuple[bool, str]:
        """Prüft, ob ein Tool-Aufruf sicher ist."""
        if tool_name == "system_action":
            action = arguments.get("action")
            if not isinstance(action, str) or action not in {
                "lock", "sleep", "shutdown", "restart", "logout", "cancel"
            }:
                return False, f"Unbekannte Systemaktion: {action}"
            if action in CONFIRM_ACTIONS:
                self.logger.warning(f"Bestätigung für kritische Aktion nötig: {action}")
                return True, "confirmation_required"

        if tool_name in CONFIRM_TOOLS:
            self.logger.warning(f"Bestätigung für Kalenderaktion nötig: {tool_name}")
            return True, "confirmation_required"

        if tool_name == "open_folder":
            path = arguments.get("path", "")
            if not isinstance(path, str):
                return False, "Ungültiger Ordnerpfad, Sir."
            normalized_path = ntpath.normcase(ntpath.abspath(path))
            windows_path = ntpath.normcase(ntpath.join(ntpath.splitdrive(normalized_path)[0], "\\Windows"))
            try:
                if ntpath.commonpath((normalized_path, windows_path)) == windows_path:
                    return False, "Zugriff auf Windows-Systemordner verweigert, Sir."
            except ValueError:
                return False, "Ungültiger Ordnerpfad, Sir."

        return True, ""

    @staticmethod
    def confirmation_description(tool_name: str, arguments: dict) -> str:
        if tool_name == "system_action":
            labels = {
                "sleep": "Ruhezustand einleiten",
                "shutdown": "Computer herunterfahren",
                "restart": "Computer neu starten",
                "logout": "Benutzer abmelden",
            }
            return labels.get(arguments.get("action"), "Systemaktion ausführen")
        if tool_name == "clear_calendar":
            return "alle Kalendereinträge löschen"
        if tool_name == "delete_calendar_event":
            return f"Kalendereintrag löschen: {arguments.get('text', '')}"
        return tool_name