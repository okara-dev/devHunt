"""
JokeAPI – Witze auf Deutsch
"""

import requests
import random

class JokeAPI:
    def __init__(self):
        self.base_url = "https://v2.jokeapi.dev/joke"
        
        # Deutsche Fallback-Witze
        self.german_jokes = [
            "Warum können Geister so gut lügen? Weil sie durchsichtig sind! 👻",
            "Was sagt ein Gen, das traurig ist? 'Ich bin desolat!' 🧬",
            "Warum nehmen Skelette keinen Regenschirm mit? Weil sie schon durchnässt sind! 💀",
            "Was macht ein Clown im Büro? Faxen! 🤡",
            "Warum können Bienen so gut rechnen? Weil sie den Summ-en kennen! 🐝"
        ]
    
    def get_joke(self):
        """Holt einen Witz (ohne Programming-Kategorie)"""
        # Kategorien: Any, Misc, Pun, Spooky, Christmas, Dark
        # Programming wird NICHT angefragt
        categories = ["Misc", "Pun", "Spooky", "Christmas"]
        category = random.choice(categories)
        
        params = {
            "blacklistFlags": "nsfw,religious,political,racist,sexist,explicit",
            "safe-mode": "true",
            "type": "single"
        }
        
        try:
            response = requests.get(
                f"{self.base_url}/{category}",
                params=params,
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get("error"):
                return self._get_fallback_joke()
            
            # Sicherheitscheck: Falls doch Programming → Fallback
            if data.get("category", "").lower() == "programming":
                return self._get_fallback_joke()
            
            return data
        except Exception as e:
            print(f"❌ JokeAPI Fehler: {e}")
            return self._get_fallback_joke()
    
    def _get_fallback_joke(self):
        return {
            "joke": random.choice(self.german_jokes),
            "category": "Deutsch"
        }
    
    def format(self, data):
        if not data:
            return "😂 Kein Witz verfügbar."
        
        joke = data.get("joke", "Kein Witz")
        category = data.get("category", "Unbekannt")
        
        # Kategorie-Mapping
        category_map = {
            "Misc": "Verschiedenes",
            "Pun": "Wortspiel",
            "Spooky": "Gruselig",
            "Christmas": "Weihnachten",
            "Dark": "Dunkel",
            "Deutsch": "🇩🇪 Deutsch"
        }
        category_de = category_map.get(category, category)
        
        return f"""😂 **WITZ DES TAGES**

{joke}

📂 Kategorie: {category_de}"""