# devHunt CLI Collection

This directory contains a launcher and a collection of independent command-line tools. The launcher discovers each tool from the `bin` field in its `package.json`, groups tools by the first directory under `src/`, and lets you list, select, install, or run them from one place.

## Requirements

- Node.js 18 or newer
- npm

Some tools may have additional platform or API requirements. Check the README in the tool's directory before using it.

## Getting started

From this directory, install dependencies for every discovered CLI:

```sh
npm install
```

The package's `postinstall` script runs `node ./cli-system.mjs install` automatically. To install or refresh tool dependencies later, run:

```sh
node ./cli-system.mjs install
```

The launcher can also be used directly without installing the root package:

```sh
node ./cli-system.mjs list
node ./cli-system.mjs run <command> [arguments...]
node ./cli-system.mjs help
```

Running the launcher without a command opens an interactive menu:

```sh
node ./cli-system.mjs
```

The launcher starts the selected tool as a child Node.js process, passes through its arguments, runs it from its own package directory, and returns its exit status.

## Available tools

Commands and descriptions below are read from each tool's `package.json`. Use the tool-specific README for detailed usage, examples, and limitations.

### Developer tools

| Command | Purpose |
| --- | --- |
| `apitest` | Check API endpoint reachability, authentication requirements, and basic information. |
| `code-analyzer` | Analyze code quality. |
| `dep-analyze` | Analyze and report on project dependencies. |
| `json-formatter` | Format and beautify JSON. |

### File management

| Command | Purpose |
| --- | --- |
| `folder-organizer` | Organize files into categorized folders. |
| `folder` | Create folder structures from text input. |
| `imgconvert` | Convert images between JPG and PNG. |
| `pdf-converter` | Convert documents to PDF. |

### Personal tools

| Command | Purpose |
| --- | --- |
| `docanalyze` | Analyze and summarize documents using Groq AI. |
| `ebook` | Generate AI-assisted e-books and save them as HTML. |
| `netinfo` | Display network information and run port and network diagnostics. |
| `cleaner` | Clean selected Windows locations, including screenshots, Downloads, Recycle Bin, and temporary files. |
| `spiele` | Play terminal-based logic and strategy games. |
| `updatecheck` | Check for and install Windows updates. |

### Security

| Command | Purpose |
| --- | --- |
| `vault` | Store, view, and reuse API keys. |
| `passvault` | Store and reuse passwords. |
| `vulnscan` | Scan projects for security vulnerabilities. |

## How discovery and installation work

- The launcher recursively searches `src/` for `package.json` files, while skipping `.git` and `node_modules`.
- A package is included when its manifest has a `bin` entry. The command name comes from that entry; the launcher does not rely on a hard-coded tool registry.
- `cli-system install` runs `npm install --omit=dev --no-audit --no-fund` in each discovered package directory. Installation failures are reported and produce a non-zero exit status.
- `cli-system run <command>` launches the matching tool and forwards all remaining arguments.

## Safety notes

Some tools can modify files, remove data, access network information, install system updates, or handle sensitive credentials. Review the tool-specific documentation and requested actions before running them. Only use tools against systems and files you are authorized to access.

Keep API keys and passwords out of command history and source files. Follow each tool's instructions for configuring secrets and protecting local data.