from pathlib import Path


def read_file(path: str, max_chars: int = 2000) -> str:
    p = Path(path)
    if not p.exists():
        return f"Datei '{path}' existiert nicht, Sir."
    if not p.is_file():
        return f"'{path}' ist keine Datei, Sir."

    try:
        content = p.read_text(encoding="utf-8", errors="ignore")
        if len(content) > max_chars:
            content = content[:max_chars] + f"\n... (gekürzt, {len(content)} Zeichen gesamt)"
        return f"Inhalt von {p.name}:\n{content}"
    except Exception as e:
        return f"Fehler beim Lesen: {e}"


def list_files(path: str = ".") -> str:
    p = Path(path)
    if not p.exists():
        return f"Ordner '{path}' existiert nicht, Sir."
    if not p.is_dir():
        return f"'{path}' ist kein Ordner, Sir."

    try:
        items = sorted(p.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower()))
        lines = []
        for item in items[:50]:
            marker = "📁" if item.is_dir() else "📄"
            lines.append(f"{marker} {item.name}")
        result = f"Inhalt von {p}:\n" + "\n".join(lines)
        if len(items) > 50:
            result += f"\n... und {len(items) - 50} weitere"
        return result
    except Exception as e:
        return f"Fehler: {e}"