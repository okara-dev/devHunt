# Folder Structure CLI

## What It Is

Folder Structure CLI creates a folder and file tree from an ASCII-style text description. It previews the parsed structure, asks for confirmation, and creates it in the current working directory.

## Features

- Parse tree input containing folders and files.
- Display a preview before creation.
- Generate starter content for common Python, JavaScript, TypeScript, JSON, YAML, Markdown, HTML, CSS, shell, and SQL files.
- Create empty files for unknown extensions.
- Reuse existing directories and accept `exit` or `Ctrl+C` to cancel.

## Usage

```bash
npm install
npm start
```

Enter a structure such as:

```text
my-project/
├── src/
│   ├── index.js
│   └── config.json
├── README.md
└── package.json
```

Finish with an empty line, review the preview, and answer `yes`. After `npm link`, the global command is `folder`.

Existing files with the same path can be overwritten when the structure is generated. Use a new target directory or a backup first.

## Technology

- Node.js 14 or newer and ES modules
- Node.js filesystem, path, and readline APIs
- No external runtime dependencies

## Privacy and Safety

The tool operates locally and does not upload input or generated files. It writes to the current working directory and may overwrite existing files.

## Distribution

Folder Structure CLI is distributed as a paid digital product through Gumroad. The product page may contain the current package, releases, and commercial terms.

## License

The source project declares the MIT License. See `package.json` for metadata. Gumroad purchase terms and the MIT License may apply to different parts of the distributed package.

## Status

Version 1.0.0. Test commands are available through `npm test`.