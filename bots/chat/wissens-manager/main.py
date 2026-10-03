#!/usr/bin/env python3
"""
Wissens-Manager
- Durchsucht Dokumente (semantisch + Volltext)
- Verarbeitet PDF, Bilder, Office
"""

import json
import sys
import os
from datetime import datetime

from apis import PDFReader, OfficeReader, RapidOCRAPI, MiniLMAPI, WissensDB


def load_config():
    with open("config.json", "r", encoding="utf-8") as f:
        return json.load(f)


def show_help():
    print("""
╔══════════════════════════════════════════════════════════════╗
║                    🧠 WISSENS-MANAGER                        ║
╚══════════════════════════════════════════════════════════════╝

DOKUMENTE HINZUFÜGEN
   Leg deine Dateien in den Ordner: wissen/
   Der Bot liest sie beim nächsten Scan.

BEFEHLE:

  📥 SCAN
     "scan"                    → Scannt den wissen/-Ordner

  🔍 SUCHE
     "suche <begriff>"         → Volltext-Suche
     "finde <frage>"           → Semantische Suche

  📋 INFO
     "liste"                   → Alle Dokumente
     "stats"                   → Statistiken
     "delete <id>"             → Dokument löschen

  ❓ HILFE
     "hilfe"

  👋 BEENDEN
     "exit"

╚══════════════════════════════════════════════════════════════╝
""")


def detect_intent(message):
    msg_lower = message.lower().strip()
    
    if any(w in msg_lower for w in ["exit", "quit", "beenden", "tschüss"]):
        return "exit", None
    
    if any(w in msg_lower for w in ["hilfe", "help", "befehle"]):
        return "help", None
    
    if msg_lower == "scan":
        return "scan", None
    
    if msg_lower == "stats":
        return "stats", None
    
    if msg_lower == "liste":
        return "list", None
    
    if msg_lower.startswith("suche "):
        return "search_fulltext", message[6:].strip()
    
    if msg_lower.startswith("finde "):
        return "search_semantic", message[6:].strip()
    
    if msg_lower.startswith("delete "):
        return "delete", message[7:].strip()
    
    return "unknown", None


def chunk_text(text, size=500, overlap=50):
    """Zerlegt Text in Chunks"""
    if not text:
        return []
    
    words = text.split()
    chunks = []
    current = []
    current_len = 0
    
    for word in words:
        current.append(word)
        current_len += len(word) + 1
        
        if current_len >= size:
            chunks.append(" ".join(current))
            # Overlap: letzte 10% behalten
            overlap_words = int(len(current) * 0.1)
            current = current[-overlap_words:] if overlap_words > 0 else []
            current_len = sum(len(w) + 1 for w in current)
    
    if current:
        chunks.append(" ".join(current))
    
    return chunks


def extract_file(path, readers):
    """Erkennt Dateityp und extrahiert Text"""
    ext = os.path.splitext(path)[1].lower()
    
    if ext == ".pdf":
        return readers["pdf"].extract_text(path), "pdf"
    
    elif ext in [".png", ".jpg", ".jpeg", ".bmp", ".gif"]:
        return readers["ocr"].extract_full_text(path), "image"
    
    elif ext in [".txt", ".md", ".docx", ".xlsx"]:
        return readers["office"].extract_text(path), "office"
    
    return None, None


def scan_folder(ordner, readers, db, minilm):
    """Scannt den wissen/-Ordner"""
    if not os.path.exists(ordner):
        os.makedirs(ordner)
        print(f"📁 Ordner '{ordner}' erstellt – lege deine Dateien rein.")
        return
    
    files = []
    for root, _, filenames in os.walk(ordner):
        for fname in filenames:
            files.append(os.path.join(root, fname))
    
    if not files:
        print(f"📭 Keine Dateien in '{ordner}' gefunden.")
        return
    
    print(f"📥 {len(files)} Datei(en) gefunden\n")
    
    neue = 0
    for i, path in enumerate(files, 1):
        dateiname = os.path.basename(path)
        print(f"[{i}/{len(files)}] {dateiname}")
        
        # Text extrahieren
        text, typ = extract_file(path, readers)
        
        if not text:
            print(f"   ⚠️ Konnte nicht gelesen werden\n")
            continue
        
        print(f"   ✅ {len(text)} Zeichen extrahiert")
        
        # Dokument in DB
        doc_id = db.add_document(path, dateiname, typ)
        
        # Chunking
        chunks = chunk_text(text, 500, 50)
        print(f"   📦 {len(chunks)} Chunks")
        
        # Embeddings + Speichern
        for j, chunk in enumerate(chunks):
            emb = minilm.get_embedding(chunk)
            db.add_chunk(doc_id, j, chunk, emb)
        
        neue += 1
        print()
    
    print(f"✅ {neue} Dokument(e) hinzugefügt")


