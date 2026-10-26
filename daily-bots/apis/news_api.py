import logging
import requests

logger = logging.getLogger(__name__)

def fetch_news(ressort):
    url = f"https://www.tagesschau.de/api2/news/?ressort={ressort}"
    # WICHTIG: User-Agent mitschicken, sonst 403 Forbidden von der Tagesschau
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        r = requests.get(url, headers=headers, timeout=10)
        r.raise_for_status()
        return r.json().get("news", [])
    except Exception as e:
        logger.error(f"Tagesschau-API ({ressort}) Fehler: {e}")
        return None