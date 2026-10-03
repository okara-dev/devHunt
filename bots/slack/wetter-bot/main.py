#!/usr/bin/env python3
"""
Wetter-Bot für Slack
Prüft regelmäßig das Wetter und warnt bei Regen, Gewitter, Sturm
"""

import json
import sys
import os
import time
import schedule
import requests
from datetime import datetime
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError


def load_config():
    with open("config.json", "r", encoding="utf-8") as f:
        return json.load(f)


class WeatherBot:
    def __init__(self, config):
        self.config = config
        self.slack = WebClient(token=config["slack"]["bot_token"])
        self.channel = config["slack"]["channel"]
        self.location = config["location"]
        self.alerts = config["alerts"]
        
        # Letzte Alarme tracken (um Spam zu vermeiden)
        self.last_alerts = {}
    
    def send_slack(self, message, emoji="🌤️"):
        """Sendet Nachricht an Slack"""
        try:
            self.slack.chat_postMessage(
                channel=self.channel,
                text=f"{emoji} {message}"
            )
            print(f"   ✅ Slack-Nachricht gesendet")
            return True
        except SlackApiError as e:
            print(f"   ❌ Slack-Fehler: {e.response['error']}")
            return False
    
    def get_weather(self):
        """Holt Wetterdaten von Open-Meteo"""
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": self.location["lat"],
            "longitude": self.location["lon"],
            "hourly": "temperature_2m,precipitation,weathercode,windspeed_10m",
            "forecast_days": 1,
            "timezone": "Europe/Berlin"
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"   ⚠️ Wetter-API Fehler: {e}")
            return None
    
    def check_weather(self):
        """Prüft Wetter und sendet Alarme"""
        print(f"\n🔍 Prüfe Wetter um {datetime.now().strftime('%H:%M:%S')}")
        
        data = self.get_weather()
        if not data:
            return
        
        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        codes = hourly.get("weathercode", [])
        precip = hourly.get("precipitation", [])
        wind = hourly.get("windspeed_10m", [])
        temps = hourly.get("temperature_2m", [])
        
        if not times:
            return
        
        # Aktuelle Stunde finden
        now = datetime.now()
        current_hour = now.strftime("%Y-%m-%dT%H:00")
        
        # Nächste 6 Stunden prüfen
        alerts = []
        
        for i, t in enumerate(times):
            if t < current_hour:
                continue
            if i >= 6:  # Nur nächste 6 Stunden
                break
            
            code = codes[i] if i < len(codes) else 0
            p = precip[i] if i < len(precip) else 0
            w = wind[i] if i < len(wind) else 0
            temp = temps[i] if i < len(temps) else 0
            
            hour_str = t.split("T")[1][:5]
            
            # === REGEN ===
            if self.alerts["rain"] and p >= self.alerts["min_precipitation_mm"]:
                if "regen" not in self.last_alerts or \
                   (now - self.last_alerts["regen"]).total_seconds() > 3600:
                    alerts.append(f"🌧️ **Regen um {hour_str}** ({p:.1f} mm, {temp:.0f}°C)")
                    self.last_alerts["regen"] = now
            
            # === GEWITTER (WMO 95-99) ===
            if self.alerts["thunderstorm"] and 95 <= code <= 99:
                if "gewitter" not in self.last_alerts or \
                   (now - self.last_alerts["gewitter"]).total_seconds() > 3600:
                    alerts.append(f"⛈️ **GEWITTER um {hour_str}** ({temp:.0f}°C)")
                    self.last_alerts["gewitter"] = now
            
            # === STURM (WMO 65, 82 = Starkregen, oder Wind > 50) ===
            if self.alerts["storm"]:
                if code in [65, 82] or w >= self.alerts["min_wind_kmh"]:
                    if "sturm" not in self.last_alerts or \
                       (now - self.last_alerts["sturm"]).total_seconds() > 3600:
                        alerts.append(f"🌪️ **STURM um {hour_str}** (Wind: {w:.0f} km/h)")
                        self.last_alerts["sturm"] = now
        
        # === ALARME SENDEN ===
        if alerts:
            message = f"*Wetter-Warnung für {self.location['name']}:*\n\n"
            message += "\n".join(alerts)
            message += f"\n\n_Stand: {now.strftime('%H:%M')}_"
            
            emoji = "⚠️"
            if any("GEWITTER" in a or "STURM" in a for a in alerts):
                emoji = "🚨"
            
            self.send_slack(message, emoji)
        else:
            print("   ✅ Keine Wetterwarnungen")
    
    def send_startup_message(self):
        """Sendet Start-Nachricht"""
        msg = (
            f"*Wetter-Bot ist online!* ✅\n\n"
            f"📍 Standort: {self.location['name']}\n"
            f"⏰ Prüfung: alle {self.config['check_interval_minutes']} Minuten\n"
            f"🔔 Alarme: Regen, Gewitter, Sturm"
        )
        self.send_slack(msg, "🌤️")
    
    def run(self):
        """Startet den Bot (Dauerbetrieb)"""
        print("🌤️ Wetter-Bot wird gestartet...")
        print(f"📅 {datetime.now().strftime('%A, %d. %B %Y')}")
        print("-" * 60)
        print(f"📍 Standort: {self.location['name']}")
        print(f"📢 Channel: {self.channel}")
        print(f"⏰ Prüfung: alle {self.config['check_interval_minutes']} Minuten")
        print("-" * 60)
        
        # Start-Nachricht
        self.send_startup_message()
        
        # Sofort einmal prüfen
        self.check_weather()
        
        # Schedule
        interval = self.config["check_interval_minutes"]
        schedule.every(interval).minutes.do(self.check_weather)
        
        print(f"\n⏳ Bot läuft. Nächste Prüfung in {interval} Minuten...")
        print("   (Strg+C zum Beenden)\n")
        
        try:
            while True:
                schedule.run_pending()
                time.sleep(60)
        except KeyboardInterrupt:
            print("\n\n👋 Bot wird beendet...")
            self.send_slack("*Wetter-Bot wird beendet* 👋", "🌤️")


def main():
    if not os.path.exists("config.json"):
        print("❌ config.json nicht gefunden!")
        sys.exit(1)
    
    config = load_config()
    
    # Token prüfen
    if "DEIN-TOKEN" in config["slack"]["bot_token"]:
        print("❌ Bitte Bot-Token in config.json eintragen!")
        sys.exit(1)
    
    bot = WeatherBot(config)
    bot.run()


if __name__ == "__main__":
    main()