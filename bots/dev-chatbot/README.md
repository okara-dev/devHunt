# Dev-Chat-Bot

Der Dev-Chat-Bot ist ein interaktiver Terminal-Assistent für Entwicklungsrecherche. Er fragt GitHub, npm und die Public APIs Directory ab, erstellt QuickChart-URLs und führt Websuchen aus.

## Voraussetzungen

- Python 3.10 oder neuer
- Internetzugang
- Die im Projekt enthaltene `config.json`

## Installation und Start

Im Verzeichnis `programme/bots/dev-chatbot`:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python main.py
```

Der Bot erwartet `config.json` im aktuellen Arbeitsverzeichnis. Starte ihn daher aus seinem Projektverzeichnis.

## Befehle

- `repo facebook/react`: GitHub-Repository abfragen
- `user torvalds`: GitHub-Benutzerprofil abfragen
- `suche code fastapi`: GitHub-Code-Suche
- `npm express`: npm-Paketinformationen und Downloadzahlen abrufen
- `api weather`: freie APIs durchsuchen
- `web python tutorial` oder `such python tutorial`: Websuche
- `hilfe`: Befehlsübersicht
- `exit`, `quit`, `beenden` oder `tschüss`: Beenden

Charts werden mit QuickChart erstellt. Unterstützt werden `bar`, `line` und `pie`; Labels und Werte werden kommasepariert angegeben:

```text
chart bar Januar,Februar,März 100,200,150
chart line Mo,Di,Mi 5,8,3
chart pie A,B,C 30,50,20
```

Die Anzahl der Labels und Werte muss übereinstimmen. Der Bot gibt eine Chart-URL aus.

## Konfiguration und Datenschutz

GitHub-Abfragen zu öffentlichen Daten funktionieren ohne Token. Ein optionaler Token kann in `config.json` hinterlegt werden:

```json
{
  "github_token": "DEIN_GITHUB_TOKEN"
}
```

Halte Tokens aus der Versionsverwaltung heraus. Suchbegriffe und Abfragen werden an die jeweiligen externen Dienste gesendet; deren Ergebnisse können unvollständig oder veraltet sein.
