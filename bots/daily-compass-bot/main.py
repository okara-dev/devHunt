#!/usr/bin/env python3
"""
Daily Compass – Erweitert mit RSS-News, Dev.to und DeepL
"""

import json
import sys
import os
from datetime import datetime

from apis.rss_news import RSSNews
from apis.devto_api import DevToAPI
from apis.nasa_api import NASAAPI
from apis.proverbs_api import ProverbsAPI
from apis.joke_api import JokeAPI
from apis.translator import init_translator
from apis.email_sender import EmailSender

def load_config():
    with open("config.json", "r", encoding="utf-8") as f:
        return json.load(f)

def run_compass():
    print("🧭 Daily Compass wird gestartet...")
    print(f"📅 {datetime.now().strftime('%A, %d. %B %Y')}")
    print("-" * 40)
    
    config = load_config()
    
    # DeepL Translator ZUERST initialisieren (global für alle Module)
    init_translator(config["deepl_api_key"])
    
    # APIs initialisieren
    news = RSSNews()
    devto = DevToAPI()
    nasa = NASAAPI(config["api_keys"]["nasa_api"])
    proverbs = ProverbsAPI()
    joke = JokeAPI()
    
    email = EmailSender(config["email"])
    
    print("📡 Rufe Daten von APIs ab...")
    
    # 1. RSS News (erweitert)
    print("  📰 RSS News...")
    articles = news.get_headlines(max_articles=10)
    rss_content = news.format(articles)
    
    # 2. Dev.to
    print("  👨‍💻 Dev.to...")
    dev_articles = devto.get_top_articles(limit=5)
    dev_content = devto.format(dev_articles)
    
    # 3. NASA
    print("  🚀 NASA...")
    nasa_data = nasa.get_apod()
    nasa_content = nasa.format(nasa_data) if nasa_data else "🚀 NASA nicht verfügbar"
    
    # 4. Sprichwort
    print("  📜 Sprichwort...")
    proverb_data = proverbs.get_proverb()
    proverb_content = proverbs.format(proverb_data) if proverb_data else "📜 Kein Sprichwort"
    
    # 5. Witz
    print("  😂 Witz...")
    joke_data = joke.get_joke()
    joke_content = joke.format(joke_data) if joke_data else "😂 Kein Witz"
    
    # E-Mail senden
    print("\n📧 Sende E-Mail...")
    success = email.send_daily_compass(
        rss_content, dev_content,
        nasa_content, proverb_content, joke_content
    )
    
    if success:
        print("✅ Daily Compass erfolgreich gesendet!")
    else:
        print("❌ Fehler beim Senden!")

def main():
    if not os.path.exists("config.json"):
        print("❌ config.json nicht gefunden!")
        sys.exit(1)
    
    run_compass()
    
    if "--no-pause" not in sys.argv:
        input("\nDrücke Enter zum Beenden...")

if __name__ == "__main__":
    main()