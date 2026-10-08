import subprocess
import webbrowser

from actions.browser import open_by_name


APPS = {
    "chrome": 'start "" chrome',
    "firefox": 'start "" firefox',
    "edge": 'start "" msedge',
    "cmd": 'start "" cmd.exe',
    "terminal": 'start "" cmd.exe',
    "powershell": 'start "" powershell.exe',
    "einstellungen": 'start "" ms-settings:',
    "settings": 'start "" ms-settings:',
    "spotify": 'start "" spotify.exe',
    "vscode": 'start "" code',
    "word": 'start "" winword.exe',
    "excel": 'start "" excel.exe',
    "outlook": 'start "" outlook.exe',
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
        cmd = APPS[target]
        try:
            subprocess.Popen(cmd, shell=True)
            return f"{target.capitalize()} wurde geöffnet."
        except Exception as e:
            return f"Konnte {target} nicht öffnen: {e}"

    # 4. Fallback: Windows-Start
    try:
        subprocess.Popen(f'start "" {target}', shell=True)
        return f"Versucht, {target} zu starten."
    except Exception as e:
        return f"Konnte {target} nicht öffnen: {e}"