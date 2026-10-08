from datetime import datetime
from pathlib import Path


NOTES_FILE = Path(__file__).resolve().parent.parent / "data" / "notes.txt"
NOTES_FILE.parent.mkdir(exist_ok=True)


def add_note(text: str) -> str:
    if not text.strip():
        return "Keine Notiz angegeben, Sir."
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    with open(NOTES_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{timestamp}] {text}\n")
    return f"Notiz gespeichert, Sir: '{text}'"


def list_notes() -> str:
    if not NOTES_FILE.exists():
        return "Sie haben noch keine Notizen, Sir."
    lines = NOTES_FILE.read_text(encoding="utf-8").strip().splitlines()
    if not lines:
        return "Sie haben noch keine Notizen, Sir."
    last = lines[-10:]
    return f"Ihre letzten {len(last)} Notizen:\n" + "\n".join(last)