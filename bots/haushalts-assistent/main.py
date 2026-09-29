#!/usr/bin/env python3
"""
Haushalts-Assistent
- Snack-Bot Features (Rezepte, Cocktails, Nährwerte, KI-Snack)
- Rechnungs-Scanner (RapidOCR + Groq)
- Vorrats-Tracker (SQLite)
- Ausgaben-Tracker (SQLite)
"""

import json
import sys
import os
from datetime import datetime

from llm_client import LLMClient
from apis import (
    TheMealDBAPI, TheCocktailDBAPI, OpenFoodFactsAPI,
    RapidOCRAPI, VorratDB, AusgabenDB
)

RATING_FILE = "rating.json"

def load_config():
    with open("config.json", "r", encoding="utf-8") as f:
        return json.load(f)

def load_ratings():
    if os.path.exists(RATING_FILE):
        try:
            with open(RATING_FILE, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content:
                    return json.loads(content)
        except:
            pass
    return {"snacks": []}

def save_rating(rating_data):
    with open(RATING_FILE, "w", encoding="utf-8") as f:
        json.dump(rating_data, f, indent=2, ensure_ascii=False)

def show_help():
    print("""
╔══════════════════════════════════════════════════════════════╗
║                  🏠 HAUSHALTS-ASSISTENT                      ║
╚══════════════════════════════════════════════════════════════╝

🍔 REZEPTE & COCKTAILS
   "rezept pizza"
   "zufall rezept"
   "cocktail mojito"
   "zufall cocktail"

🥗 PRODUKTE
   "produkt nutella"

🧾 RECHNUNGEN
   "scan rechnung <pfad>"          → OCR + Analyse
   "ausgaben"                       → Monatsübersicht

📦 VORRAT
   "vorrat"                         → Zeigt Vorrat
   "vorrat add <name>"              → Item hinzufügen
   "vorrat del <id>"                → Item löschen

🧠 KI-SNACK
   "snack haferflocken, banane"     → KI erfindet Snack

📊 STATS
   "stats"

❓ HILFE
   "hilfe"

👋 BEENDEN
   "exit"

╚══════════════════════════════════════════════════════════════╝
""")

def detect_intent(message):
    msg_lower = message.lower().strip()
    
    # === BEENDEN ===
    if any(w in msg_lower for w in ["exit", "quit", "beenden", "tschüss", "tschuess"]):
        return "exit", None
    
    # === HILFE ===
    if any(w in msg_lower for w in ["hilfe", "help", "befehle"]):
        return "help", None
    
    # === STATS ===
    if any(w in msg_lower for w in ["stats", "statistik"]):
        return "stats", None
    
    # === RECHNUNG SCANNEN ===
    if msg_lower.startswith("scan rechnung "):
        return "scan_receipt", message[14:].strip().strip('"')
    
    # === AUSGABEN ===
    if msg_lower == "ausgaben" or msg_lower.startswith("ausgaben "):
        return "ausgaben", None
    
    # === VORRAT ===
    if msg_lower == "vorrat":
        return "vorrat_list", None
    
    if msg_lower.startswith("vorrat add "):
        return "vorrat_add", message[11:].strip()
    
    if msg_lower.startswith("vorrat del "):
        return "vorrat_del", message[11:].strip()
    
    # === REZEPT ===
    if "rezept" in msg_lower or "recipe" in msg_lower:
        if "zufall" in msg_lower or "zufällig" in msg_lower:
            return "random_recipe", None
        stopwords = ["rezept", "recipe", "für", "fuer", "nach", "such", "suche"]
        words = [w for w in message.split() if w.lower() not in stopwords]
        if words:
            return "recipe", " ".join(words)
        return "random_recipe", None
    
    # === COCKTAIL ===
    if "cocktail" in msg_lower:
        if "zufall" in msg_lower or "zufällig" in msg_lower:
            return "random_cocktail", None
        stopwords = ["cocktail", "für", "fuer", "nach", "such", "suche"]
        words = [w for w in message.split() if w.lower() not in stopwords]
        if words:
            return "cocktail", " ".join(words)
        return "random_cocktail", None
    
    # === PRODUKT ===
    if "produkt" in msg_lower or "nährwert" in msg_lower or "naehrwert" in msg_lower:
        stopwords = ["produkt", "nährwert", "naehrwert", "von", "für", "fuer"]
        words = [w for w in message.split() if w.lower() not in stopwords]
        if words:
            return "product", " ".join(words)
        return "product", None
    
    # === SNACK (KI) ===
    if "snack" in msg_lower:
        snack_idx = msg_lower.find("snack")
        zutaten = message[snack_idx + 5:].strip()
        if zutaten:
            return "snack", zutaten
        return "snack", None
    
    if "," in message:
        return "snack", message
    
    return "unknown", None

def generate_snack(llm, ingredients):
    system_prompt = (
        "Du bist ein kreativer Hobby-Koch. Erfinde Mini-Snacks aus einfachen Zutaten. "
        "Antworte auf Deutsch."
    )
    user_prompt = f"""Erfinde einen Snack aus: {ingredients}

Format:
NAME: [Name]
ZUTATEN:
- [Zutat]
ZUBEREITUNG:
1. [Schritt]
GESCHMACK: [Satz]
TIP: [Tipp]"""
    return llm.generate(system_prompt, user_prompt, max_tokens=800, temperature=0.95)

def parse_snack(response):
    if not response:
        return None
    snack = {"name": "Snack", "ingredients": [], "preparation": [], "taste": "", "tip": ""}
    try:
        if "NAME:" in response:
            snack["name"] = response.split("NAME:", 1)[1].split("\n")[0].strip()
        if "ZUTATEN:" in response:
            part = response.split("ZUTATEN:", 1)[1]
            if "ZUBEREITUNG:" in part:
                part = part.split("ZUBEREITUNG:", 1)[0]
            for line in part.strip().split("\n"):
                line = line.strip().lstrip("-•*").strip()
                if line:
                    snack["ingredients"].append(line)
        if "ZUBEREITUNG:" in response:
            part = response.split("ZUBEREITUNG:", 1)[1]
            if "GESCHMACK:" in part:
                part = part.split("GESCHMACK:", 1)[0]
            for line in part.strip().split("\n"):
                line = line.strip()
                if line:
                    if line[0].isdigit():
                        line = line.split(".", 1)[-1].strip()
                    snack["preparation"].append(line)
        if "GESCHMACK:" in response:
            part = response.split("GESCHMACK:", 1)[1]
            if "TIP:" in part:
                part = part.split("TIP:", 1)[0]
            snack["taste"] = part.strip()
        if "TIP:" in response:
            snack["tip"] = response.split("TIP:", 1)[1].strip()
    except:
        pass
    return snack

def display_snack(snack):
    print("\n" + "=" * 60)
    print(f"🍽️  {snack['name'].upper()}")
    print("=" * 60)
    if snack["ingredients"]:
        print("\n📋 ZUTATEN:")
        for ing in snack["ingredients"]:
            print(f"   • {ing}")
    if snack["preparation"]:
        print("\n👨‍🍳 ZUBEREITUNG:")
        for i, step in enumerate(snack["preparation"], 1):
            print(f"   {i}. {step}")
    if snack["taste"]:
        print(f"\n😋 GESCHMACK:\n   {snack['taste']}")
    if snack["tip"]:
        print(f"\n💡 TIPP:\n   {snack['tip']}")
    print("=" * 60)

def get_rating():
    while True:
        try:
            rating = input("\n⭐ Bewerte (1-10, 's' = skip): ").strip()
            if rating.lower() == 's':
                return None
            r = int(rating)
            if 1 <= r <= 10:
                return r
        except:
            pass

def show_statistics(ratings):
    snacks = ratings.get("snacks", [])
    if not snacks:
        print("\n📊 Noch keine Snacks bewertet.")
        return
    print("\n" + "=" * 60)
    print("📊 SNACK-STATISTIK")
    print("=" * 60)
    print(f"\n🍽️  Insgesamt: {len(snacks)} Snacks")
    rated = [s for s in snacks if s.get("rating")]
    if rated:
        avg = sum(s["rating"] for s in rated) / len(rated)
        print(f"⭐ Durchschnitt: {avg:.1f}/10")
    print("=" * 60)

def run_haushalt():
    print("🏠 Haushalts-Assistent wird gestartet...")
    print(f"📅 {datetime.now().strftime('%A, %d. %B %Y')}")
    print("-" * 60)
    
    config = load_config()
    ratings = load_ratings()
    
    # APIs initialisieren
    llm = LLMClient(config["groq_api_key"])
    mealdb = TheMealDBAPI()
    cocktaildb = TheCocktailDBAPI()
    foodfacts = OpenFoodFactsAPI()
    ocr = RapidOCRAPI(config)
    vorrat = VorratDB()
    ausgaben = AusgabenDB()
    
    show_help()
    
    while True:
        try:
            message = input("\n> ").strip()
            if not message:
                continue
            
            intent, arg = detect_intent(message)
            handled = True
            
            # === EXIT ===
            if intent == "exit":
                print("👋 Bis bald!")
                break
            
            # === HILFE ===
            elif intent == "help":
                show_help()
            
            # === STATS ===
            elif intent == "stats":
                show_statistics(ratings)
            
            # === RECHNUNG SCANNEN ===
            elif intent == "scan_receipt":
                if not arg or not os.path.exists(arg):
                    print(f"❌ Datei nicht gefunden: {arg}")
                    handled = False
                else:
                    print(f"🧾 Scanne Rechnung '{arg}'...")
                    text = ocr.extract_full_text(arg)
                    if not text:
                        print("   ⚠️ Kein Text erkannt.")
                    else:
                        print(f"   ✅ Text erkannt ({len(text)} Zeichen)")
                        print("   🧠 Analysiere mit KI...")
                        analysis = ocr.parse_receipt(text, llm)
                        print(f"\n{analysis}")
                        
                        # Nachfragen ob speichern
                        save = input("\n💾 Als Ausgabe speichern? (j/n): ").strip().lower()
                        if save == "j":
                            # Einfache Extraktion (kann verbessert werden)
                            ausgaben.add_ausgabe(
                                datum=datetime.now().strftime("%Y-%m-%d"),
                                geschaeft="Unbekannt",
                                betrag=0.0,
                                kategorie="Sonstiges",
                                artikel=text[:200]
                            )
                            print("   ✅ Gespeichert")
            
            # === AUSGABEN ===
            elif intent == "ausgaben":
                print(ausgaben.format_monat())
            
            # === VORRAT LISTE ===
            elif intent == "vorrat_list":
                items = vorrat.get_all()
                print(vorrat.format(items))
            
            # === VORRAT ADD ===
            elif intent == "vorrat_add":
                if not arg:
                    print("❌ Nutzung: vorrat add <name>")
                    handled = False
                else:
                    item_id = vorrat.add_item(arg)
                    print(f"✅ '{arg}' hinzugefügt (ID: {item_id})")
            
            # === VORRAT DEL ===
            elif intent == "vorrat_del":
                if not arg:
                    print("❌ Nutzung: vorrat del <id>")
                    handled = False
                else:
                    try:
                        item_id = int(arg)
                        vorrat.delete_item(item_id)
                        print(f"✅ Item {item_id} gelöscht")
                    except ValueError:
                        print("❌ ID muss eine Zahl sein.")
                        handled = False
            
            # === REZEPT ===
            elif intent == "recipe":
                print(f"🍔 Suche Rezept '{arg}'...")
                meal = mealdb.search_recipe(arg)
                print(mealdb.format(meal))
            
            # === ZUFALLS-REZEPT ===
            elif intent == "random_recipe":
                print("🎲 Hole zufälliges Rezept...")
                meal = mealdb.get_random_recipe()
                print(mealdb.format(meal))
            
            # === COCKTAIL ===
            elif intent == "cocktail":
                print(f"🍹 Suche Cocktail '{arg}'...")
                drink = cocktaildb.search_cocktail(arg)
                print(cocktaildb.format(drink))
            
            # === ZUFALLS-COCKTAIL ===
            elif intent == "random_cocktail":
                print("🎲 Hole zufälligen Cocktail...")
                drink = cocktaildb.get_random_cocktail()
                print(cocktaildb.format(drink))
            
            # === PRODUKT ===
            elif intent == "product":
                if not arg:
                    print("❌ Welches Produkt?")
                    handled = False
                else:
                    print(f"🥗 Suche Produkt '{arg}'...")
                    product = foodfacts.search_product(arg)
                    print(foodfacts.format(product))
            
            # === SNACK (KI) ===
            elif intent == "snack":
                if not arg:
                    print("❌ Welche Zutaten?")
                    handled = False
                else:
                    print("🧠 KI denkt nach...")
                    response = generate_snack(llm, arg)
                    if response:
                        snack = parse_snack(response)
                        display_snack(snack)
                        
                        rating = get_rating()
                        ratings["snacks"].append({
                            "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
                            "name": snack["name"],
                            "ingredients_input": arg,
                            "rating": rating
                        })
                        save_rating(ratings)
                        print(f"\n✅ Gespeichert" + (f" mit {rating}/10" if rating else ""))
                    else:
                        print("❌ KI-Fehler")
                        handled = False
            
            # === UNBEKANNT ===
            else:
                print("❓ Unbekannter Befehl. Schreib 'hilfe'.")
                handled = False
            
            # === NACH JEDER AUSGABE ===
            if handled and intent not in ["help", "exit"]:
                print("\n🏠 Kann ich noch was für dich tun?")
        
        except KeyboardInterrupt:
            print("\n\n👋 Bis bald!")
            break
        except Exception as e:
            print(f"❌ Fehler: {e}")

def main():
    if not os.path.exists("config.json"):
        print("❌ config.json nicht gefunden!")
        sys.exit(1)
    
    run_haushalt()

if __name__ == "__main__":
    main()