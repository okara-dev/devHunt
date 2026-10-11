import subprocess
from pathlib import Path


SHORTCUTS = {
    "desktop": Path.home() / "Desktop",
    "dokumente": Path.home() / "Documents",
    "documents": Path.home() / "Documents",
    "downloads": Path.home() / "Downloads",
    "bilder": Path.home() / "Pictures",
    "pictures": Path.home() / "Pictures",
    "musik": Path.home() / "Music",
    "videos": Path.home() / "Videos",
    "home": Path.home(),
}


def open_folder(path: str) -> str:
    path = path.strip()
    shortcut = SHORTCUTS.get(path.lower())
    if shortcut is not None:
        target = shortcut
    else:
        target = Path(path).expanduser()

    if not target.exists():
        return f"Ordner '{path}' existiert nicht."
    if not target.is_dir():
        return f"'{path}' ist kein Ordner."

    try:
        subprocess.Popen(["explorer", str(target)])
    except OSError as e:
        return f"Ordner konnte nicht geöffnet werden: {e}"
    return f"Ordner geöffnet: {target}"