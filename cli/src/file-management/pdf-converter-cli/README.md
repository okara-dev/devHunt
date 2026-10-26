# PDF Converter CLI

## What It Is

PDF Converter CLI is an interactive Node.js utility for creating PDFs from text and documents, merging PDFs, previewing content, and running batch conversions.

## Features

- Convert text, Markdown, HTML, images, JSON, CSV, and other supported inputs to PDF.
- Create a blank PDF with title and optional metadata.
- Add content to a generated PDF and merge multiple PDFs.
- Convert all supported files in a directory with `batch`.
- Choose page size, landscape orientation, title, author, and output path.
- Display PDF information and preview extracted content.

## Usage

```bash
npm install
npm start
```

Inside the prompt:

```text
convert document.md --output document.pdf
text "Hello World" --title "Greeting"
create "My Report"
merge first.pdf second.pdf --output merged.pdf
batch ./documents
info document.pdf
preview document.pdf
```

Use `help` for all options. After `npm link`, the global command is `pdf-converter`. Existing output files require confirmation before replacement.

## Technology

- Node.js 14 or newer and ES modules
- `pdfkit` for PDF generation
- `html-pdf` and `markdown-pdf` for supported source formats

## Privacy and Safety

Conversion is local and files are not uploaded. The tool reads source files and writes PDFs to selected paths. Review generated PDFs because content and metadata may be sensitive.

## Distribution

PDF Converter CLI is distributed as a paid digital product through Gumroad. The product page may contain the current package, releases, and commercial terms.

## License

The source project declares the MIT License. See `package.json` for metadata. Gumroad purchase terms and the MIT License may apply to different parts of the distributed package.

## Status

Version 1.0.0. Rendering fidelity depends on the input format and conversion libraries.