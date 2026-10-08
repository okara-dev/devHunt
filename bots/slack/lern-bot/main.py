#!/usr/bin/env python3
"""
Lern-Bot für Slack
- Täglich um 09:00: Wikipedia + Zufallsthema + Vokabeln
- Manuell: /wiki, /buch, /vokabeln
"""

import json
import sys
import os
import random
import time
import schedule
import requests
from datetime import datetime
from urllib.parse import quote

from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler


# ══════════════════════════════════════════════════════════════
# KONFIGURATION
# ══════════════════════════════════════════════════════════════

def load_config():
    with open("config.json", "r", encoding="utf-8") as f:
        return json.load(f)


def load_json(filename):
    path = os.path.join("data", filename)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


CONFIG = load_config()
GRAMMATIK = load_json("grammatik.json")
BASIS_VOKABELN = load_json("basis_vokabeln.json")

app = App(token=CONFIG["slack"]["bot_token"])
CHANNEL = CONFIG["slack"]["channel"]


# ══════════════════════════════════════════════════════════════
# WIKIPEDIA
# ══════════════════════════════════════════════════════════════

def get_wiki_summary(title):
    """Holt Wikipedia-Zusammenfassung"""
    url = f"https://de.wikipedia.org/api/rest_v1/page/summary/{quote(title)}"
    headers = {"User-Agent": "LernBot/1.0"}
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        return {
            "title": data.get("title", title),
            "extract": data.get("extract", ""),
            "url": data.get("content_urls", {}).get("desktop", {}).get("page", "")
        }
    except Exception as e:
        print(f"⚠️ Wikipedia-Fehler: {e}")
        return None


def format_wiki(data):
    if not data:
        return "❌ Kein Wikipedia-Artikel gefunden."
    
    extract = data.get("extract", "")
    if len(extract) > 600:
        extract = extract[:600] + "..."
    
    return (
        f"📖 *{data['title']}*\n\n"
        f"{extract}\n\n"
        f"🔗 <{data['url']}|Ganzen Artikel lesen>"
    )


def get_random_wiki(category):
    """Holt zufälligen Wikipedia-Artikel aus Kategorie"""
    url = "https://de.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "list": "categorymembers",
        "cmtitle": f"Kategorie:{category}",
        "cmlimit": 50,
        "format": "json"
    }
    headers = {"User-Agent": "LernBot/1.0"}
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        members = data.get("query", {}).get("categorymembers", [])
        if members:
            random_member = random.choice(members)
            return get_wiki_summary(random_member.get("title", ""))
        return None
    except Exception as e:
        print(f"⚠️ Wiki-Zufall-Fehler: {e}")
        return None


# ══════════════════════════════════════════════════════════════
# BÜCHER (OpenLibrary)
# ══════════════════════════════════════════════════════════════

