import logging
import requests

logger = logging.getLogger(__name__)

def fetch_nasa_apod():
    """Holt das Astronomy Picture of the Day (nutzt DEMO_KEY, Rate-Limit beachten)."""
    url = "https://api.nasa.gov/planetary/apod"
    params = {"api_key": "DEMO_KEY"}
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
        return {
            "title": data.get("title", "Unbenannt"),
            "explanation": data.get("explanation", "Keine Beschreibung verfügbar."),
            "url": data.get("url", ""),
            "media_type": data.get("media_type", "image")
        }
    except Exception as e:
        logger.error(f"NASA-API Fehler: {e}")
        return None