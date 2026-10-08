import json
import webbrowser
import urllib.parse
from pathlib import Path


URLS_FILE = Path(__file__).resolve().parent.parent / "data" / "urls.json"


def _load_urls() -> dict:
    """Lädt urls.json. Gibt leeres Dict zurück, wenn Datei fehlt oder fehlerhaft."""
    if not URLS_FILE.exists():
        return {"shortcuts": {}, "searches": {}}
    try:
        return json.loads(URLS_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {"shortcuts": {}, "searches": {}}


def resolve_url(name: str) -> str | None:
    """Löst einen Shortcut-Namen in eine URL auf. None, wenn nicht gefunden."""
    data = _load_urls()
    return data.get("shortcuts", {}).get(name.strip().lower())


def open_url(url: str) -> str:
    """Öffnet eine URL. Ergänzt https:// falls nötig."""
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    webbrowser.open(url)
    return f"Browser geöffnet: {url}"


def search_web(query: str, engine: str = "google") -> str:
    """Sucht im Web mit der angegebenen Engine (google, youtube, wikipedia, ...)."""
    data = _load_urls()
    searches = data.get("searches", {})

    if engine in searches:
        template = searches[engine]
    else:
        template = "https://www.google.com/search?q={query}"

    url = template.replace("{query}", urllib.parse.quote(query))
    webbrowser.open(url)
    return f"Suche nach '{query}' auf {engine.capitalize()} geöffnet."


def open_by_name(name: str) -> str | None:
    """Öffnet eine URL anhand eines Shortcut-Namens. None, wenn nicht gefunden."""
    url = resolve_url(name)
    if url:
        webbrowser.open(url)
        return f"{name.capitalize()} geöffnet, Sir."
    return None