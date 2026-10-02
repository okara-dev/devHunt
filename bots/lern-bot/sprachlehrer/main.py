#!/usr/bin/env python3
"""
Vokabel-Trainer (Spanisch)
Schickt dir jeden Tag 20 neue Vokabeln + Grammatik + Basis-Vokabeln
"""

import json
import sys
import os
import random
from datetime import datetime

from llm_client import LLMClient
from apis import EmailSender

def load_config():
    with open("config.json", "r", encoding="utf-8") as f:
        return json.load(f)

def load_json(filename):
    with open(filename, "r", encoding="utf-8") as f:
        return json.load(f)

def generate_vokabeln(llm, sprache, level, bekannte_vokabeln):
    """Lässt die KI 20 neue Vokabeln generieren"""
    
    system_prompt = (
        f"Du bist ein {sprache}-Lehrer für das Niveau {level}. "
        "Du erstellst hochwertige Vokabellisten mit praxisnahen Beispielsätzen. "
        "Antworte auf Deutsch und Spanisch."
    )
    
    bekannte_liste = ", ".join(bekannte_vokabeln[:30])  # Erste 30 als Beispiel
    
    user_prompt = f"""Erstelle 20 neue {sprache}-Vokabeln für Niveau {level}.

WICHTIG:
- Nimm NICHT diese bereits bekannten Vokabeln: {bekannte_liste}
- Wähle alltagsrelevante, nützliche Vokabeln
- Jede Vokabel braucht: spanisches Wort, deutsche Übersetzung, einen kurzen Beispielsatz

Antworte EXAKT in diesem Format (eine Vokabel pro Zeile):

VOKABEL: [spanisch] | [deutsch] | [Beispielsatz auf Spanisch]

Beispiel:
VOKABEL: la experiencia | die Erfahrung | Tengo mucha experiencia en esto.

Generiere jetzt 20 Vokabeln. Nur die VOKABEL-Zeilen, keine Nummerierung, keine Erklärungen."""
    
    response = llm.generate(system_prompt, user_prompt, max_tokens=1500, temperature=0.8)
    
    if not response:
        return []
    
    vokabeln = []
    for line in response.split("\n"):
        line = line.strip()
        if line.startswith("VOKABEL:"):
            line = line.replace("VOKABEL:", "").strip()
            parts = [p.strip() for p in line.split("|")]
            if len(parts) >= 2:
                vokabeln.append({
                    "es": parts[0],
                    "de": parts[1],
                    "beispiel": parts[2] if len(parts) > 2 else ""
                })
    
    return vokabeln[:20]

def generate_grammatik_thema(llm, sprache, level, bekannte_themen):
    """Lässt die KI ein Grammatikthema vertiefen"""
    
    system_prompt = (
        f"Du bist ein {sprache}-Lehrer für Niveau {level}. "
        "Du erklärst Grammatik klar und verständlich auf Deutsch."
    )
    
    themen_liste = ", ".join(bekannte_themen)
    
    user_prompt = f"""Wähle EIN Grammatikthema für eine tägliche Lektion ({sprache}, Niveau {level}).

Mögliche Themen (wähle eines, das wiederholbar ist):
{themen_liste}

Oder ein anderes wichtiges Thema für {level}.

Antworte EXAKT in diesem Format:

THEMA: [Name des Themas]
ERKLAERUNG: [2-3 Sätze auf Deutsch]
BEISPIEL: [Ein spanischer Beispielsatz mit deutscher Übersetzung]
FEHLER: [Ein typischer Fehler, den Lernende machen]

Nur diese 4 Zeilen, keine weiteren Erklärungen."""
    
    response = llm.generate(system_prompt, user_prompt, max_tokens=400, temperature=0.7)
    
    if not response:
        return None
    
    thema = {"thema": "Grammatik", "erklaerung": "", "beispiel": "", "typische_fehler": ""}
    
    for line in response.split("\n"):
        line = line.strip()
        if line.startswith("THEMA:"):
            thema["thema"] = line.replace("THEMA:", "").strip()
        elif line.startswith("ERKLAERUNG:"):
            thema["erklaerung"] = line.replace("ERKLAERUNG:", "").strip()
        elif line.startswith("BEISPIEL:"):
            thema["beispiel"] = line.replace("BEISPIEL:", "").strip()
        elif line.startswith("FEHLER:"):
            thema["typische_fehler"] = line.replace("FEHLER:", "").strip()
    
    return thema

