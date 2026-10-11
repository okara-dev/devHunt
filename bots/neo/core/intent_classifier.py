"""
Schnelle Intent-Erkennung per Pattern-Matching.
"""

import re


def _result(tool: str, **arguments) -> dict:
    return {"tool": tool, "arguments": arguments}


def _capture(pattern: str, text: str, default: str = "") -> str:
    match = re.search(pattern, text, re.IGNORECASE)
    return match.group(1).strip(" \t\r\n\"'.,!?") if match else default


def detect_intent(text: str) -> dict | None:
    lower = text.lower()

    if re.search(r"\b(?:kalender leeren|alle termine löschen)\b", lower):
        return _result("clear_calendar")
    if re.search(r"\b(?:lösche|entferne|streiche)\s+(?:den\s+)?termin\b|\btermin löschen\b", lower):
        return _result("delete_calendar_event", text=text)

    has_date = bool(re.search(
        r"\b(?:heute|morgen|übermorgen)\b|\b\d{1,2}\.\d{1,2}(?:\.\d{2,4})?\b"
        r"|\b\d{1,2}\.?\s+(?:januar|februar|märz|april|mai|juni|juli|"
        r"august|september|oktober|november|dezember)\b",
        lower,
    ))
    wants_event = bool(re.search(
        r"\b(?:trag(?:e)?\b.*\bein|eintragen|neuer termin|"
        r"ich hab(?:e)? am|hab ich am|habe ich am)\b",
        lower,
    ))
    if wants_event and has_date:
        return _result("add_calendar_event", text=text)

    if re.search(r"\b(?:geh auf|öffne website|rufe auf)\b", lower):
        url = _capture(
            r"(https?://\S+|www\.\S+|[A-Z0-9-]+(?:\.[A-Z0-9-]+)+)",
            text,
        )
        if url:
            return _result("open_url", url=url.rstrip(".,!?"))

    if re.search(r"\b(?:google|such nach|suche nach|recherchiere)\b", lower):
        query = _capture(r"\b(?:google|such(?:e)? nach|recherchiere)\s+(.+)", text)
        return _result("search_web", query=query or text)

    if re.search(r"\b(?:wetter|temperatur|regnet|schneit|sonnig)\b", lower):
        city = _capture(
            r"\b(?:in|für)\s+(.+?)(?:\s+(?:bitte|heute|morgen|aktuell|jetzt)\b|[?.!,]|$)",
            text,
            "Berlin",
        )
        return _result("get_weather", city=city)

    if re.search(r"\b(?:wie spät|uhrzeit|wie viel uhr|welcher tag|datum)\b", lower):
        return _result("get_time_date")

    if re.search(
        r"\b(?:ram|cpu|akku|batterie|speicher(?:platz)?|festplatte|"
        r"netzwerk|systeminfos?)\b",
        lower,
    ):
        if re.search(r"\b(?:festplatte|speicherplatz|disk)\b", lower):
            info_type = "disk"
        elif re.search(r"\b(?:ram|arbeitsspeicher)\b", lower):
            info_type = "ram"
        elif re.search(r"\bcpu\b", lower):
            info_type = "cpu"
        elif re.search(r"\b(?:akku|batterie)\b", lower):
            info_type = "battery"
        elif re.search(r"\b(?:netzwerk|ip)\b", lower):
            info_type = "network"
        else:
            info_type = "all"
        return _result("get_system_info", info_type=info_type)

    if re.search(r"\b(?:sperre|shutdown|herunterfahren|neustart|ruhezustand|abmelden)\b", lower):
        if re.search(r"\b(?:shutdown|herunterfahren)\b", lower):
            action = "shutdown"
        elif re.search(r"\b(?:neustart|restart)\b", lower):
            action = "restart"
        elif re.search(r"\b(?:ruhezustand|sleep)\b", lower):
            action = "sleep"
        elif re.search(r"\b(?:abmelden|logout)\b", lower):
            action = "logout"
        else:
            action = "lock"
        return _result("system_action", action=action)

    if re.search(r"\b(?:zeig|liste|was steht an).*\b(?:termine|kalender)\b|\b(?:termine|kalender|kalendar)\b", lower):
        date = "week" if "woche" in lower else "tomorrow" if "morgen" in lower else "today"
        return _result("get_calendar", date=date)

    if re.search(r"\b(?:zeig(?:\s+mir)?|liste|was hab ich notiert|meine|alle)\s+notizen\b", lower):
        return _result("list_notes")

    if re.search(r"\b(?:notiere|neue notiz|merke dir|schreib auf)\b", lower):
        note = _capture(r"\b(?:notiere|neue notiz|merke dir|schreib auf)[: ]+(.+)", text)
        return _result("add_note", text=note or text)

    if re.search(r"\b(?:ordner|verzeichnis)\b", lower):
        path = _capture(r"\b(?:ordner|verzeichnis)\s+(.+)", text, ".")
        return _result("open_folder", path=path)

    if re.search(r"\b(?:lies|zeig inhalt|öffne datei)\b", lower):
        path = _capture(
            r"\b(?:lies|zeig inhalt(?: von)?|öffne datei)\s+(?:die datei\s+)?(.+)",
            text,
        )
        return _result("read_file", path=path)

    if re.search(r"\b(?:liste dateien|was liegt in)\b", lower):
        path = _capture(r"\b(?:liste dateien in|was liegt in)\s+(.+)", text, ".")
        return _result("list_files", path=path)

    if re.search(r"\b(?:öffne|starte|mach auf|start)\s+", lower):
        target = _capture(
            r"\b(?:öffne|starte|mach auf|start)\s+(?:bitte\s+)?(.+)",
            text,
        )
        target = re.sub(r"^(?:den|die|das|einen|ein|eine)\s+", "", target, flags=re.IGNORECASE)
        return _result("open_app", target=target)

    if re.search(r"\b(?:musik|play|pause|lauter|leiser|stumm|nächster|vorheriger)\b", lower):
        if re.search(r"\b(?:lauter)\b", lower):
            action = "volume_up"
        elif re.search(r"\b(?:leiser)\b", lower):
            action = "volume_down"
        elif "stumm" in lower:
            action = "mute"
        elif re.search(r"\b(?:nächster|weiter)\b", lower):
            action = "next"
        elif re.search(r"\b(?:vorheriger|zurück)\b", lower):
            action = "prev"
        else:
            action = "play_pause"
        return _result("media_control", action=action)

    return None