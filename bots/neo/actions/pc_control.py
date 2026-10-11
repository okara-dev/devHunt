import os
import webbrowser

from actions.browser import open_by_name


APPS = {
    "chrome": "chrome",
    "firefox": "firefox",
    "edge": "msedge",
    "cmd": "cmd.exe",
    "terminal": "cmd.exe",
    "powershell": "powershell.exe",
    "einstellungen": "ms-settings:",
    "settings": "ms-settings:",
    "spotify": "spotify.exe",
    "vscode": "code",
    "word": "winword.exe",
    "excel": "excel.exe",
    "outlook": "outlook.exe",
    "notepad": "notepad.exe",
    "editor": "notepad.exe",
    "explorer": "explorer.exe",
    "rechner": "calc.exe",
    "calculator": "calc.exe",
    "taschenrechner": "calc.exe",
    "paint": "mspaint.exe",
    "taskmanager": "taskmgr.exe",
}


def open_app(target: str) -> str:
    target = target.strip().lower()

    # 1. Direkte URL
    if target.startswith("http://") or target.startswith("https://"):
        webbrowser.open(target)
        return f"Browser geöffnet mit {target}"

    # 2. URL-Shortcut aus urls.json (z. B. "youtube", "github", "wetter")
    shortcut_result = open_by_name(target)
    if shortcut_result:
        return shortcut_result

    # 3. Bekannte Desktop-App
    if target in APPS:
        launch_target = APPS[target]
        try:
            os.startfile(launch_target)
            return f"{target.capitalize()} wurde geöffnet."
        except Exception as e:
            return f"Konnte {target} nicht öffnen: {e}"

    try:
        os.startfile(target)
        return f"Versucht, {target} zu starten."
    except Exception as e:
        return f"Konnte {target} nicht öffnen: {e}"