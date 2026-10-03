"""
Ollama-Client für lokale LLMs
"""

import requests


class OllamaClient:
    def __init__(self, model="llama3.2:3b", host="http://localhost:11434"):
        self.model = model
        self.host = host
        self.generate_url = f"{host}/api/generate"
        self.chat_url = f"{host}/api/chat"
    
    def generate(self, prompt, system=None, temperature=0.7):
        """Generiert Text mit Ollama"""
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature
            }
        }
        
        if system:
            payload["system"] = system
        
        try:
            response = requests.post(self.generate_url, json=payload, timeout=120)
            response.raise_for_status()
            data = response.json()
            return data.get("response", "").strip()
        except Exception as e:
            print(f"⚠️ Ollama-Fehler: {e}")
            return None
    
    def chat(self, messages, temperature=0.7):
        """Chat-Modus (mit Verlauf)"""
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature
            }
        }
        
        try:
            response = requests.post(self.chat_url, json=payload, timeout=120)
            response.raise_for_status()
            data = response.json()
            return data.get("message", {}).get("content", "").strip()
        except Exception as e:
            print(f"⚠️ Ollama-Fehler: {e}")
            return None
    
    def check_connection(self):
        """Prüft ob Ollama läuft"""
        try:
            response = requests.get(f"{self.host}/api/tags", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def list_models(self):
        """Listet alle installierten Modelle"""
        try:
            response = requests.get(f"{self.host}/api/tags", timeout=5)
            data = response.json()
            return [m["name"] for m in data.get("models", [])]
        except:
            return []