import subprocess
import ctypes


def system_action(action: str) -> str:
    """
    Aktionen: lock, sleep, shutdown, restart, logout
    ⚠️ shutdown/restart/logout sind kritisch – nur auf explizite Anfrage!
    """
    action = action.strip().lower()

    try:
        if action == "lock":
            ctypes.windll.user32.LockWorkStation()
            return "Arbeitsstation gesperrt, Sir."

        if action == "sleep":
            subprocess.Popen("rundll32.exe powrprof.dll,SetSuspendState 0,1,0", shell=True)
            return "Ruhezustand eingeleitet, Sir."

        if action == "shutdown":
            subprocess.Popen("shutdown /s /t 30", shell=True)
            return "Herunterfahren in 30 Sekunden, Sir. Verwenden Sie 'shutdown /a', um abzubrechen."

        if action == "restart":
            subprocess.Popen("shutdown /r /t 30", shell=True)
            return "Neustart in 30 Sekunden, Sir."

        if action == "logout":
            subprocess.Popen("shutdown /l", shell=True)
            return "Abmeldung eingeleitet, Sir."

        if action == "cancel":
            subprocess.Popen("shutdown /a", shell=True)
            return "Geplanter Vorgang abgebrochen, Sir."

        return f"Unbekannte Systemaktion: {action}"
    except Exception as e:
        return f"Fehler: {e}"