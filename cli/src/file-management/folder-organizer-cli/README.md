# Folder Organizer CLI

## What It Is

Folder Organizer CLI is an interactive Node.js utility that scans a directory and groups files into category folders based on names and extensions.

## Features

- Preview planned moves without changing files.
- Show file, folder, size, type, and category statistics.
- Organize files after explicit confirmation.
- Categorize images, documents, archives, media, code, databases, fonts, configuration, backups, scripts, and more.
- Skip hidden directories, `.git`, `node_modules`, and Python cache directories.
- Avoid name collisions with suffixes such as `_1` or `_2`.

## Usage

```bash
npm install
npm start
```

Inside the prompt:

```text
preview ./Downloads
stats ./Documents
organize C:\Users\Name\Downloads
```

Use `help` for commands. `preview` and `stats` are read-only. `organize` permanently moves files after `yes` or `y` confirmation. After `npm link`, use `folder-organizer`.

## Technology

- Node.js 14 or newer and ES modules
- Node.js filesystem and readline APIs
- No external runtime dependencies

## Privacy and Safety

Scanning and moves happen locally; file names and contents are not uploaded. Review the preview and create a backup before organizing. A move can change a directory permanently.

## Distribution

Folder Organizer CLI is distributed as a paid digital product through Gumroad. The product page may contain the current package, releases, and commercial terms.

## License

The source project declares the MIT License. See `package.json` for metadata. Gumroad purchase terms and the MIT License may apply to different parts of the distributed package.

## Status

Version 1.0.0. Test commands are available through `npm test`.