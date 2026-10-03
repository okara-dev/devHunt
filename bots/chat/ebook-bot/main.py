#!/usr/bin/env python3
"""
E-Book-Bot
- KI schreibt ein ganzes Buch
- Automatisch: HTML + Audio-Version (WAV)
"""

import json
import sys
import os
import tempfile
import shutil
from datetime import datetime

from llm_client import LLMClient
from apis import EmailSender, EbookBuilder, VoxTTS

PSYCHOLOGIE_THEMEN = [
    "Kognitive Dissonanz", "Narzissmus", "Trauma und Heilung",
    "Bindungsstile", "Burnout", "Depression",
    "Angststörungen", "Emotionale Intelligenz", "Gaslighting",
    "Selbstwertgefühl", "Impulskontrolle", "Einsamkeit",
]

def load_config():
    with open("config.json", "r", encoding="utf-8") as f:
        return json.load(f)

def show_help():
    print("""
╔══════════════════════════════════════════════════════════════╗
║                      E-BOOK-BOT                              ║
╚══════════════════════════════════════════════════════════════╝
Der Bot schreibt ein ganzes Buch zu einem Thema.
Du bekommst automatisch:
  - HTML-Version (zum Lesen im Browser)
  - MP3-Version  (zum Hören)
╚══════════════════════════════════════════════════════════════╝
""")

def generate_kapitel_geruest(llm, thema, anzahl):
    system_prompt = "Du bist ein erfahrener Romanautor und Psychologie-Experte."
    user_prompt = f"""Plane einen psychologischen Roman zum Thema "{thema}".
Erstelle ein Gerüst mit {anzahl} Kapiteln.

Antworte EXAKT:

KAPITEL 1: [Titel]
KAPITEL 2: [Titel]
...

Nur die KAPITEL-Zeilen."""
    
    response = llm.generate(system_prompt, user_prompt, max_tokens=500, temperature=0.8)
    if not response:
        return []
    
    kapitel = []
    for line in response.split("\n"):
        line = line.strip()
        if line.upper().startswith("KAPITEL"):
            parts = line.split(":", 1)
            if len(parts) == 2:
                kapitel.append(parts[1].strip())
    return kapitel[:anzahl]

def generate_kapitel_text(llm, thema, kapitel_titel, nr, gesamt, handlung, woerter):
    system_prompt = "Du bist ein begabter deutschsprachiger Romanautor."
    user_prompt = f"""Schreibe Kapitel {nr} von {gesamt} eines psychologischen Romans.

Thema: {thema}
Kapitel-Titel: {kapitel_titel}

Bisherige Handlung:
{handlung if handlung else 'Erstes Kapitel.'}

Anforderungen:
- Ca. {woerter} Wörter
- Fesselnd, atmosphärisch
- Behandelt "{thema}" subtil
- Endet mit Cliffhanger

Nur den Kapiteltext, keine Überschrift."""
    return llm.generate(system_prompt, user_prompt, max_tokens=1200, temperature=0.85)

def generate_buch_titel(llm, thema, kapitel_titel):
    system_prompt = "Du bist ein kreativer Lektor und Titel-Experte."
    kapitel_str = "\n".join([f"- {t}" for t in kapitel_titel])
    user_prompt = f"""Finde einen fesselnden Buchtitel für einen psychologischen Roman.

Thema: {thema}

Kapitel:
{kapitel_str}

Der Titel soll poetisch, einprägsam und 2-5 Wörter lang sein.
Antworte NUR mit dem Titel."""
    
    titel = llm.generate(system_prompt, user_prompt, max_tokens=50, temperature=0.9)
    if titel:
        return titel.strip().strip('"').strip("'").strip("*")
    return f"Die unsichtbaren Fäden des {thema}"

