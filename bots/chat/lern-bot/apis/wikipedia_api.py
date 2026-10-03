"""
Wikipedia API – Artikel + zufällige Themen
"""

import requests
import random
from urllib.parse import quote

class WikipediaAPI:
    def __init__(self, sprache="de"):
        self.sprache = sprache
        self.base_url = f"https://{sprache}.wikipedia.org/api/rest_v1"
        self.headers = {
            "User-Agent": "ChatBot/1.0 (https://github.com/okara-dev)"
        }
    
    def get_summary(self, title):
        """Holt die Zusammenfassung eines Artikels"""
        encoded = quote(title)
        url = f"{self.base_url}/page/summary/{encoded}"
        
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            return {
                "title": data.get("title", title),
                "extract": data.get("extract", ""),
                "url": data.get("content_urls", {}).get("desktop", {}).get("page", "")
            }
        except Exception as e:
            return None
    
    def get_random_topic(self, kategorie):
        """Holt einen zufälligen Artikel zu einer Kategorie"""
        # Wikipedia-Kategorien durchsuchen
        url = f"https://{self.sprache}.wikipedia.org/w/api.php"
        params = {
            "action": "query",
            "list": "categorymembers",
            "cmtitle": f"Kategorie:{kategorie}",
            "cmlimit": 50,
            "format": "json"
        }
        
        try:
            response = requests.get(url, params=params, headers=self.headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            members = data.get("query", {}).get("categorymembers", [])
            if members:
                # Zufälligen Artikel wählen
                random_member = random.choice(members)
                return self.get_summary(random_member.get("title", ""))
            return None
        except Exception as e:
            return None
    
    def format(self, data):
        if not data:
            return "❌ Kein Wikipedia-Artikel gefunden."
        
        extract = data.get("extract", "")
        if len(extract) > 800:
            extract = extract[:800] + "..."
        
        return f"""
📖 **{data.get('title', '')}**

{extract}

🔗 {data.get('url', '')}
"""