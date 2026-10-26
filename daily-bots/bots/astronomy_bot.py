from .base_bot import BaseBot
from apis.astronomy_api import fetch_astronomy_fact

class AstronomyBot(BaseBot):
    name = "Astronomie"

    def send_fact(self):
        fact = fetch_astronomy_fact()
        if not fact:
            self.send_slack("⚠️ *Astronomie-API nicht erreichbar.* Bitte später prüfen.")
            return
        self.send_slack(f"🔭 *Astronomie-Fakt des Tages*\n\n{fact}")