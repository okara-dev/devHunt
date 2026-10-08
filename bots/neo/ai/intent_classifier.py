"""
Schnelle Intent-Erkennung per Pattern-Matching.
Umgeht das LLM, wenn der Befehl eindeutig ist.
"""

import re


# Trigger-Phrasen pro Tool
TRIGGERS = {
    "get_weather": ["wetter", "temperatur", "regnet", "schneit", "sonnig"],
    "get_time_date": ["wie spät", "uhrzeit", "wie viel uhr", "welcher tag", "datum"],
    "get_system_info": ["ram", "cpu", "akku", "speicher", "festplatte", "netzwerk", "systeminfo"],
    "open_app": ["öffne", "starte", "mach auf", "start"],
    "open_url": ["geh auf", "öffne website", "rufe auf"],
    "search_web": ["google", "such nach", "suche nach", "recherchiere"],
    "open_folder": ["ordner", "verzeichnis", "explorer"],
    "take_screenshot": ["screenshot", "bildschirmfoto", "bildschirm kopie"],
    "read_file": ["lies", "zeig inhalt", "öffne datei"],
    "list_files": ["liste dateien", "was liegt in"],
    "media_control": ["musik", "play", "pause", "lauter", "leiser", "stumm", "nächster", "vorheriger"],
    "system_action": ["sperre", "shutdown", "herunterfahren", "neustart", "ruhezustand", "abmelden"],
    "add_note": ["notiere", "notiz", "merke dir", "schreib auf"],
    "list_notes": ["zeig notizen", "meine notizen", "was hab ich notiert"],
    "get_calendar": ["termine", "kalender", "was steht an", "heute an"],
    "get_news": ["nachrichten", "news", "was gibt's neues"],
    "classify_email": ["klassifiziere mail", "ist das spam", "kategorisiere mail"],
}


def detect_intent(text: str) -> dict | None:
    """
    Erkennt Intent per Keyword-Matching.
    Gibt {'tool': name, 'arguments': {...}} oder None zurück.
    """
    lower = text.lower()

    for tool, phrases in TRIGGERS.items():
        for phrase in phrases:
            if phrase in lower:
                args = _extract_args(tool, text, lower)
                return {"tool": tool, "arguments": args}

    return None


def _extract_args(tool: str, original: str, lower: str) -> dict:
    """Extrahiert Argumente aus dem Text."""

    # Wetter: Stadt extrahieren
    if tool == "get_weather":
        match = re.search(r"(?:in|für)\s+([A-ZÄÖÜ][a-zäöüß]+)", original)
        city = match.group(1) if match else "Berlin"
        return {"city": city}

    # Systeminfo: Typ erkennen
    if tool == "get_system_info":
        if "ram" in lower or "speicher" in lower:
            return {"info_type": "ram"}
        if "cpu" in lower:
            return {"info_type": "cpu"}
        if "akku" in lower or "batterie" in lower:
            return {"info_type": "battery"}
        if "festplatte" in lower or "speicherplatz" in lower:
            return {"info_type": "disk"}
        if "netzwerk" in lower or "ip" in lower:
            return {"info_type": "network"}
        return {"info_type": "all"}

    # App öffnen
    if tool == "open_app":
        # Nach "öffne" / "starte" den App-Namen extrahieren
        match = re.search(r"(?:öffne|starte|mach auf|start)\s+(.+?)(?:\s|$)", lower)
        target = match.group(1) if match else ""
        return {"target": target}

    # URL öffnen
    if tool == "open_url":
        match = re.search(r"(https?://\S+|www\.\S+)", original)
        url = match.group(1) if match else ""
        return {"url": url}

    # Websuche
    if tool == "search_web":
        match = re.search(r"(?:google|such nach|suche nach|recherchiere)\s+(.+)", lower)
        query = match.group(1) if match else original
        return {"query": query}

    # Ordner
    if tool == "open_folder":
        match = re.search(r"(?:ordner|verzeichnis)\s+(.+)", lower)
        path = match.group(1) if match else "."
        return {"path": path}

    # Datei lesen
    if tool == "read_file":
        match = re.search(r"(?:lies|zeig inhalt von|öffne datei)\s+(.+)", lower)
        path = match.group(1) if match else ""
        return {"path": path}

    # Ordner auflisten
    if tool == "list_files":
        match = re.search(r"(?:liste dateien in|was liegt in)\s+(.+)", lower)
        path = match.group(1) if match else "."
        return {"path": path}

    # Mediensteuerung
    if tool == "media_control":
        if "play" in lower or "abspielen" in lower:
            return {"action": "play_pause"}
        if "pause" in lower:
            return {"action": "play_pause"}
        if "lauter" in lower:
            return {"action": "volume_up"}
        if "leiser" in lower:
            return {"action": "volume_down"}
        if "stumm" in lower:
            return {"action": "mute"}
        if "nächster" in lower or "weiter" in lower:
            return {"action": "next"}
        if "vorheriger" in lower or "zurück" in lower:
            return {"action": "prev"}
        return {"action": "play_pause"}

    # Systemaktionen
    if tool == "system_action":
        if "sperre" in lower or "lock" in lower:
            return {"action": "lock"}
        if "shutdown" in lower or "herunterfahren" in lower:
            return {"action": "shutdown"}
        if "neustart" in lower or "restart" in lower:
            return {"action": "restart"}
        if "ruhezustand" in lower or "sleep" in lower:
            return {"action": "sleep"}
        if "abmelden" in lower or "logout" in lower:
            return {"action": "logout"}
        return {"action": "lock"}

    # Notiz hinzufügen
    if tool == "add_note":
        match = re.search(r"(?:notiere|notiz|merke dir|schreib auf)[: ]+(.+)", original, re.IGNORECASE)
        text = match.group(1) if match else original
        return {"text": text}

    # Kalender
    if tool == "get_calendar":
        if "morgen" in lower:
            return {"date": "tomorrow"}
        return {"date": "today"}

    # News
    if tool == "get_news":
        return {"category": "general"}

    # Email-Klassifikation
    if tool == "classify_email":
        match = re.search(r"(?:klassifiziere|kategorisiere)[: ]+(.+)", original, re.IGNORECASE)
        text = match.group(1) if match else original
        return {"text": text}

    return {}