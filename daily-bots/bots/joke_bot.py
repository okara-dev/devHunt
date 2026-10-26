from .base_bot import BaseBot
from apis.joke_api import fetch_joke

class JokeBot(BaseBot):
    name = "Witz"

    def send_joke(self):
        joke = fetch_joke()
        if not joke:
            self.send_slack("⚠️ *Witz-API nicht erreichbar.* Hier ein Fallback: Warum können Geister so gut lügen? Weil sie durchsichtig sind! 👻")
            return
        self.send_slack(f"😄 *Witz des Tages*\n\n{joke}")