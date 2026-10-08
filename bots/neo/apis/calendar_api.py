"""
Kalender-Verwaltung: Lesen, Hinzufügen, Löschen.
Speichert in data/calendar.json.

Format:
{
  "2026-10-16": [
    {"time": "14:00", "title": "Vorstellungsgespräch"},
    {"time": "18:30", "title": "Abendessen mit Julia"}
  ]
}
"""

import json
import re
from datetime import datetime, timedelta
from pathlib import Path


CALENDAR_FILE = Path(__file__).resolve().parent.parent / "data" / "calendar.json"

MONATE = {
    "januar": 1, "februar": 2, "märz": 3, "april": 4, "mai": 5, "juni": 6,
    "juli": 7, "august": 8, "september": 9, "oktober": 10,
    "november": 11, "dezember": 12,
}

WOCHENTAGE_DE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag",
                 "Freitag", "Samstag", "Sonntag"]


def _load() -> dict:
    if not CALENDAR_FILE.exists():
        return {}
    try:
        return json.loads(CALENDAR_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def _save(data: dict):
    CALENDAR_FILE.parent.mkdir(exist_ok=True)
    CALENDAR_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


# ============================================================
# DATUM PARSEN
# ============================================================

def parse_date(text: str) -> str | None:
    """
    Erkennt Datumsangaben aus natürlicher Sprache.
    Beispiele:
      "am 16.10" → "2026-10-16"
      "am 16.10.2026" → "2026-10-16"
      "morgen" → morgen
      "übermorgen" → übermorgen
      "nächste Woche Montag" → nächster Montag
    """
    lower = text.lower()
    today = datetime.now()

    # "heute", "morgen", "übermorgen"
    if "übermorgen" in lower:
        return (today + timedelta(days=2)).strftime("%Y-%m-%d")
    if "morgen" in lower and "übermorgen" not in lower:
        return (today + timedelta(days=1)).strftime("%Y-%m-%d")
    if "heute" in lower:
        return today.strftime("%Y-%m-%d")

    # "am DD.MM.YYYY" oder "am DD.MM."
    match = re.search(r"(\d{1,2})\.(\d{1,2})\.(\d{4})?", text)
    if match:
        day, month = int(match.group(1)), int(match.group(2))
        year = int(match.group(3)) if match.group(3) else today.year
        # Falls Datum in Vergangenheit liegt, nächstes Jahr
        try:
            candidate = datetime(year, month, day)
            if candidate < today and not match.group(3):
                candidate = datetime(year + 1, month, day)
            return candidate.strftime("%Y-%m-%d")
        except ValueError:
            return None

    # "am 16. Oktober" oder "16. oktober"
    match = re.search(r"(\d{1,2})\.?\s+([a-zä]+)", lower)
    if match:
        day = int(match.group(1))
        monat_name = match.group(2)
        if monat_name in MONATE:
            month = MONATE[monat_name]
            try:
                candidate = datetime(today.year, month, day)
                if candidate < today:
                    candidate = datetime(today.year + 1, month, day)
                return candidate.strftime("%Y-%m-%d")
            except ValueError:
                return None

    # "nächsten Montag", "am Freitag"
    for i, wt in enumerate(WOCHENTAGE_DE):
        if wt.lower() in lower:
            days_ahead = i - today.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            return (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")

    return None


def parse_time(text: str) -> str:
    """Erkennt Uhrzeiten wie '14:00', '14 Uhr', 'um 14'."""
    match = re.search(r"(\d{1,2})[:.](\d{2})", text)
    if match:
        return f"{int(match.group(1)):02d}:{match.group(2)}"

    match = re.search(r"um\s+(\d{1,2})\s*uhr", text.lower())
    if match:
        return f"{int(match.group(1)):02d}:00"

    match = re.search(r"um\s+(\d{1,2})\b", text.lower())
    if match:
        return f"{int(match.group(1)):02d}:00"

    return "09:00"  # Default


def _extract_title(text: str) -> str:
    """Extrahiert den Termin-Titel aus dem Satz."""
    # Alles nach "hab ich", "habe ich", "trag", "eintragen" etc.
    patterns = [
        r"(?:hab ich|habe ich|ich habe|ich hab)\s+(?:ein[en]?\s+)?(.+)",
        r"(?:trag(?:e)?\s+(?:ein|mir)?[: ]*)(.+)",
        r"(?:termin|eintrag)[: ]+(.+)",
        r"(?:um\s+\d{1,2}(?::\d{2})?\s*(?:uhr)?\s*)(.+)",
    ]
    for pat in patterns:
        match = re.search(pat, text, re.IGNORECASE)
        if match:
            title = match.group(1).strip(" .,!?")
            # Uhrzeit am Ende entfernen
            title = re.sub(r"\s*um\s+\d{1,2}(:\d{2})?(\s*uhr)?", "", title, flags=re.IGNORECASE)
            return title.strip(" .,!?")
    return text.strip(" .,!?")


# ============================================================
# CRUD-FUNKTIONEN
# ============================================================

def add_event(text: str) -> str:
    """Fügt Termin aus natürlicher Sprache hinzu."""
    date = parse_date(text)
    if not date:
        return "Sir, ich konnte kein Datum erkennen. Bitte sagen Sie z. B. 'am 16.10.'"

    time = parse_time(text)
    title = _extract_title(text)
    if not title:
        return "Sir, ich konnte keinen Titel erkennen."

    data = _load()
    data.setdefault(date, [])

    # Duplikat-Check
    for ev in data[date]:
        if ev.get("title", "").lower() == title.lower() and ev.get("time") == time:
            return f"Sir, '{title}' steht bereits am {date} um {time} Uhr."

    data[date].append({"time": time, "title": title})
    data[date].sort(key=lambda e: e["time"])
    _save(data)

    dt = datetime.strptime(date, "%Y-%m-%d")
    wt = WOCHENTAGE_DE[dt.weekday()]
    return f"Eingetragen, Sir: {wt}, {dt.day}.{dt.month}.{dt.year} um {time} – {title}"


def get_calendar(date: str = "today") -> str:
    """Zeigt Termine für heute/morgen/Datum."""
    data = _load()
    today = datetime.now()

    if date == "today":
        key = today.strftime("%Y-%m-%d")
        label = "heute"
    elif date == "tomorrow":
        key = (today + timedelta(days=1)).strftime("%Y-%m-%d")
        label = "morgen"
    elif date == "week":
        return _get_week(data)
    else:
        key = date
        label = date

    events = data.get(key, [])
    if not events:
        return f"Keine Termine {label}, Sir."

    dt = datetime.strptime(key, "%Y-%m-%d")
    wt = WOCHENTAGE_DE[dt.weekday()]
    header = f"Termine {label} ({wt}, {dt.day}.{dt.month}.):"
    lines = [f"  • {e['time']} – {e['title']}" for e in events]
    return header + "\n" + "\n".join(lines)


def _get_week(data: dict) -> str:
    today = datetime.now()
    lines = []
    for i in range(7):
        day = today + timedelta(days=i)
        key = day.strftime("%Y-%m-%d")
        events = data.get(key, [])
        if events:
            wt = WOCHENTAGE_DE[day.weekday()]
            lines.append(f"{wt}, {day.day}.{day.month}.{day.year}:")
            for e in events:
                lines.append(f"  • {e['time']} – {e['title']}")
    if not lines:
        return "Keine Termine in den nächsten 7 Tagen, Sir."
    return "Ihre Termine diese Woche:\n" + "\n".join(lines)


def delete_event(text: str) -> str:
    """Löscht Termin aus natürlicher Sprache."""
    data = _load()
    date = parse_date(text)

    # Stichwort zum Suchen
    match = re.search(r"(?:lösche|entferne|streiche)\s+(?:den\s+)?(?:termin\s+)?(.+)", text, re.IGNORECASE)
    keyword = match.group(1).strip(" .,!?") if match else ""
    keyword = re.sub(r"\s*(am|um)\s+\S+", "", keyword).strip(" .,!?")

    if date:
        events = data.get(date, [])
        if not events:
            return f"Sir, am {date} steht nichts im Kalender."

        # Wenn Keyword: passenden Termin finden
        if keyword:
            for i, ev in enumerate(events):
                if keyword.lower() in ev["title"].lower():
                    removed = events.pop(i)
                    if not events:
                        del data[date]
                    _save(data)
                    return f"Gelöscht, Sir: {removed['title']} am {date}."
            return f"Sir, ich finde '{keyword}' am {date} nicht."

        # Sonst: alle Termine des Tages löschen
        count = len(events)
        del data[date]
        _save(data)
        return f"Alle {count} Termine am {date} gelöscht, Sir."

    return "Sir, ich konnte kein Datum erkennen. Bitte sagen Sie z. B. 'lösche Termin am 16.10.'"


def clear_calendar() -> str:
    _save({})
    return "Kalender geleert, Sir."