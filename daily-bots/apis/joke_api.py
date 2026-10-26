import logging
import requests

logger = logging.getLogger(__name__)

def fetch_joke():
    url = "https://v2.jokeapi.dev/joke/Misc,Pun?blacklistFlags=nsfw,religious,political,racist,sexist,explicit&type=single"
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        data = r.json()
        if data.get("error"): return None
        return data.get("joke")
    except Exception as e:
        logger.error(f"Joke-API Fehler: {e}")
        return None