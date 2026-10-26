from .base_bot import BaseBot
from apis.history_api import fetch_on_this_day

class HistoryBot(BaseBot):
    name = "Geschichte"

    def send_history(self):
        data = fetch_on_this_day()
        if not data:
            self.send_slack("⚠️ *Geschichts-API nicht erreichbar.* Bitte später prüfen.")
            return
        
        msg = f"🏛️ *An diesem Tag in der Geschichte*\n\n"
        msg += f"📅 *{data['year']}:* {data['description']}"
        self.send_slack(msg)