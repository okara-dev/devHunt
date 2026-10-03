#!/usr/bin/env python3
"""
Dev-Chat-Bot
Chat-Bot für Entwickler mit GitHub, npm, Public APIs, QuickChart, DuckDuckGo
"""

import json
import sys
import os
import re

from apis import (
    GitHubAPI, NPMApi, PublicAPIsAPI,
    QuickChartAPI, DuckDuckGoAPI
)

def load_config():
    with open("config.json", "r", encoding="utf-8") as f:
        return json.load(f)

def show_help():
    print("""
╔══════════════════════════════════════════════════════════════╗
║                    🤖 DEV-CHAT-BOT                           ║
╚══════════════════════════════════════════════════════════════╝

Schreib kurze Sätze:

  📦 GITHUB
     "repo facebook/react"
     "user torvalds"
     "suche code fastapi"

  📦 NPM
     "npm express"
     "npm react"

  🌐 PUBLIC APIS
     "api weather"
     "api crypto"

  📊 CHARTS (QuickChart)
     "chart bar Januar,Februar,März 100,200,150"
     "chart line Mo,Di,Mi 5,8,3"
     "chart pie A,B,C 30,50,20"

  🔍 WEB-SUCHE
     "web python tutorial"

  ❓ HILFE
     "hilfe"

  👋 BEENDEN
     "exit"

╚══════════════════════════════════════════════════════════════╝
""")

def detect_intent(message):
    """Erkennt kurze Sätze"""
    msg_lower = message.lower().strip()
    
    # === BEENDEN ===
    if any(w in msg_lower for w in ["exit", "quit", "beenden", "tschüss", "tschuess"]):
        return "exit", None
    
    # === HILFE ===
    if any(w in msg_lower for w in ["hilfe", "help", "befehle"]):
        return "help", None
    
    # === GITHUB REPO ===
    if msg_lower.startswith("repo "):
        return "github_repo", message[5:].strip()
    
    # === GITHUB USER ===
    if msg_lower.startswith("user "):
        return "github_user", message[5:].strip()
    
    # === GITHUB CODE-SUCHE ===
    if msg_lower.startswith("suche code "):
        return "github_code", message[11:].strip()
    
    # === NPM ===
    if msg_lower.startswith("npm "):
        return "npm", message[4:].strip()
    
    # === PUBLIC APIS ===
    if msg_lower.startswith("api "):
        return "public_api", message[4:].strip()
    
    # === CHART ===
    if msg_lower.startswith("chart "):
        return "chart", message[6:].strip()
    
    # === WEB-SUCHE ===
    if msg_lower.startswith("web "):
        return "web", message[4:].strip()
    if msg_lower.startswith("such "):
        return "web", message[5:].strip()
    
    # === FALLBACK ===
    return "unknown", None

def parse_chart_args(args):
    """Parst Chart-Argumente: <typ> <labels> <daten>"""
    parts = args.split()
    if len(parts) < 3:
        return None, None, None
    
    chart_type = parts[0].lower()
    
    # Alles nach dem Typ zusammenfügen
    rest = " ".join(parts[1:])
    
    # Letztes Leerzeichen trennt Labels von Daten
    rest_parts = rest.rsplit(maxsplit=1)
    if len(rest_parts) != 2:
        return None, None, None
    
    labels_str, data_str = rest_parts
    
    # Labels parsen (Komma-getrennt)
    labels = [l.strip() for l in labels_str.split(",") if l.strip()]
    
    # Daten parsen (Komma-getrennt)
    data = []
    for d in data_str.split(","):
        try:
            data.append(float(d.strip()))
        except ValueError:
            return None, None, None
    
    if not labels or not data or len(labels) != len(data):
        return None, None, None
    
    return chart_type, labels, data

