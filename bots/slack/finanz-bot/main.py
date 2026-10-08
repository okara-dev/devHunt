#!/usr/bin/env python3
"""
Finanz-Bot für Slack
Aktien + Krypto + Charts + Watchlist
"""

import json
import sys
import os
import time
import random
import schedule
import requests
import yfinance as yf
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


def save_json(filename, data):
    path = os.path.join("data", filename)
    os.makedirs("data", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


CONFIG = load_config()
WATCHLIST = load_json("watchlist.json") or {"aktien": [], "krypto": []}

app = App(token=CONFIG["slack"]["bot_token"])
CHANNEL = CONFIG["slack"]["channel"]


# ══════════════════════════════════════════════════════════════
# AKTIEN (yfinance)
# ══════════════════════════════════════════════════════════════

def get_aktie(ticker):
    """Holt Aktienkurs via yfinance"""
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        
        price = info.get("regularMarketPrice", info.get("currentPrice", 0))
        prev_close = info.get("regularMarketPreviousClose", info.get("previousClose", 0))
        
        change = price - prev_close
        change_pct = (change / prev_close * 100) if prev_close else 0
        
        return {
            "ticker": ticker.upper(),
            "name": info.get("shortName", ticker.upper()),
            "price": round(price, 2),
            "change": round(change, 2),
            "change_pct": round(change_pct, 2),
            "currency": info.get("currency", "USD"),
            "high": info.get("regularMarketDayHigh", 0),
            "low": info.get("regularMarketDayLow", 0),
        }
    except Exception as e:
        print(f"⚠️ yfinance Fehler ({ticker}): {e}")
        return None


def format_aktie(data):
    if not data:
        return "❌ Aktie nicht gefunden."
    
    emoji = "🟢" if data["change"] >= 0 else "🔴"
    arrow = "⬆️" if data["change"] >= 0 else "⬇️"
    
    return (
        f"📈 *{data['ticker']}* — {data['name']}\n\n"
        f"💰 Kurs: *{data['price']:.2f} {data['currency']}*\n"
        f"{emoji} Änderung: {arrow} {data['change']:+.2f} ({data['change_pct']:+.2f}%)\n"
        f"📊 Tag: {data['low']:.2f} — {data['high']:.2f}"
    )


# ══════════════════════════════════════════════════════════════
# KRYPTO (CoinGecko)
# ══════════════════════════════════════════════════════════════

def get_krypto(coin_id):
    """Holt Krypto-Preis via CoinGecko"""
    try:
        url = "https://api.coingecko.com/api/v3/simple/price"
        params = {
            "ids": coin_id.lower(),
            "vs_currencies": "eur,usd",
            "include_24hr_change": "true",
            "include_market_cap": "true",
            "include_24hr_vol": "true"
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if coin_id.lower() not in data:
            return None
        
        coin = data[coin_id.lower()]
        
        return {
            "id": coin_id.lower(),
            "name": coin_id.capitalize(),
            "price_eur": coin.get("eur", 0),
            "price_usd": coin.get("usd", 0),
            "change_24h": coin.get("eur_24h_change", coin.get("usd_24h_change", 0)),
            "market_cap": coin.get("eur_market_cap", coin.get("usd_market_cap", 0)),
            "volume_24h": coin.get("eur_24h_vol", coin.get("usd_24h_vol", 0))
        }
    except Exception as e:
        print(f"⚠️ CoinGecko Fehler ({coin_id}): {e}")
        return None


def format_krypto(data):
    if not data:
        return "❌ Krypto nicht gefunden."
    
    change = data["change_24h"]
    emoji = "🟢" if change >= 0 else "🔴"
    arrow = "⬆️" if change >= 0 else "⬇️"
    
    # Marktkapitalisierung formatieren
    mcap = data["market_cap"]
    if mcap > 1_000_000_000:
        mcap_str = f"{mcap / 1_000_000_000:.2f} Mrd. €"
    elif mcap > 1_000_000:
        mcap_str = f"{mcap / 1_000_000:.2f} Mio. €"
    else:
        mcap_str = f"{mcap:,.0f} €"
    
    return (
        f"💰 *{data['name']}* ({data['id'].upper()})\n\n"
        f"🇪🇺 Preis: *{data['price_eur']:,.2f} €*\n"
        f"🇺🇸 Preis: *{data['price_usd']:,.2f} $*\n"
        f"{emoji} 24h: {arrow} {change:+.2f}%\n"
        f"📊 Marktkap.: {mcap_str}"
    )


# ══════════════════════════════════════════════════════════════
# CHARTS (QuickChart)
# ══════════════════════════════════════════════════════════════

def get_chart_url(labels, data, title):
    """Erstellt QuickChart-URL"""
    import json as json_lib
    
    chart_config = {
        "type": "line",
        "data": {
            "labels": labels,
            "datasets": [{
                "label": title,
                "data": data,
                "borderColor": "rgba(79, 70, 229, 1)",
                "backgroundColor": "rgba(79, 70, 229, 0.2)",
                "fill": True
            }]
        }
    }
    
    config_json = json_lib.dumps(chart_config)
    encoded = quote(config_json)
    return f"https://quickchart.io/chart?c={encoded}&w=600&h=400&bkg=white"


def get_aktie_chart(ticker, period="1mo"):
    """Holt historische Aktiendaten für Chart"""
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period=period)
        
        if hist.empty:
            return None
        
        dates = [d.strftime("%d.%m") for d in hist.index]
        prices = [round(p, 2) for p in hist["Close"].tolist()]
        
        return get_chart_url(dates, prices, f"{ticker.upper()}")
    except Exception as e:
        print(f"⚠️ Chart-Fehler: {e}")
        return None


# ══════════════════════════════════════════════════════════════
# TÄGLICHE POSTINGS
# ══════════════════════════════════════════════════════════════

def send_daily_market():
    """Sendet tägliche Marktübersicht"""
    print(f"\n📊 Sende Marktübersicht um {datetime.now().strftime('%H:%M:%S')}")
    
    message = "📊 *MARKTÜBERSICHT DES TAGES*\n\n"
    message += f"_Stand: {datetime.now().strftime('%d.%m.%Y %H:%M')}_\n\n"
    
    # === AKTIEN ===
    message += "📈 *AKTIEN*\n\n"
    for ticker in CONFIG.get("aktien", [])[:5]:
        data = get_aktie(ticker)
        if data:
            emoji = "🟢" if data["change"] >= 0 else "🔴"
            message += f"{emoji} *{data['ticker']}* — {data['price']:.2f} {data['currency']} ({data['change_pct']:+.2f}%)\n"
    
    message += "\n"
    
    # === KRYPTO ===
    message += "💰 *KRYPTO*\n\n"
    for coin in CONFIG.get("krypto", [])[:5]:
        data = get_krypto(coin)
        if data:
            emoji = "🟢" if data["change_24h"] >= 0 else "🔴"
            message += f"{emoji} *{data['name']}* — {data['price_eur']:,.2f} € ({data['change_24h']:+.2f}%)\n"
    
    try:
        app.client.chat_postMessage(channel=CHANNEL, text=message, mrkdwn=True)
        print("   ✅ Marktübersicht gesendet")
    except Exception as e:
        print(f"   ❌ Fehler: {e}")


# ══════════════════════════════════════════════════════════════
# SLACK COMMANDS
# ══════════════════════════════════════════════════════════════

@app.command("/aktie")
def handle_aktie(ack, respond, command):
    ack()
    ticker = command.get("text", "").strip()
    
    if not ticker:
        respond("❌ Nutzung: `/aktie <ticker>`\nBeispiel: `/aktie AAPL`")
        return
    
    respond(f"📈 Suche Aktie *{ticker.upper()}*...")
    data = get_aktie(ticker)
    
    if not data:
        respond(f"❌ Aktie '{ticker}' nicht gefunden.")
        return
    
    respond(format_aktie(data))
    
    # Chart
    chart_url = get_aktie_chart(ticker)
    if chart_url:
        respond(f"📊 Chart (1 Monat):\n{chart_url}")


@app.command("/krypto")
def handle_krypto(ack, respond, command):
    ack()
    coin = command.get("text", "").strip()
    
    if not coin:
        respond("❌ Nutzung: `/krypto <coin>`\nBeispiel: `/krypto bitcoin`")
        return
    
    respond(f"💰 Suche Krypto *{coin.capitalize()}*...")
    data = get_krypto(coin)
    
    if not data:
        respond(f"❌ Krypto '{coin}' nicht gefunden.\nTipp: Nutze CoinGecko-IDs (bitcoin, ethereum, solana)")
        return
    
    respond(format_krypto(data))


@app.command("/watchlist")
def handle_watchlist(ack, respond, command):
    ack()
    args = command.get("text", "").strip().split()
    
    if not args:
        # Zeige Watchlist
        aktien = WATCHLIST.get("aktien", [])
        krypto = WATCHLIST.get("krypto", [])
        
        if not aktien and not krypto:
            respond("📋 Watchlist ist leer.\n\nFüge hinzu:\n`/watchlist add aktie AAPL`\n`/watchlist add krypto bitcoin`")
            return
        
        msg = "📋 *DEINE WATCHLIST*\n\n"
        
        if aktien:
            msg += "📈 *Aktien:*\n"
            for t in aktien:
                data = get_aktie(t)
                if data:
                    emoji = "🟢" if data["change"] >= 0 else "🔴"
                    msg += f"{emoji} {data['ticker']} — {data['price']:.2f} ({data['change_pct']:+.2f}%)\n"
        
        if krypto:
            msg += "\n💰 *Krypto:*\n"
            for c in krypto:
                data = get_krypto(c)
                if data:
                    emoji = "🟢" if data["change_24h"] >= 0 else "🔴"
                    msg += f"{emoji} {data['name']} — {data['price_eur']:,.2f} € ({data['change_24h']:+.2f}%)\n"
        
        respond(msg)
        return
    
    # Add/Remove
    if len(args) < 3:
        respond("❌ Nutzung:\n`/watchlist add aktie AAPL`\n`/watchlist add krypto bitcoin`\n`/watchlist remove aktie AAPL`")
        return
    
    action = args[0].lower()
    typ = args[1].lower()
    symbol = args[2].lower()
    
    if typ not in ["aktie", "krypto"]:
        respond("❌ Typ muss 'aktie' oder 'krypto' sein.")
        return
    
    key = "aktien" if typ == "aktie" else "krypto"
    
    if action == "add":
        if symbol not in WATCHLIST[key]:
            WATCHLIST[key].append(symbol)
            save_json("watchlist.json", WATCHLIST)
            respond(f"✅ *{symbol}* zur Watchlist hinzugefügt!")
        else:
            respond(f"⚠️ *{symbol}* ist schon in der Watchlist.")
    
    elif action == "remove":
        if symbol in WATCHLIST[key]:
            WATCHLIST[key].remove(symbol)
            save_json("watchlist.json", WATCHLIST)
            respond(f"✅ *{symbol}* aus Watchlist entfernt!")
        else:
            respond(f"⚠️ *{symbol}* ist nicht in der Watchlist.")
    
    else:
        respond("❌ Nutzung: `add` oder `remove`")


@app.command("/finanzhilfe")
def handle_help(ack, respond):
    ack()
    respond(f"""
💼 *FINANZ-BOT BEFEHLE*

📈 `/aktie <ticker>` — Aktienkurs
   Beispiel: `/aktie AAPL`

💰 `/krypto <coin>` — Krypto-Preis
   Beispiel: `/krypto bitcoin`

📋 `/watchlist` — Deine Watchlist
   `/watchlist add aktie AAPL`
   `/watchlist add krypto bitcoin`
   `/watchlist remove aktie AAPL`

*Täglich um {CONFIG['schedule']['daily']}:*
📊 Marktübersicht

Viel Erfolg beim Investieren! 💰
""")


# ══════════════════════════════════════════════════════════════
# START
# ══════════════════════════════════════════════════════════════

def send_startup_message():
    """Sendet Start-Nachricht"""
    msg = (
        f"*💼 Finanz-Bot ist online!* ✅\n\n"
        f"📈 `/aktie <ticker>` — Aktien\n"
        f"💰 `/krypto <coin>` — Krypto\n"
        f"📋 `/watchlist` — Deine Liste\n\n"
        f"⏰ Täglich um *{CONFIG['schedule']['daily']}:* Marktübersicht\n\n"
        f"_Schreib `/finanzhilfe` für alle Befehle!_"
    )
    
    try:
        app.client.chat_postMessage(channel=CHANNEL, text=msg, mrkdwn=True)
        print("✅ Start-Nachricht gesendet")
    except Exception as e:
        print(f"❌ Fehler: {e}")


def run_scheduler():
    """Startet den Scheduler"""
    schedule.every().day.at(CONFIG['schedule']['daily']).do(send_daily_market)
    
    while True:
        schedule.run_pending()
        time.sleep(60)


def main():
    print("💼 Finanz-Bot wird gestartet...")
    print(f"📅 {datetime.now().strftime('%A, %d. %B %Y')}")
    print("-" * 60)
    print(f"📢 Channel: {CHANNEL}")
    print(f"⏰ Tägliche Postings: {CONFIG['schedule']['daily']}")
    print("-" * 60)
    
    # Start-Nachricht
    send_startup_message()
    
    # Scheduler in Thread
    import threading
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()
    
    # Socket Mode
    print("🔌 Starte Socket Mode...")
    handler = SocketModeHandler(app, CONFIG["slack"]["app_token"])
    handler.start()


if __name__ == "__main__":
    main()