#!/usr/bin/env python3
"""
Lern-Bot
Versteht kurze Sätze und antwortet mit APIs
+ Sprachlehrer-Aktivierung
"""

import json
import sys
import os

from apis import WikipediaAPI, OpenLibraryAPI, DuckDuckGoAPI

def load_config():
    with open("config.json", "r", encoding="utf-8") as f:
        return json.load(f)

def show_help():
    print("""
╔══════════════════════════════════════════════════════════════╗
║                      🎓 LERN-BOT                             ║
╚══════════════════════════════════════════════════════════════╝

Schreib kurze Sätze:

  📖 WIKIPEDIA
     "wiki Einstein"
     "info Japan"
     "über Python"

  🎲 ZUFALLSTHEMA
     "thema physik"
     "zufall biologie"
     "random informatik"

  📚 BÜCHER
     "buch psychologie"
     "buch informatik"

  🔍 WEB-SUCHE
     "such python tutorial"
     "google flask"

  🇪🇸 SPRACHLEHRER
     "aktiviere sprachlehrer"     → Startet den Sprachlehrer

  ❓ HILFE
     "hilfe"

  👋 BEENDEN
     "exit" oder "tschüss"

╚══════════════════════════════════════════════════════════════╝
""")

def detect_intent(message):
    """Erkennt kurze Sätze (max. 3-4 Wörter)"""
    msg_lower = message.lower().strip()
    
    # === BEENDEN ===
    if any(word in msg_lower for word in ["tschuess", "tschüss", "beenden", "exit", "quit", "ciao"]):
        return "exit", None
    
    # === HILFE ===
    if any(word in msg_lower for word in ["hilfe", "help", "befehle"]):
        return "help", None
    
    # === SPRACHLEHRER AKTIVIEREN ===
    if "aktiviere sprachlehrer" in msg_lower:
        return "sprachlehrer", None
    
    # === BUCH ===
    if "buch" in msg_lower:
        if "psychologie" in msg_lower:
            return "book", "psychologie"
        elif "informatik" in msg_lower:
            return "book", "informatik"
        return "book", "psychologie"
    
    # === WEB-SUCHE ===
    if any(word in msg_lower for word in ["such", "suche", "google", "web"]):
        stopwords = ["such", "suche", "im", "web", "nach", "google", "recherchier"]
        words = [w for w in message.split() if w.lower() not in stopwords]
        if words:
            return "search", " ".join(words)
        return "search", None
    
    # === ZUFALLSTHEMA ===
    if any(word in msg_lower for word in ["zufall", "zufällig", "zufaellig", "random", "thema", "themen"]):
        kategorien = ["informatik", "physik", "chemie", "biologie", "psychologie"]
        for kat in kategorien:
            if kat in msg_lower:
                return "random", kat
        return "random", "physik"
    
    # === WIKIPEDIA ===
    if any(word in msg_lower for word in ["wiki", "wikipedia", "info", "über", "ueber", "erzähl", "erzaehl"]):
        stopwords = ["wiki", "wikipedia", "info", "über", "ueber", "erzähl", "erzaehl", "mir", "was", "ist", "wer", "war"]
        words = [w for w in message.split() if w.lower() not in stopwords]
        if words:
            return "wiki", " ".join(words)
        return "wiki", None
    
    # === FALLBACK: Wenn nur ein Wort → Wiki ===
    if len(message.split()) == 1:
        return "wiki", message
    
    return "unknown", None

def run_lernbot():
    print("🎓 Lern-Bot wird gestartet...")
    print("-" * 60)
    print("💬 Schreib 'hilfe' für alle Befehle.")
    print("-" * 60)
    
    config = load_config()
    
    # APIs initialisieren
    wikipedia = WikipediaAPI(config.get("sprache", "de"))
    library = OpenLibraryAPI()
    ddg = DuckDuckGoAPI()
    
    while True:
        try:
            message = input("\nDu: ").strip()
            
            if not message:
                continue
            
            intent, arg = detect_intent(message)
            handled = True
            
            # === EXIT ===
            if intent == "exit":
                print("🎓 Lern-Bot: Bis bald! 👋")
                break
            
            # === HILFE ===
            elif intent == "help":
                show_help()
            
            # === WIKI ===
            elif intent == "wiki":
                if not arg:
                    print("🎓 Lern-Bot: Was möchtest du wissen?")
                    handled = False
                else:
                    print(f"🎓 Lern-Bot: Ich schaue in Wikipedia nach '{arg}'...")
                    data = wikipedia.get_summary(arg)
                    print(wikipedia.format(data))
            
            # === ZUFALL ===
            elif intent == "random":
                print(f"🎓 Lern-Bot: Ich suche ein zufälliges Thema aus '{arg}'...")
                data = wikipedia.get_random_topic(arg)
                print(wikipedia.format(data))
            
            # === BUCH ===
            elif intent == "book":
                print(f"🎓 Lern-Bot: Ich suche Bücher zu '{arg}'...")
                books = library.search_books(arg)
                print(library.format(books, arg))
            
            # === SUCH ===
            elif intent == "search":
                if not arg:
                    print("🎓 Lern-Bot: Was soll ich suchen?")
                    handled = False
                else:
                    print(f"🎓 Lern-Bot: Ich suche im Web nach '{arg}'...")
                    results = ddg.search(arg)
                    print(ddg.format(results, arg))
            
            # === SPRACHLEHRER AKTIVIEREN ===
            elif intent == "sprachlehrer":
                print("🎓 Lern-Bot: Starte Sprachlehrer...\n")
                
                bat_pfad = os.path.join(
                    os.path.dirname(os.path.abspath(__file__)),
                    "sprachlehrer",
                    "start_sprachlehrer.bat"
                )
                
                if os.path.exists(bat_pfad):
                    try:
                        os.startfile(bat_pfad)
                        print("✅ Sprachlehrer gestartet (neues Fenster)")
                        print("   💡 Schließe das Fenster, um zurückzukehren.")
                    except Exception as e:
                        print(f"❌ Fehler beim Starten: {e}")
                else:
                    print(f"❌ Sprachlehrer nicht gefunden: {bat_pfad}")
                
                handled = False
            
            # === UNBEKANNT ===
            else:
                print("🎓 Lern-Bot: Das habe ich nicht verstanden. 🤔")
                print("   Schreib 'hilfe', um zu sehen, was ich kann.")
                handled = False
            
            # === NACH JEDER AUSGABE ===
            if handled and intent not in ["help", "exit"]:
                print("\n🎓 Lern-Bot: Viel Spaß beim Lernen :)")
                print("🎓 Lern-Bot: Kann ich noch was vorschlagen?")
        
        except KeyboardInterrupt:
            print("\n\n🎓 Lern-Bot: Bis bald! 👋")
            break
        except Exception as e:
            print(f"🎓 Lern-Bot: Ups, ein Fehler ist aufgetreten: {e}")

def main():
    if not os.path.exists("config.json"):
        print("❌ config.json nicht gefunden!")
        sys.exit(1)
    
    run_lernbot()

if __name__ == "__main__":
    main()