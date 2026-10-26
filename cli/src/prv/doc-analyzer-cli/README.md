# Doc Analyzer CLI

## What It Is

Doc Analyzer CLI extracts text from supported documents and sends it to Groq AI for summarization or analysis from a terminal.

## Features

- Read PDF, Word `.docx`, plain text, Markdown, and HTML documents.
- Use `summary`, `analyze`, `explain`, or `keypoints` modes.
- Select a response language with `--lang`.
- Add a custom instruction with `--prompt`.
- Save responses with `--output`.
- Track and display the local daily usage counter with `--usage`.

## Usage

Node.js 18+ and a Groq API key are required.

```bash
npm install
```

Create `.env` with `GROQ_API_KEY=your_groq_api_key`, then run:

```bash
npm start -- contract.pdf
npm start -- application.docx --mode summary --lang English
npm start -- report.txt --mode keypoints --output analysis.txt
npm start -- letter.txt --prompt "Is this document actionable?"
npm start -- --usage
```

After `npm link`, the command is `docanalyze`. The implementation enforces a local limit of 250 analyses per UTC day.

## Technology

- Node.js ES modules
- `pdf-parse` for PDF extraction
- `mammoth` for Word documents
- `axios` for Groq requests
- `dotenv` for local configuration

## Privacy and Safety

Text is extracted locally and sent to Groq when analysis is requested. Do not submit confidential or regulated data unless permitted by your requirements. Never commit the API key. `.usage.json` stores the local date and analysis count. Check AI output against the original document.

## Distribution

Doc Analyzer CLI is distributed as a paid digital product through Gumroad. A Groq account and API access may be required separately.

## License

The source project declares the MIT License. See `package.json` for metadata. Gumroad purchase terms and the MIT License may apply to different parts of the distributed package.

## Status

Version 1.0.0.