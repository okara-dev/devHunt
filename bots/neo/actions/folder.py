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
    path = path.strip().lower()
    if path in SHORTCUTS:
        target = SHORTCUTS[path]
    else:
        target = Path(path)

    if not target.exists():
        return f"Ordner '{path}' existiert nicht."

    subprocess.Popen(f'explorer "{target}"')
    return f"Ordner geöffnet: {target}"