def search_semantic(query, db, minilm):
    """Semantische Suche"""
    print(f"🔍 Semantische Suche nach '{query}'...\n")
    
    query_emb = minilm.get_embedding(query)
    if query_emb is None:
        print("❌ Embedding fehlgeschlagen.")
        return
    
    chunks = db.get_all_chunks()
    if not chunks:
        print("📭 Keine Dokumente in der Datenbank.")
        print("   Führe zuerst 'scan' aus.")
        return
    
    results = db.search_semantic(query_emb, chunks, top_k=5)
    
    if not results:
        print("❌ Keine Treffer.")
        return
    
    print(f"📖 Top {len(results)} Treffer:\n")
    for i, (chunk, score) in enumerate(results, 1):
        print(f"{i}. [{chunk['dateiname']}] (Ähnlichkeit: {score*100:.0f}%)")
        print(f"   {chunk['text'][:300]}...")
        print()


def search_fulltext(query, db):
    """Volltext-Suche"""
    print(f"🔍 Volltext-Suche nach '{query}'...\n")
    
    results = db.search_fulltext(query, top_k=5)
    
    if not results:
        print("❌ Keine Treffer.")
        return
    
    print(f"📖 {len(results)} Treffer:\n")
    for i, r in enumerate(results, 1):
        print(f"{i}. [{r['dateiname']}]")
        print(f"   {r['text'][:300]}...")
        print()


def show_stats(db):
    stats = db.get_stats()
    print(f"""
📊 STATISTIK
========================================
📄 Dokumente: {stats['dokumente']}
📦 Chunks:    {stats['chunks']}
========================================
""")


def show_list(db):
    docs = db.list_documents()
    if not docs:
        print("📭 Keine Dokumente.")
        return
    
    print(f"\n📚 {len(docs)} Dokument(e):\n")
    print(f"{'ID':<5} {'Typ':<8} {'Datum':<12} Dateiname")
    print("-" * 60)
    for doc_id, dateiname, typ, datum in docs:
        d = datum[:10] if datum else "?"
        print(f"{doc_id:<5} {typ:<8} {d:<12} {dateiname}")
    print()


def main():
    if not os.path.exists("config.json"):
        print("❌ config.json nicht gefunden!")
        sys.exit(1)
    
    print("🧠 Wissens-Manager wird gestartet...")
    print(f"📅 {datetime.now().strftime('%A, %d. %B %Y')}")
    print("-" * 60)
    
    config = load_config()
    
    # APIs initialisieren
    print("\n📥 Lade Modelle...")
    ocr = RapidOCRAPI(config)
    minilm = MiniLMAPI(config)
    print()
    
    # Reader
    readers = {
        "pdf": PDFReader(ocr),
        "ocr": ocr,
        "office": OfficeReader()
    }
    
    # DB
    db = WissensDB(config.get("db_path", "wissen.db"))
    ordner = config.get("wissen_ordner", "wissen")
    
    print("💬 Schreib 'hilfe' für alle Befehle.\n")
    
    while True:
        try:
            message = input("> ").strip()
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
            
            # === SCAN ===
            elif intent == "scan":
                scan_folder(ordner, readers, db, minilm)
            
            # === STATS ===
            elif intent == "stats":
                show_stats(db)
            
            # === LISTE ===
            elif intent == "list":
                show_list(db)
            
            # === SUCHE (semantisch) ===
            elif intent == "search_semantic":
                if not arg:
                    print("❌ Nutzung: finde <frage>")
                    handled = False
                else:
                    search_semantic(arg, db, minilm)
            
            # === SUCHE (Volltext) ===
            elif intent == "search_fulltext":
                if not arg:
                    print("❌ Nutzung: suche <begriff>")
                    handled = False
                else:
                    search_fulltext(arg, db)
            
            # === DELETE ===
            elif intent == "delete":
                if not arg:
                    print("❌ Nutzung: delete <id>")
                    handled = False
                else:
                    try:
                        db.delete_document(int(arg))
                        print(f"✅ Dokument {arg} gelöscht.")
                    except ValueError:
                        print("❌ ID muss eine Zahl sein.")
                        handled = False
            
            # === UNBEKANNT ===
            else:
                print("❓ Unbekannter Befehl. Schreib 'hilfe'.")
                handled = False
        
        except KeyboardInterrupt:
            print("\n\n👋 Bis bald!")
            break
        except Exception as e:
            print(f"❌ Fehler: {e}")


if __name__ == "__main__":
    main()