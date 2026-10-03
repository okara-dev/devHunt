#!/usr/bin/env python3
"""
Nachrichten-Bot für Slack
Überwacht RSS-Feeds und postet wichtige Nachrichten
"""

import json
import sys
import os
import time
import hashlib
import schedule
import feedparser
from datetime import datetime
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError


def load_config():
    with open("config.json", "r", encoding="utf-8") as f:
        return json.load(f)


class NewsBot:
    def __init__(self, config):
        self.config = config
        self.slack = WebClient(token=config["slack"]["bot_token"])
        self.channel = config["slack"]["channel"]
        self.sources = config["sources"]
        self.kategorien = config["kategorien"]
        self.max_articles = config.get("max_articles_per_run", 5)
        self.summary_length = config.get("summary_length", 200)
        
        # Bereits gesendete Artikel tracken (Hash)
        self.seen_file = "seen_articles.json"
        self.seen_articles = self._load_seen()
    
    def _load_seen(self):
        """Lädt bereits gesendete Artikel"""
        if os.path.exists(self.seen_file):
            try:
                with open(self.seen_file, "r", encoding="utf-8") as f:
                    return set(json.load(f))
            except:
                pass
        return set()
    
    def _save_seen(self):
        """Speichert gesendete Artikel"""
        try:
            with open(self.seen_file, "w", encoding="utf-8") as f:
                json.dump(list(self.seen_articles), f)
        except Exception as e:
            print(f"   ⚠️ Konnte seen_articles nicht speichern: {e}")
    
    def _hash_article(self, title, link):
        """Erstellt Hash für Artikel"""
        text = f"{title}|{link}"
        return hashlib.md5(text.encode()).hexdigest()
    
    def _categorize(self, title, summary):
        """Kategorisiert einen Artikel"""
        text = f"{title} {summary}".lower()
        
        for kat_name, kat_info in self.kategorien.items():
            if not kat_info.get("enabled", True):
                continue
            
            for keyword in kat_info.get("keywords", []):
                if keyword.lower() in text:
                    return kat_name, kat_info.get("emoji", "📰")
        
        return None, None
    
    def _clean_summary(self, summary):
        """Bereinigt HTML aus Summary"""
        import re
        # HTML-Tags entfernen
        clean = re.sub(r'<[^>]+>', '', summary)
        # Mehrfache Leerzeichen
        clean = ' '.join(clean.split())
        # Kürzen
        if len(clean) > self.summary_length:
            clean = clean[:self.summary_length] + "..."
        return clean
    
    def fetch_articles(self):
        """Holt Artikel aus allen RSS-Feeds"""
        all_articles = []
        
        for source in self.sources:
            try:
                feed = feedparser.parse(source["url"])
                
                for entry in feed.entries[:10]:
                    title = entry.get("title", "")
                    link = entry.get("link", "")
                    summary = entry.get("summary", entry.get("description", ""))
                    
                    if not title or not link:
                        continue
                    
                    # Duplikat-Check
                    article_hash = self._hash_article(title, link)
                    if article_hash in self.seen_articles:
                        continue
                    
                    # Kategorisieren
                    kat, emoji = self._categorize(title, summary)
                    if not kat:
                        continue  # Nicht relevant
                    
                    all_articles.append({
                        "title": title,
                        "link": link,
                        "summary": self._clean_summary(summary),
                        "source": source["name"],
                        "kategorie": kat,
                        "emoji": emoji,
                        "hash": article_hash
                    })
            except Exception as e:
                print(f"   ⚠️ Feed-Fehler ({source['name']}): {e}")
        
        return all_articles
    
    def send_to_slack(self, articles):
        """Sendet Artikel an Slack"""
        if not articles:
            return
        
        # Nach Kategorie gruppieren
        grouped = {}
        for art in articles:
            kat = art["kategorie"]
            if kat not in grouped:
                grouped[kat] = []
            grouped[kat].append(art)
        
        # Nachrichten senden
        for kat, arts in grouped.items():
            kat_info = self.kategorien[kat]
            emoji = kat_info["emoji"]
            
            # Header
            header = f"{emoji} *{kat.upper()}* — {len(arts)} neue Nachricht(en)"
            
            # Artikel
            message = header + "\n\n"
            
            for art in arts[:self.max_articles]:
                message += f"*{art['title']}*\n"
                message += f"_{art['source']}_\n"
                if art['summary']:
                    message += f"{art['summary']}\n"
                message += f"<{art['link']}|→ Zum Artikel>\n\n"
                
                # Als gesehen markieren
                self.seen_articles.add(art["hash"])
            
            # Senden
            try:
                self.slack.chat_postMessage(
                    channel=self.channel,
                    text=message,
                    mrkdwn=True
                )
                print(f"   ✅ {kat.upper()}: {len(arts)} Artikel gesendet")
            except SlackApiError as e:
                print(f"   ❌ Slack-Fehler ({kat}): {e.response['error']}")
        
        # Speichern
        self._save_seen()
    
    def check_news(self):
        """Prüft alle Quellen und sendet neue Artikel"""
        print(f"\n🔍 Prüfe Nachrichten um {datetime.now().strftime('%H:%M:%S')}")
        
        articles = self.fetch_articles()
        
        if not articles:
            print("   📭 Keine neuen relevanten Nachrichten")
            return
        
        print(f"   📬 {len(articles)} neue relevante Artikel gefunden")
        self.send_to_slack(articles)
    
    def send_startup_message(self):
        """Sendet Start-Nachricht"""
        aktive_kats = [k for k, v in self.kategorien.items() if v.get("enabled", True)]
        
        kategorien_str = ", ".join(
            f"{self.kategorien[k]['emoji']} {k}" for k in aktive_kats
        )
        msg = (
            f"*📰 Nachrichten-Bot ist online!* ✅\n\n"
            f"📡 Quellen: {', '.join(s['name'] for s in self.sources)}\n"
            f"🏷️ Kategorien: {kategorien_str}\n"
            f"⏰ Prüfung: alle {self.config['check_interval_minutes']} Minuten"
        )
        
        try:
            self.slack.chat_postMessage(
                channel=self.channel,
                text=msg,
                mrkdwn=True
            )
            print("   ✅ Start-Nachricht gesendet")
        except SlackApiError as e:
            print(f"   ❌ Slack-Fehler: {e.response['error']}")
    
    def run(self):
        """Startet den Bot (Dauerbetrieb)"""
        print("📰 Nachrichten-Bot wird gestartet...")
        print(f"📅 {datetime.now().strftime('%A, %d. %B %Y')}")
        print("-" * 60)
        print(f"📡 Quellen: {', '.join(s['name'] for s in self.sources)}")
        print(f"📢 Channel: {self.channel}")
        print(f"⏰ Intervall: {self.config['check_interval_minutes']} Minuten")
        print("-" * 60)
        
        # Start-Nachricht
        self.send_startup_message()
        
        # Sofort einmal prüfen
        self.check_news()
        
        # Schedule
        interval = self.config["check_interval_minutes"]
        schedule.every(interval).minutes.do(self.check_news)
        
        print(f"\n⏳ Bot läuft. Nächste Prüfung in {interval} Minuten...")
        print("   (Strg+C zum Beenden)\n")
        
        try:
            while True:
                schedule.run_pending()
                time.sleep(60)
        except KeyboardInterrupt:
            print("\n\n👋 Bot wird beendet...")
            try:
                self.slack.chat_postMessage(
                    channel=self.channel,
                    text="*📰 Nachrichten-Bot wird beendet* 👋",
                    mrkdwn=True
                )
            except:
                pass


def main():
    if not os.path.exists("config.json"):
        print("❌ config.json nicht gefunden!")
        sys.exit(1)
    
    config = load_config()
    
    if "DEIN-TOKEN" in config["slack"]["bot_token"]:
        print("❌ Bitte Bot-Token in config.json eintragen!")
        sys.exit(1)
    
    bot = NewsBot(config)
    bot.run()


if __name__ == "__main__":
    main()