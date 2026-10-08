"""
Sicherheits-Checks für gefährliche Aktionen.
"""

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
        # Shutdown/Lock nur mit Bestätigung
        if tool_name in ("system_shutdown", "system_lock"):
            self.logger.warning(f"Kritische Aktion: {tool_name}")
            return True, "kritisch"

        # Pfad-Checks
        if tool_name in ("open_folder", "delete_file"):
            path = arguments.get("path", "")
            if path.startswith("C:\\Windows") or path.startswith("C:/Windows"):
                return False, "Zugriff auf Windows-Systemordner verweigert, Sir."

        return True, ""