# Code Analyzer CLI

## What It Is

Code Analyzer CLI is an interactive Node.js tool that scans a project and produces a lightweight code-quality report based on file size, comments, complexity, and documentation signals.

## Features

- Scan common JavaScript, TypeScript, Python, Java, C/C++, C#, Go, Rust, PHP, web, configuration, shell, SQL, and Markdown files.
- Report file, line, function, comment, and blank-line statistics.
- Flag large files, low comment ratios, and complex functions.
- Display an overall score, grade, breakdown, and issues.
- Ignore common generated, dependency, build, cache, and editor directories.

## Usage

```bash
npm install
npm start
```

The tool analyzes the current working directory after confirmation. For a global command, run `npm link` and then `code-analyzer`. Start the command from the project you want to inspect; the current implementation does not accept a target path argument.

## Technology

- Node.js 14 or newer and ES modules
- Node.js filesystem APIs
- Heuristic, pattern-based analysis; no AST or compiler analysis

## Privacy and Safety

Analysis is local. Source files are not uploaded. Terminal output can expose paths or metrics, so review it before sharing. The score is a heuristic and is not a security audit.

## Distribution

Code Analyzer CLI is distributed as a paid digital product through Gumroad. The product page may contain the current package, releases, and commercial terms.

## License

The source project declares the MIT License. See `package.json` for metadata. Gumroad purchase terms and the MIT License may apply to different parts of the distributed package.

## Status

Version 1.0.0.