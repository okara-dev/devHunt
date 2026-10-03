#!/usr/bin/env python3
"""
Rezept-Bot aus Kühlschrank-Foto
- Foto → MobileNetV2 erkennt Zutaten
- Ollama schlägt Rezepte vor
"""

import json
import sys
import os
from datetime import datetime

from core import OllamaClient, MobileNetClassifier, OCRReader


def load_config():
    with open("config.json", "r", encoding="utf-8") as f:
        return json.load(f)


def show_help():
    print("""
╔══════════════════════════════════════════════════════════════╗
║                    🍳 REZEPT-BOT                             ║
╚══════════════════════════════════════════════════════════════╝

Der Bot erkennt Zutaten aus einem Foto und schlägt Rezepte vor.

BEFEHLE:

  📸 FOTO ANALYSIEREN
     "foto <pfad>"             → Bild analysieren

  🍳 REZEPT VORSCHLAGEN
     "rezept <zutaten>"        → Rezept aus Zutaten (Text)
     "rezept"                  → Rezept aus letzten Foto

  📋 INFO
     "hilfe"                   → Diese Hilfe
     "exit"                    → Beenden

BEISPIEL:
  foto C:/Users/.../kuehlschrank.jpg
  rezept Tomaten, Käse, Brot

╚══════════════════════════════════════════════════════════════╝
""")


def generate_recipe(ollama, zutaten):
    """Lässt Ollama ein Rezept vorschlagen"""
    system = (
        "Du bist ein kreativer Koch. Schlage einfache, leckere Rezepte vor. "
        "Antworte auf Deutsch."
    )
    
    prompt = f"""Ich habe folgende Zutaten:
{zutaten}

Schlage mir 2-3 einfache Rezepte vor, die ich damit kochen kann.

Für jedes Rezept:
- Name
- Zutaten (mit Mengen)
- Kurze Anleitung (3-5 Schritte)
- Zubereitungszeit

Antworte übersichtlich."""
    
    return ollama.generate(prompt, system=system, temperature=0.8)


def analyze_image(image_path, mobilenet, ocr):
    """Analysiert ein Bild und erkennt Zutaten"""
    print(f"\n📸 Analysiere: {os.path.basename(image_path)}")
    
    if not os.path.exists(image_path):
        print(f"❌ Datei nicht gefunden: {image_path}")
        return []
    
    # MobileNet-Klassifizierung
    print("🧠 MobileNetV2 analysiert Bild...")
    predictions = mobilenet.predict(image_path, top_k=10)
    
    if not predictions:
        print("   ⚠️ Keine Objekte erkannt.")
        return []
    
    print(f"   ✅ {len(predictions)} Objekte erkannt:")
    for p in predictions:
        bar = "█" * int(p["confidence"] * 20)
        print(f"   {p['label']:<30} {p['confidence']*100:5.1f}% {bar}")
    
    # OCR zusätzlich (für Text auf Verpackungen)
    print("\n📝 Lese Text auf Verpackungen (OCR)...")
    ocr_text = ocr.extract_full_text(image_path)
    if ocr_text:
        print(f"   ✅ Text gefunden:\n{ocr_text[:200]}...")
    else:
        print("   Kein Text gefunden.")
    
    return predictions


def get_zutaten_from_predictions(predictions, min_confidence=0.3):
    """Filtert Zutaten aus Vorhersagen"""
    zutaten = []
    for p in predictions:
        if p["confidence"] >= min_confidence:
            zutaten.append(p["label"])
    return zutaten


def run_rezept_bot():
    print("🍳 Rezept-Bot wird gestartet...")
    print(f"📅 {datetime.now().strftime('%A, %d. %B %Y')}")
    print("-" * 60)
    
    config = load_config()
    
    # Ollama initialisieren
    ollama_cfg = config.get("ollama", {})
    ollama = OllamaClient(
        model=ollama_cfg.get("model", "llama3.2:3b"),
        host=ollama_cfg.get("host", "http://localhost:11434")
    )
    
    # Verbindung prüfen
    print("🔌 Prüfe Ollama-Verbindung...")
    if not ollama.check_connection():
        print("❌ Ollama ist nicht erreichbar!")
        print("   Starte Ollama und versuche es erneut.")
        sys.exit(1)
    print(f"   ✅ Ollama verbunden ({ollama.model})")
    
    # MobileNet initialisieren
    mobilenet_cfg = config.get("mobilenet", {})
    try:
        mobilenet = MobileNetClassifier(
            model_path=mobilenet_cfg.get("model_path"),
            labels_path=mobilenet_cfg.get("labels_path")
        )
    except FileNotFoundError as e:
        print(f"❌ {e}")
        sys.exit(1)
    
    # OCR initialisieren
    print("📥 Lade OCR-Modelle...")
    ocr = OCRReader(config)
    print("   ✅ OCR bereit")
    
    # Letztes Bild
    letztes_bild = None
    letzte_zutaten = []
    
    print()
    show_help()
    
    while True:
        try:
            message = input("\n> ").strip()
            
            if not message:
                continue
            
            msg_lower = message.lower()
            
            # === BEENDEN ===
            if msg_lower in ["exit", "quit", "beenden"]:
                print("👋 Bis bald!")
                break
            
            # === HILFE ===
            elif msg_lower in ["hilfe", "help"]:
                show_help()
            
            # === FOTO ANALYSIEREN ===
            elif msg_lower.startswith("foto "):
                image_path = message[5:].strip().strip('"')
                predictions = analyze_image(image_path, mobilenet, ocr)
                
                if predictions:
                    letztes_bild = image_path
                    letzte_zutaten = get_zutaten_from_predictions(
                        predictions,
                        config.get("min_confidence", 0.3)
                    )
                    print(f"\n🥕 Erkannte Zutaten: {', '.join(letzte_zutaten)}")
                    print("\n💡 Tipp: 'rezept' für Vorschläge")
            
            # === REZEPT ===
            elif msg_lower.startswith("rezept"):
                # Zutaten aus Nachricht oder letztem Foto
                teile = message.split(maxsplit=1)
                
                if len(teile) > 1:
                    zutaten = teile[1].strip()
                elif letzte_zutaten:
                    zutaten = ", ".join(letzte_zutaten)
                    print(f"💡 Nutze Zutaten vom letzten Foto: {zutaten}")
                else:
                    print("❌ Keine Zutaten. Nutze: 'rezept <zutaten>'")
                    continue
                
                print(f"\n🍳 Ollama denkt nach...")
                rezept = generate_recipe(ollama, zutaten)
                
                if rezept:
                    print("\n" + "=" * 60)
                    print(rezept)
                    print("=" * 60)
                else:
                    print("❌ Ollama konnte kein Rezept generieren.")
            
            # === UNBEKANNT ===
            else:
                print("❓ Unbekannter Befehl. Schreib 'hilfe'.")
        
        except KeyboardInterrupt:
            print("\n\n👋 Bis bald!")
            break
        except Exception as e:
            print(f"❌ Fehler: {e}")


if __name__ == "__main__":
    run_rezept_bot()