"""
Mediensteuerung über Windows-Tastatur-Simulation.
Nutzt pyautogui für Play/Pause, Next, Prev, Volume.
"""

try:
    import pyautogui
    PYAUTOGUI_OK = True
except ImportError:
    PYAUTOGUI_OK = False


def media_control(action: str) -> str:
    if not PYAUTOGUI_OK:
        return "Mediensteuerung nicht verfügbar, Sir. Bitte 'pip install pyautogui' ausführen."

    action = action.strip().lower()

    try:
        if action in ("play", "pause", "play_pause", "toggle"):
            pyautogui.press("playpause")
            return "Wiedergabe umgeschaltet, Sir."
        if action in ("next", "weiter"):
            pyautogui.press("nexttrack")
            return "Nächster Titel, Sir."
        if action in ("prev", "previous", "zurück"):
            pyautogui.press("prevtrack")
            return "Vorheriger Titel, Sir."
        if action in ("volume_up", "lauter"):
            for _ in range(5):
                pyautogui.press("volumeup")
            return "Lautstärke erhöht, Sir."
        if action in ("volume_down", "leiser"):
            for _ in range(5):
                pyautogui.press("volumedown")
            return "Lautstärke verringert, Sir."
        if action in ("mute", "stumm"):
            pyautogui.press("volumemute")
            return "Stummschaltung umgeschaltet, Sir."
        return f"Unbekannte Medienaktion: {action}"
    except Exception as e:
        return f"Medienfehler: {e}"