def create_ebook():
    print("📖 E-Book-Bot 2.0 wird gestartet...")
    print(f"📅 {datetime.now().strftime('%A, %d. %B %Y')}")
    print("-" * 60)
    
    config = load_config()
    settings = config["settings"]
    
    llm = LLMClient(config["groq_api_key"])
    email = EmailSender(config["email"])
    builder = EbookBuilder()
    
    show_help()
    
    # Thema abfragen
    print("\n📚 Welches Psychologie-Thema soll das Buch behandeln?")
    print(f"   Vorschläge: {', '.join(PSYCHOLOGIE_THEMEN[:6])}")
    thema = input("\n> ").strip()
    
    if not thema:
        print("❌ Kein Thema eingegeben.")
        return
    
    kapitel_anzahl = settings.get("kapitel_anzahl", 6)
    woerter = settings.get("woerter_pro_kapitel", 500)
    
    print(f"\n🎯 Thema: {thema}")
    print(f"📖 Kapitel: {kapitel_anzahl} | Wörter: ~{woerter}/Kapitel")
    
    confirm = input("\n▶️  Buch generieren? (j/n): ").strip().lower()
    if confirm != "j":
        print("❌ Abgebrochen.")
        return
    
    print(f"\n{'='*60}")
    print(f"🚀 Generiere E-Book...")
    print(f"{'='*60}")
    
    # 1. Kapitel-Planung
    print(f"\n📋 Plane Kapitel...")
    kapitel_titel = generate_kapitel_geruest(llm, thema, kapitel_anzahl)
    if not kapitel_titel:
        print("❌ Kapitel-Gerüst fehlgeschlagen.")
        return
    print(f"   ✅ {len(kapitel_titel)} Kapitel geplant")
    
    # 2. Buchtitel
    print(f"\n📖 Generiere Buchtitel...")
    buch_titel = generate_buch_titel(llm, thema, kapitel_titel)
    print(f"   ✅ \"{buch_titel}\"")
    
    # 3. Kapitel schreiben
    print(f"\n✍️  Schreibe Kapitel...")
    kapitel_liste = []
    handlung = ""
    
    for i, titel in enumerate(kapitel_titel, 1):
        print(f"   📝 Kapitel {i}/{len(kapitel_titel)}: {titel[:50]}...")
        text = generate_kapitel_text(llm, thema, titel, i, len(kapitel_titel), handlung, woerter)
        if not text:
            print(f"      ⚠️ Übersprungen")
            continue
        kapitel_liste.append({"titel": titel, "text": text})
        handlung += f"\nKapitel {i}: {text[:300]}..."
    
    if not kapitel_liste:
        print("❌ Keine Kapitel geschrieben.")
        return
    
    total_woerter = sum(len(k["text"].split()) for k in kapitel_liste)
    print(f"   ✅ {len(kapitel_liste)} Kapitel, ~{total_woerter} Wörter")
    
    # 4. HTML bauen
    print(f"\n📚 Baue HTML...")
    html = builder.build_html(buch_titel, "KI-Autor", thema, kapitel_liste)
    print(f"   ✅ HTML fertig")
    
    # Temporärer Ordner
    temp_dir = tempfile.mkdtemp()
    safe_title = "".join(c for c in buch_titel if c.isalnum() or c in " -_").strip().replace(" ", "_")
    
    html_path = os.path.join(temp_dir, f"{safe_title}.html")
    mp3_path = os.path.join(temp_dir, f"{safe_title}.mp3")
    
    attachments = []
    
    # HTML speichern
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)
    attachments.append(html_path)
    
    # 5. MP3 erstellen 
    print(f"\n🎙️  Erstelle Audio-Version...")
    try:
        vox = VoxTTS(config)
        full_text = vox.build_full_text(buch_titel, thema, kapitel_liste)
        mp3_result = vox.text_to_speech(
            full_text, 
            mp3_path, 
            format="mp3",
            bitrate="128k"
        )
        if mp3_result:
            attachments.append(mp3_result)
    except FileNotFoundError as e:
        print(f"   ❌ Vox nicht verfügbar: {e}")
    except Exception as e:
        print(f"   ❌ Vox-Fehler: {e}")
    
    # 6. E-Mail senden
    print(f"\n📧 Sende E-Mail mit Anhängen...")
    success = email.send_ebook(
        buch_titel, thema,
        len(kapitel_liste), total_woerter,
        attachments
    )
    
    # Zusammenfassung
    print(f"\n{'='*60}")
    print(f"🎉 FERTIG!")
    print(f"{'='*60}")
    print(f"   📖 Titel: {buch_titel}")
    print(f"   📚 Kapitel: {len(kapitel_liste)}")
    print(f"   📝 Wörter: ~{total_woerter}")
    
    if success:
        print(f"\n   📎 Anhänge in der E-Mail:")
        for att in attachments:
            size_mb = os.path.getsize(att) / (1024 * 1024)
            print(f"      • {os.path.basename(att)} ({size_mb:.2f} MB)")
    else:
        print(f"\n   ❌ E-Mail konnte nicht gesendet werden.")
    
    # Cleanup
    try:
        shutil.rmtree(temp_dir)
    except:
        pass

def main():
    if not os.path.exists("config.json"):
        print("❌ config.json nicht gefunden!")
        sys.exit(1)
    
    try:
        create_ebook()
    except KeyboardInterrupt:
        print("\n\n👋 Bis bald!")
    
    if "--no-pause" not in sys.argv:
        input("\nDrücke Enter zum Beenden...")

if __name__ == "__main__":
    main()