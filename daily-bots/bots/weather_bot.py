from datetime import datetime
from .base_bot import BaseBot
from apis.weather_api import fetch_weather

class WeatherBot(BaseBot):
    name = "Wetter"

    def check_weather(self):
        w = self.config["weather"]
        data = fetch_weather(w["lat"], w["lon"])
        
        if not data:
            return # Still schweigen, wenn API down ist (kein Spam)

        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        if not times: return

        now = datetime.now()
        start_idx = 0
        for i, t in enumerate(times):
            if datetime.fromisoformat(t) >= now:
                start_idx = i
                break

        msg = f"🌤️ *Wetterbericht für {w['name']}*\n\n"
        # ... (Deine Formatierungs-Logik bleibt gleich) ...
        self.send_slack(msg)