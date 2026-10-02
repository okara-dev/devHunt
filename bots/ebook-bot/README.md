# E-Book-Bot

Der E-Book-Bot erstellt aus einem selbst eingegebenen Thema einen deutschsprachigen psychologischen Roman. Ein Groq-Sprachmodell plant Kapitel und Titel und schreibt die Kapitel. Der Bot erstellt eine HTML-Ausgabe, versucht eine MP3-Fassung zu erzeugen und sendet die verfügbaren Dateien per E-Mail.

## Voraussetzungen und Installation

- Python 3.10 oder neuer
- Internetzugang und ein Groq-API-Schlüssel
- SMTP-Zugangsdaten
- Für die Audioausgabe: funktionsfähige Piper-TTS-Installation und passende Stimmen

Im Verzeichnis `programme/bots/ebook-bot`:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python main.py
```

Beim Start fragt das Programm Thema und Bestätigung ab. Danach werden Inhalte über die Groq-API generiert und die resultierenden Anhänge per E-Mail versendet. Wenn die Audioerzeugung fehlschlägt, kann die HTML-Datei weiterhin versendet werden. Unter Windows ist auch `start.bat` vorhanden.

## Konfiguration

Lege im Bot-Verzeichnis eine `config.json` an:

```json
{
  "groq_api_key": "DEIN_GROQ_API_KEY",
  "email": {
    "sender": "absender@example.com",
    "password": "SMTP_PASSWORT_ODER_APP_PASSWORT",
    "receiver": "empfaenger@example.com",
    "smtp_server": "smtp.gmail.com",
    "smtp_port": 587
  },
  "settings": {
    "kapitel_anzahl": 6,
    "woerter_pro_kapitel": 500
  }
}
```

Die Einstellungen für Kapitelzahl und ungefähre Wortzahl pro Kapitel sind optional; Standardwerte sind 6 und 500. Schütze API-Schlüssel und SMTP-Zugangsdaten und veröffentliche die Konfigurationsdatei nicht.

## Abhängigkeiten und Hinweise

Die Python-Abhängigkeiten stehen in `requirements.txt` (`groq`, `piper-tts`, `pydub`). Die Audioerzeugung kann zusätzlich installierte Piper-Stimmen und lokale Systemkomponenten benötigen. Generierte Texte können Fehler enthalten; prüfe sie vor einer Weiterverwendung. Für API-Aufrufe und E-Mail-Versand fallen die Nutzungsbedingungen der jeweiligen Anbieter an.
