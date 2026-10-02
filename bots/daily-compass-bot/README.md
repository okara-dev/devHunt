# Daily Compass Bot

Daily Compass stellt bei jedem Aufruf eine kompakte Nachricht aus Nachrichten, Technik-Artikeln, NASA-Inhalten, einem Sprichwort und einem Witz zusammen und versendet sie als E-Mail. Es gibt keinen eingebauten Zeitplan; für regelmäßigen Versand kann das Skript über die Aufgabenplanung gestartet werden.

## Inhalte

- RSS-Schlagzeilen
- Top-Stories von Hacker News und beliebte Artikel von Dev.to
- NASA Astronomy Picture of the Day
- Sprichwort und Witz, jeweils mit Fallbacks
- DeepL-Übersetzungen unterstützter Inhalte

## Voraussetzungen und Installation

- Python 3.10 oder neuer
- Internetzugang
- DeepL- und NASA-API-Schlüssel
- SMTP-Zugangsdaten für den Versand

Im Verzeichnis `programme/bots/daily-compass-bot`:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python main.py
```

`python main.py --no-pause` überspringt die abschließende Eingabeaufforderung. Unter Windows kann `start_compass.bat` verwendet werden. Jeder normale Start ruft die APIs ab und versucht, eine E-Mail zu senden.

## Konfiguration

`config.json` muss im Bot-Verzeichnis liegen und die folgenden Felder enthalten:

```json
{
  "api_keys": {
    "nasa_api": "DEIN_NASA_API_KEY"
  },
  "deepl_api_key": "DEIN_DEEPL_API_KEY",
  "email": {
    "sender": "absender@example.com",
    "password": "SMTP_PASSWORT_ODER_APP_PASSWORT",
    "receiver": "empfaenger@example.com",
    "smtp_server": "smtp.gmail.com",
    "smtp_port": 587
  }
}
```

Schütze API-Schlüssel, SMTP-Passwörter und E-Mail-Adressen und veröffentliche sie nicht. Für Gmail wird üblicherweise ein App-Passwort benötigt.

## Datenschutz und Fehler

Für die Nachricht werden Inhalte von externen RSS-Feeds und APIs abgerufen. Verfügbarkeit und Inhalt dieser Dienste können sich ändern. SMTP-Zugangsdaten werden zum Versand verwendet.
