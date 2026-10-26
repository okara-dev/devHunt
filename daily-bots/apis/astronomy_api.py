import logging
import requests

logger = logging.getLogger(__name__)

def fetch_astronomy_fact():
    """
    Holt einen zufälligen Astronomie-Fakt.
    Primär: Bootprint (kein Key nötig).
    Fallback: Facts API (kein Key nötig).
    """
    # Primäre Quelle: Bootprint
    try:
        r = requests.get("https://bootprint.space/api/facts/random", timeout=10)
        r.raise_for_status()
        data = r.json()
        # Bootprint liefert ein Feld "fact" (oder ähnlich)
        fact = data.get("fact") or data.get("text")
        if fact:
            return fact
    except Exception as e:
        logger.warning(f"Bootprint-API Fehler: {e}")

    # Fallback: Facts API
    try:
        r = requests.get("https://f-api.ir/api/facts/random", timeout=10)
        r.raise_for_status()
        data = r.json()
        return data.get("fact")
    except Exception as e:
        logger.error(f"Facts-API Fehler: {e}")
        return None