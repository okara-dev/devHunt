import logging
import requests

logger = logging.getLogger(__name__)

def fetch_npm_package():
    try:
        r = requests.get("https://registry.npmjs.org/-/v1/search", params={"text": "cli tool", "size": 1}, timeout=10)
        r.raise_for_status()
        return r.json()["objects"][0]["package"]
    except Exception as e:
        logger.error(f"NPM-API Fehler: {e}")
        return None

def fetch_github_repo():
    headers = {"Accept": "application/vnd.github.v3+json"}
    params = {"q": "stars:>1000 language:Python", "sort": "stars", "per_page": 1}
    try:
        r = requests.get("https://api.github.com/search/repositories", headers=headers, params=params, timeout=10)
        r.raise_for_status()
        return r.json()["items"][0]
    except Exception as e:
        logger.error(f"GitHub-API Fehler: {e}")
        return None