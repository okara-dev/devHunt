# Lern-Bot

Der Lern-Bot ist ein deutschsprachiger Recherche-Assistent für kurze Fragen. Er ruft Wikipedia-Zusammenfassungen und zufällige Themen ab, sucht Bücher bei Open Library und bietet eine Websuche an. Die Ergebnisse erscheinen im Terminal.

## Voraussetzungen

- Python 3.10 oder neuer
- Internetzugang
- Die im Projekt enthaltene `config.json`

Ein LLM- oder E-Mail-Konto ist für die Recherchefunktionen nicht erforderlich.

## Installation und Start

Im Verzeichnis `programme/bots/lern-bot`:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python main.py
```

Der Bot lädt `config.json` relativ zum aktuellen Arbeitsverzeichnis. Starte ihn deshalb aus seinem Projektverzeichnis.

## Eingaben

- `wiki Einstein`, `info Japan` oder `über Python`: Wikipedia-Suche
- `thema physik`, `zufall biologie` oder `random informatik`: zufälliger Wikipedia-Artikel zum Thema
- `buch psychologie` oder `buch informatik`: Büchersuche bei Open Library
- `such python tutorial` oder `google flask`: DuckDuckGo-Websuche
- `aktiviere sprachlehrer`: versucht den separaten Sprachlehrer unter `sprachlehrer/start_sprachlehrer.bat` zu starten
- `hilfe`: Befehlsübersicht
- `exit`, `quit`, `beenden`, `tschüss` oder `ciao`: Beenden

Ein einzelnes unbekanntes Wort wird als Wikipedia-Suche interpretiert. Der Sprachlehrer ist ein separates Programm und benötigt seine eigenen Dateien und Konfiguration.

## Konfiguration und Datenschutz

`config.json` muss vorhanden sein. Optional kann die Wikipedia-Sprache gesetzt werden; Standard ist Deutsch:

```json
{
  "sprache": "de"
}
```

Suchbegriffe werden an Wikipedia, Open Library oder DuckDuckGo übermittelt. Gib keine vertraulichen Informationen ein. Ergebnisse können unvollständig oder veraltet sein.