def run_vokabel_trainer():
    print("🇪🇸 Vokabel-Trainer wird gestartet...")
    print(f"📅 {datetime.now().strftime('%A, %d. %B %Y')}")
    print("-" * 60)
    
    config = load_config()
    sprache = config.get("sprache", "Spanisch")
    level = config.get("level", "A1-A2")
    
    # LLM initialisieren
    llm = LLMClient(config["groq_api_key"])
    
    # E-Mail initialisieren
    email = EmailSender(config["email"])
    
    # Lokale Daten laden
    print("📂 Lade lokale Daten...")
    grammatik_data = load_json("grammatik.json")
    basis_data = load_json("basis_vokabeln.json")
    
    # Grammatik für die Anzeige (alle Themen aus lokal)
    alle_grammatik = grammatik_data.get(sprache, {}).get(level, [])
    
    # Basis-Vokabeln für die Anzeige
    basis_vokabeln = basis_data.get(sprache, {}).get(level, {})
    
    # Bekannte Vokabeln sammeln (aus basis_vokabeln, damit KI sie nicht wiederholt)
    bekannte = []
    for kategorie, wörter in basis_vokabeln.items():
        for w in wörter:
            bekannte.append(w.get("es", ""))
    
    # KI-Vokabeln generieren
    print(f"🧠 Generiere 20 neue {sprache}-Vokabeln...")
    neue_vokabeln = generate_vokabeln(llm, sprache, level, bekannte)
    
    if not neue_vokabeln:
        print("❌ Keine Vokabeln generiert!")
        sys.exit(1)
    
    print(f"   ✅ {len(neue_vokabeln)} Vokabeln generiert")
    
    # KI-Grammatikthema generieren
    print(f"📖 Generiere Grammatikthema...")
    themen_namen = [g.get("thema", "") for g in alle_grammatik]
    neues_thema = generate_grammatik_thema(llm, sprache, level, themen_namen)
    
    if neues_thema:
        print(f"   ✅ Thema: {neues_thema['thema']}")
        # KI-Thema zu den lokalen Grammatik-Themen hinzufügen
        grammatik_anzeige = [neues_thema] + alle_grammatik[:2]  # KI-Thema + 2 lokale
    else:
        grammatik_anzeige = alle_grammatik[:3]
    
    # E-Mail senden
    print("\n📧 Sende E-Mail...")
    success = email.send_vokabeln(
        neue_vokabeln,
        grammatik_anzeige,
        basis_vokabeln,
        sprache,
        level
    )
    
    if success:
        print("✅ Vokabeln erfolgreich gesendet!")
    else:
        print("❌ Fehler beim Senden!")
        # Fallback: In Konsole ausgeben
        print("\n" + "=" * 60)
        print("📚 DEINE VOKABELN (Konsole):")
        print("=" * 60)
        for i, v in enumerate(neue_vokabeln, 1):
            print(f"{i}. {v['es']} – {v['de']}")
            if v['beispiel']:
                print(f"   → {v['beispiel']}")

def main():
    if not os.path.exists("config.json"):
        print("❌ config.json nicht gefunden!")
        sys.exit(1)
    
    if not os.path.exists("grammatik.json"):
        print("❌ grammatik.json nicht gefunden!")
        sys.exit(1)
    
    if not os.path.exists("basis_vokabeln.json"):
        print("❌ basis_vokabeln.json nicht gefunden!")
        sys.exit(1)
    
    run_vokabel_trainer()
    
    if "--no-pause" not in sys.argv:
        input("\nDrücke Enter zum Beenden...")

if __name__ == "__main__":
    main()