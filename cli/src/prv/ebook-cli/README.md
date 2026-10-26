# E-Book Bot CLI

Der E-Book-Bot nutzt die Groq-API, um interaktiv ein Buch zu einem gewählten Thema zu schreiben und als HTML-Datei auf dem Desktop zu speichern.

## Requirements and Installation

- Node.js 18 or newer
- A Groq API key
Install dependencies in this project directory:

```bash
npm install
```

Set `groq_api_key` in the project's `config.json`. Keep API keys private and do not commit real credentials.

## Run

Start the interactive program:

```bash
npm start
```

Wähle eine Kategorie und bestätige die Generierung. Der Bot erstellt ein Thema, plant das Buch, schreibt den Text und speichert die HTML-Datei direkt auf dem Desktop. Unter Windows wird der tatsächliche Desktop-Pfad des Systems verwendet, auch wenn er beispielsweise nach OneDrive umgeleitet wurde. Bei wiederholter Verwendung desselben Titels erhält die Datei einen Zusatz wie `(2)`, damit vorhandene Bücher nicht überschrieben werden.

The default chapter count depends on the chosen category; the approximate words per chapter can be set with `settings.woerter_pro_kapitel` in `config.json`. The prompts and generated content are currently in German.

## Privacy and Limitations

Book prompts and generated text are sent to Groq for generation. Do not use confidential material as input. AI output may be inaccurate or unsuitable without review.