def search_books(thema, limit=5):
    """Sucht Bücher bei OpenLibrary"""
    try:
        response = requests.get(
            "https://openlibrary.org/search.json",
            params={"q": thema, "limit": limit, "language": "ger"},
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        return data.get("docs", [])
    except Exception as e:
        print(f"⚠️ OpenLibrary-Fehler: {e}")
        return []


def format_books(books, thema):
    if not books:
        return f"❌ Keine Bücher zu '{thema}' gefunden."
    
    lines = [f"📚 *BUCH-EMPFEHLUNGEN: {thema.upper()}*", ""]
    
    for i, book in enumerate(books[:5], 1):
        title = book.get("title", "Unbekannt")
        authors = book.get("author_name", ["Unbekannt"])
        author = authors[0] if authors else "Unbekannt"
        year = book.get("first_publish_year", "?")
        key = book.get("key", "")
        
        lines.append(f"*{i}. {title}*")
        lines.append(f"   ✍️ {author} ({year})")
        if key:
            lines.append(f"   🔗 <https://openlibrary.org{key}|Mehr Info>")
        lines.append("")
    
    return "\n".join(lines)


# ══════════════════════════════════════════════════════════════
# VOKABELN
# ══════════════════════════════════════════════════════════════

def get_vokabeln(anzahl=10, kategorie=None):
    """Holt zufällige Vokabeln"""
    spanisch = BASIS_VOKABELN.get("Spanisch", {}).get("A1-A2", {})
    
    if not spanisch:
        return []
    
    if kategorie:
        for k in spanisch.keys():
            if k.lower() == kategorie.lower():
                alle = spanisch[k]
                break
        else:
            return []
    else:
        alle = []
        for woerter in spanisch.values():
            alle.extend(woerter)
    
    return random.sample(alle, min(anzahl, len(alle)))


def format_vokabeln(vokabeln, titel="VOKABELN DES TAGES"):
    if not vokabeln:
        return "❌ Keine Vokabeln verfügbar."
    
    lines = [f"🇪🇸 *{titel}*", ""]
    
    for i, v in enumerate(vokabeln, 1):
        es = v.get("es", "")
        de = v.get("de", "")
        lines.append(f"*{i}.* `{es}` → {de}")
    
    lines.append("")
    lines.append("_¡Buena suerte! (Viel Erfolg!)_ 🎓")
    
    return "\n".join(lines)


# ══════════════════════════════════════════════════════════════
# TÄGLICHE POSTINGS (09:00)
# ══════════════════════════════════════════════════════════════

def send_daily_wiki():
    """Sendet Wikipedia-Artikel des Tages"""
    print(f"\n📖 Sende Wikipedia um {datetime.now().strftime('%H:%M:%S')}")
    
    themen = CONFIG.get("daily_wiki_topics", ["Albert Einstein"])
    thema = random.choice(themen)
    
    data = get_wiki_summary(thema)
    message = "📖 *WIKIPEDIA DES TAGES*\n\n" + format_wiki(data)
    
    try:
        app.client.chat_postMessage(channel=CHANNEL, text=message, mrkdwn=True)
        print(f"   ✅ Wikipedia gesendet: {thema}")
    except Exception as e:
        print(f"   ❌ Fehler: {e}")


def send_daily_random():
    """Sendet Zufallsthema des Tages"""
    print(f"\n🎲 Sende Zufallsthema um {datetime.now().strftime('%H:%M:%S')}")
    
    kategorien = CONFIG.get("wikipedia_themen", ["Physik"])
    kategorie = random.choice(kategorien)
    
    data = get_random_wiki(kategorie)
    
    if data:
        message = f"🎲 *ZUFALLSTHEMA: {kategorie.upper()}*\n\n" + format_wiki(data)
    else:
        message = f"🎲 *ZUFALLSTHEMA*\n\n❌ Kein Artikel gefunden."
    
    try:
        app.client.chat_postMessage(channel=CHANNEL, text=message, mrkdwn=True)
        print(f"   ✅ Zufallsthema gesendet: {kategorie}")
    except Exception as e:
        print(f"   ❌ Fehler: {e}")


def send_daily_vocabulary():
    """Sendet Vokabeln des Tages"""
    print(f"\n🇪🇸 Sende Vokabeln um {datetime.now().strftime('%H:%M:%S')}")
    
    vokabeln = get_vokabeln(anzahl=10)
    message = format_vokabeln(vokabeln)
    
    try:
        app.client.chat_postMessage(channel=CHANNEL, text=message, mrkdwn=True)
        print("   ✅ Vokabeln gesendet")
    except Exception as e:
        print(f"   ❌ Fehler: {e}")


def send_all_daily():
    """Sendet alle täglichen Inhalte"""
    send_daily_wiki()
    time.sleep(2)
    send_daily_random()
    time.sleep(2)
    send_daily_vocabulary()


# ══════════════════════════════════════════════════════════════
# SLACK COMMANDS
# ══════════════════════════════════════════════════════════════

@app.command("/wiki")
def handle_wiki(ack, respond, command):
    ack()
    thema = command.get("text", "").strip()
    
    if not thema:
        respond("❌ Nutzung: `/wiki <thema>`")
        return
    
    respond(f"📖 Suche Wikipedia-Artikel zu *{thema}*...")
    data = get_wiki_summary(thema)
    respond(format_wiki(data))


@app.command("/buch")
def handle_buch(ack, respond, command):
    ack()
    thema = command.get("text", "").strip()
    
    if not thema:
        respond("❌ Nutzung: `/buch <thema>`")
        return
    
    respond(f"📚 Suche Bücher zu *{thema}*...")
    books = search_books(thema)
    respond(format_books(books, thema))


@app.command("/vokabeln")
def handle_vokabeln(ack, respond, command):
    ack()
    kategorie = command.get("text", "").strip()
    
    if kategorie:
        vokabeln = get_vokabeln(anzahl=10, kategorie=kategorie)
        if not vokabeln:
            respond(f"❌ Kategorie '{kategorie}' nicht gefunden.")
            return
        respond(format_vokabeln(vokabeln, f"VOKABELN: {kategorie.upper()}"))
    else:
        vokabeln = get_vokabeln(anzahl=10)
        respond(format_vokabeln(vokabeln))


@app.command("/lernhilfe")
def handle_help(ack, respond):
    ack()
    respond(f"""
🎓 *LERN-BOT BEFEHLE*

📖 `/wiki <thema>` — Wikipedia-Artikel
📚 `/buch <thema>` — Bücher suchen
🇪🇸 `/vokabeln [kategorie]` — Vokabeln lernen

*Täglich um {CONFIG['schedule']['daily']}:*
⏰ Wikipedia des Tages
⏰ Zufallsthema des Tages
⏰ Vokabeln des Tages

Viel Spaß beim Lernen! 🎓
""")


# ══════════════════════════════════════════════════════════════
# START
# ══════════════════════════════════════════════════════════════

def send_startup_message():
    """Sendet Start-Nachricht"""
    msg = (
        f"*🎓 Lern-Bot ist online!* ✅\n\n"
        f"📖 `/wiki <thema>` — Wikipedia\n"
        f"📚 `/buch <thema>` — Bücher\n"
        f"🇪🇸 `/vokabeln` — Vokabeln\n\n"
        f"⏰ Täglich um *{CONFIG['schedule']['daily']}:*\n"
        f"   📖 Wikipedia des Tages\n"
        f"   🎲 Zufallsthema des Tages\n"
        f"   🇪🇸 Vokabeln des Tages\n\n"
        f"_Schreib `/lernhilfe` für alle Befehle!_"
    )
    
    try:
        app.client.chat_postMessage(channel=CHANNEL, text=msg, mrkdwn=True)
        print("✅ Start-Nachricht gesendet")
    except Exception as e:
        print(f"❌ Fehler beim Senden: {e}")


def run_scheduler():
    """Startet den Scheduler"""
    schedule.every().day.at(CONFIG['schedule']['daily']).do(send_all_daily)
    
    while True:
        schedule.run_pending()
        time.sleep(60)


def main():
    print("🎓 Lern-Bot wird gestartet...")
    print(f"📅 {datetime.now().strftime('%A, %d. %B %Y')}")
    print("-" * 60)
    print(f"📢 Channel: {CHANNEL}")
    print(f"⏰ Tägliche Postings: {CONFIG['schedule']['daily']}")
    print("-" * 60)
    
    # Start-Nachricht senden
    send_startup_message()
    
    # Scheduler in Thread
    import threading
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()
    
    # Socket Mode starten
    print("🔌 Starte Socket Mode...")
    handler = SocketModeHandler(app, CONFIG["slack"]["app_token"])
    handler.start()


if __name__ == "__main__":
    main()