import logging
import requests
from datetime import datetime

logger = logging.getLogger(__name__)

def fetch_on_this_day():
    """Holt historische Ereignisse für das heutige Datum (kein Key nötig)."""
    now = datetime.now()
    url = f"https://byabbe.se/on-this-day/{now.month}/{now.day}/events.json"
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        data = r.json()
        events = data.get("events", [])
        if not events:
            return None
        # Wir nehmen ein zufälliges Ereignis aus der Liste
        import random
        event = random.choice(events)
        return {
            "year": event.get("year", "Unbekannt"),
            "description": event.get("description", "Keine Beschreibung verfügbar.")
        }
    except Exception as e:
        logger.error(f"History-API Fehler: {e}")
        return None