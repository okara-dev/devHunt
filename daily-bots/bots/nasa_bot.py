from .base_bot import BaseBot
from apis.nasa_api import fetch_nasa_apod

class NasaBot(BaseBot):
    name = "NASA"

    def send_apod(self):
        data = fetch_nasa_apod()
        if not data:
            self.send_slack("⚠️ *NASA-API nicht erreichbar.* Bitte später prüfen.")
            return
        
        msg = f"🚀 *NASA Astronomy Picture of the Day*\n\n"
        msg += f"📸 *{data['title']}*\n\n"
        msg += f"{data['explanation'][:500]}...\n\n"
        
        if data['media_type'] == 'image' and data['url']:
            msg += f"🔗 <{data['url']}|Bild ansehen>"
            
        self.send_slack(msg)