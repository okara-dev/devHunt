"""
News via RSS-Feed (Tagesschau). Kein API-Key nötig.
"""

import requests
import xml.etree.ElementTree as ET


RSS_URL = "https://www.tagesschau.de/xml/rss2/"


def get_news(category: str = "general", limit: int = 5) -> str:
    try:
        r = requests.get(RSS_URL, timeout=10)
        r.raise_for_status()
        root = ET.fromstring(r.content)

        items = root.findall(".//item")[:limit]
        if not items:
            return "Keine Nachrichten verfügbar, Sir."

        lines = []
        for i, item in enumerate(items, 1):
            title = item.findtext("title", "").strip()
            lines.append(f"  {i}. {title}")

        return f"Aktuelle Nachrichten:\n" + "\n".join(lines)
    except Exception as e:
        return f"Nachrichten konnten nicht geladen werden, Sir: {e}"