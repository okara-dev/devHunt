# E-book Bot CLI

E-book Bot CLI uses the Groq API to generate a themed book interactively. It creates an HTML version and can also create an MP3 audio version when the configured Piper text-to-speech program and voice model are available.

## Requirements and Installation

- Node.js 18 or newer
- A Groq API key
- For audio output: Piper and a compatible voice model and configuration file

Install dependencies in this project directory:

```bash
npm install
```

Set `groq_api_key` in the project's `config.json`. Optionally configure the `vox` settings for the Piper executable, model, model configuration, and MP3 bitrate. Keep API keys private and do not commit real credentials.

## Run

Start the interactive program:

```bash
npm start
```

Choose one of the displayed categories and confirm generation. The bot creates a topic, plans the book, generates the text, and writes the HTML file to a new folder on the current user's Desktop. If Piper is configured and available, an MP3 is written to the same folder. Audio-generation errors do not prevent the HTML version from being saved.

The default chapter count depends on the chosen category; the approximate words per chapter can be set with `settings.woerter_pro_kapitel` in `config.json`. The prompts and generated content are currently in German.

## Privacy and Limitations

Book prompts and generated text are sent to Groq for generation. Do not use confidential material as input. AI output may be inaccurate or unsuitable without review. Audio generation requires a separately installed Piper executable and local voice files. Despite the package metadata, the current CLI does not send books by email.
