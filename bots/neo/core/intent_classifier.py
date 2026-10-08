"""
Schnelle Intent-Erkennung per Pattern-Matching.
"""

import re


TRIGGERS = {
    "get_weather": ["wetter", "temperatur", "regnet", "schneit", "sonnig"],
    "get_time_date": ["wie spät", "uhrzeit", "wie viel uhr", "welcher tag", "datum"],
    "get_system_info": ["ram", "cpu", "akku", "speicher", "festplatte", "netzwerk", "systeminfo"],

    # Kalender – Reihenfolge wichtig!
    "add_calendar_event": ["trag", "eintragen", "eintrag", "neuer termin", "hab ich", "habe ich", "ich habe am", "ich hab am"],
    "delete_calendar_event": ["lösche termin", "lösche den termin", "entferne termin", "streiche termin", "termin löschen"],
    "clear_calendar": ["kalender leeren", "alle termine löschen"],
    "get_calendar": ["termin", "kalender", "kalendar", "was steht an", "heute an", "diese woche"],

    "list_notes": ["zeig notizen", "meine notizen", "was hab ich notiert", "zeig mir meine notizen", "alle notizen"],
    "add_note": ["notiere", "neue notiz", "merke dir", "schreib auf"],

    "open_app": ["öffne", "starte", "mach auf", "start"],
    "open_url": ["geh auf", "öffne website", "rufe auf"],
    "search_web": ["google", "such nach", "suche nach", "recherchiere"],
    "open_folder": ["ordner", "verzeichnis", "explorer"],
    "read_file": ["lies", "zeig inhalt", "öffne datei"],
    "list_files": ["liste dateien", "was liegt in"],
    "media_control": ["musik", "play", "pause", "lauter", "leiser", "stumm", "nächster", "vorheriger"],
    "system_action": ["sperre", "shutdown", "herunterfahren", "neustart", "ruhezustand", "abmelden"],
    "get_news": ["nachrichten", "news", "was gibt's neues"],
    "classify_email": ["klassifiziere mail", "ist das spam", "kategorisiere mail"],
}


def detect_intent(text: str):
    lower = text.lower()

    # Kalender-Sonderfälle zuerst
    if any(t in lower for t in ["lösche termin", "entferne termin", "streiche termin", "termin löschen"]):
        return {"tool": "delete_calendar_event", "arguments": {"text": text}}
    if any(t in lower for t in ["kalender leeren", "alle termine löschen"]):
        return {"tool": "clear_calendar", "arguments": {}}
    if any(t in lower for t in ["trag", "eintragen", "neuer termin", "ich habe am", "ich hab am", "hab ich", "habe ich"]):
        if re.search(r"\d{1,2}\.\d{1,2}", lower) or "morgen" in lower or "übermorgen" in lower or "heute" in lower:
            return {"tool": "add_calendar_event", "arguments": {"text": text}}

    for tool, phrases in TRIGGERS.items():
        for phrase in phrases:
            if phrase in lower:
                args = _extract_args(tool, text, lower)
                return {"tool": tool, "arguments": args}

    return None


def _extract_args(tool: str, original: str, lower: str) -> dict:
    if tool == "get_weather":
        match = re.search(r"(?:in|für)\s+([A-ZÄÖÜ][a-zäöüß]+)", original)
        city = match.group(1) if match else "Berlin"
        return {"city": city}

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

    if tool == "open_app":
        match = re.search(r"(?:öffne|starte|mach auf|start)\s+(.+?)(?:\s|$)", lower)
        target = match.group(1) if match else ""
        return {"target": target}

    if tool == "open_url":
        match = re.search(r"(https?://\S+|www\.\S+)", original)
        url = match.group(1) if match else ""
        return {"url": url}

    if tool == "search_web":
        match = re.search(r"(?:google|such nach|suche nach|recherchiere)\s+(.+)", lower)
        query = match.group(1) if match else original
        return {"query": query}

    if tool == "open_folder":
        match = re.search(r"(?:ordner|verzeichnis)\s+(.+)", lower)
        path = match.group(1) if match else "."
        return {"path": path}

    if tool == "read_file":
        match = re.search(r"(?:lies|zeig inhalt von|öffne datei)\s+(.+)", lower)
        path = match.group(1) if match else ""
        return {"path": path}

    if tool == "list_files":
        match = re.search(r"(?:liste dateien in|was liegt in)\s+(.+)", lower)
        path = match.group(1) if match else "."
        return {"path": path}

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

    if tool == "add_note":
        match = re.search(r"(?:notiere|neue notiz|merke dir|schreib auf)[: ]+(.+)", original, re.IGNORECASE)
        text = match.group(1) if match else original
        return {"text": text}

    if tool == "list_notes":
        return {}

    if tool == "get_calendar":
        if "woche" in lower:
            return {"date": "week"}
        if "morgen" in lower:
            return {"date": "tomorrow"}
        return {"date": "today"}

    if tool == "add_calendar_event":
        return {"text": original}

    if tool == "delete_calendar_event":
        return {"text": original}

    if tool == "get_news":
        return {"category": "general"}

    if tool == "classify_email":
        match = re.search(r"(?:klassifiziere|kategorisiere)[: ]+(.+)", original, re.IGNORECASE)
        text = match.group(1) if match else original
        return {"text": text}

    return {}