def run_devchat():
    print("🤖 Dev-Chat-Bot wird gestartet...")
    print("-" * 60)
    print("💬 Schreib 'hilfe' für alle Befehle.")
    print("-" * 60)
    
    config = load_config()
    
    # APIs initialisieren
    github = GitHubAPI(config.get("github_token"))
    npm = NPMApi()
    publicapis = PublicAPIsAPI()
    quickchart = QuickChartAPI()
    ddg = DuckDuckGoAPI()
    
    while True:
        try:
            message = input("\n> ").strip()
            
            if not message:
                continue
            
            intent, arg = detect_intent(message)
            handled = True
            
            # === EXIT ===
            if intent == "exit":
                print("🤖 Bot: Bis bald! 👋")
                break
            
            # === HILFE ===
            elif intent == "help":
                show_help()
            
            # === GITHUB REPO ===
            elif intent == "github_repo":
                if not arg or "/" not in arg:
                    print("❌ Nutzung: repo <user>/<repo>  (z.B. repo facebook/react)")
                    handled = False
                else:
                    print(f"📦 Suche Repo '{arg}'...")
                    data = github.get_repo(arg)
                    print(github.format_repo(data))
            
            # === GITHUB USER ===
            elif intent == "github_user":
                if not arg:
                    print("❌ Nutzung: user <username>")
                    handled = False
                else:
                    print(f"👤 Suche User '{arg}'...")
                    data = github.get_user(arg)
                    print(github.format_user(data))
            
            # === GITHUB CODE ===
            elif intent == "github_code":
                if not arg:
                    print("❌ Nutzung: suche code <begriff>")
                    handled = False
                else:
                    print(f"🔍 Suche Code '{arg}'...")
                    items = github.search_code(arg)
                    print(github.format_code_results(items, arg))
            
            # === NPM ===
            elif intent == "npm":
                if not arg:
                    print("❌ Nutzung: npm <package>")
                    handled = False
                else:
                    print(f"📦 Suche npm-Package '{arg}'...")
                    data = npm.get_package(arg)
                    downloads = npm.get_downloads(arg) if data else 0
                    print(npm.format(data, downloads))
            
            # === PUBLIC APIS ===
            elif intent == "public_api":
                if not arg:
                    print("❌ Nutzung: api <begriff>")
                    handled = False
                else:
                    print(f"🌐 Suche freie APIs für '{arg}'...")
                    entries = publicapis.search(arg)
                    print(publicapis.format(entries, arg))
            
            # === CHART ===
            elif intent == "chart":
                if not arg:
                    print("❌ Nutzung: chart <typ> <labels> <daten>")
                    print("   Beispiel: chart bar Januar,Februar,März 100,200,150")
                    handled = False
                else:
                    chart_type, labels, data = parse_chart_args(arg)
                    if not chart_type:
                        print("❌ Ungültige Chart-Argumente.")
                        print("   Beispiel: chart bar Januar,Februar,März 100,200,150")
                        handled = False
                    else:
                        print(f"📊 Generiere {chart_type}-Chart...")
                        
                        if chart_type == "bar":
                            url = quickchart.generate_bar_chart(labels, data, "Chart")
                        elif chart_type == "line":
                            url = quickchart.generate_line_chart(labels, data, "Chart")
                        elif chart_type == "pie":
                            url = quickchart.generate_pie_chart(labels, data, "Chart")
                        else:
                            print(f"❌ Unbekannter Chart-Typ: {chart_type}")
                            print("   Verfügbar: bar, line, pie")
                            handled = False
                            continue
                        
                        print(f"\n📊 Chart generiert!")
                        print(f"🖼️ {url}")
            
            # === WEB-SUCHE ===
            elif intent == "web":
                if not arg:
                    print("❌ Nutzung: web <begriff>")
                    handled = False
                else:
                    print(f"🔍 Suche im Web nach '{arg}'...")
                    results = ddg.search(arg)
                    print(ddg.format(results, arg))
            
            # === UNBEKANNT ===
            else:
                print("🤖 Bot: Das habe ich nicht verstanden. 🤔")
                print("   Schreib 'hilfe' für alle Befehle.")
                handled = False
            
            # === NACH JEDER AUSGABE ===
            if handled and intent not in ["help", "exit"]:
                print("\n🤖 Bot: Kann ich noch was für dich tun?")
        
        except KeyboardInterrupt:
            print("\n\n🤖 Bot: Bis bald! 👋")
            break
        except Exception as e:
            print(f"🤖 Bot: Ups, ein Fehler ist aufgetreten: {e}")

def main():
    if not os.path.exists("config.json"):
        print("❌ config.json nicht gefunden!")
        sys.exit(1)
    
    run_devchat()

if __name__ == "__main__":
    main()