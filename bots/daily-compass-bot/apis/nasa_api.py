"""
NASA API – Astronomy Picture of the Day
Mit Retry bei 503-Fehlern
"""

import requests
import time
from .translator import translate_text

class NASAAPI:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://api.nasa.gov"
    
    def get_apod(self, retries=3):
        """Holt das APOD (mit Retry bei 503)"""
        url = f"{self.base_url}/planetary/apod"
        params = {"api_key": self.api_key}
        
        for attempt in range(retries):
            try:
                response = requests.get(url, params=params, timeout=20)
                
                # 503 → Retry
                if response.status_code == 503:
                    if attempt < retries - 1:
                        wait = (attempt + 1) * 3
                        print(f"   ⏳ NASA überlastet, warte {wait}s...")
                        time.sleep(wait)
                        continue
                    else:
                        return None
                
                response.raise_for_status()
                return response.json()
            
            except requests.exceptions.Timeout:
                if attempt < retries - 1:
                    time.sleep(3)
                    continue
                return None
            except Exception as e:
                print(f"   ⚠️ NASA-Fehler: {e}")
                return None
        
        return None
    
    def format(self, data):
        if not data:
            return "🚀 NASA-Bild aktuell nicht verfügbar (API überlastet)."
        
        title = data.get("title", "Unbekannt")
        date = data.get("date", "Unbekannt")
        explanation = data.get("explanation", "Keine Beschreibung")
        url = data.get("url", "#")
        hd_url = data.get("hdurl", url)
        
        # Übersetzen (nur Titel + kurze Erklärung)
        title_de = translate_text(title)
        explanation_de = translate_text(explanation[:500])
        
        if len(explanation_de) > 400:
            explanation_de = explanation_de[:400] + "..."
        
        return f"""🚀 **NASA: Astronomisches Bild des Tages**
📅 {date}
📷 **{title_de}**

{explanation_de}

🔗 [Bild ansehen]({url})
🖼️ [HD Bild]({hd_url})"""