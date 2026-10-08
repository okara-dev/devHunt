# Vulnerability Scanner CLI

## What It Is

Vulnerability Scanner CLI checks Node.js dependencies, source-code patterns, environment files, and exposed secrets. It produces terminal results or a report for review and automation.

## Features

- Run npm audit checks for known dependency vulnerabilities.
- Detect risky code patterns and possible hardcoded credentials.
- Check for exposed `.env`, AWS, SSH, Docker, and related sensitive files.
- Detect API keys, tokens, private keys, OAuth tokens, and other secret-like patterns.
- Run all checks by default, select checks individually, or use interactive mode.
- Export JSON or display a colored table-style report.
- Sort findings by critical, high, medium, and low severity.

## Usage

```bash
npm install
npm start
npm start -- --path ./my-project
npm start -- --npm
npm start -- --all --format json --output ./security-report.json
npm start -- --interactive
```

Options include `--path`/`-p`, `--format`/`-f` (`json`, `table`, or `html`), `--output`/`-o`, `--interactive`/`-i`, `--npm`, `--code`, `--env`, `--secrets`, and `--all`. After `npm link`, the command is `vulnscan`.

## Technology

- Node.js CommonJS runtime
- `commander`, `inquirer`, `chalk`, `table`, `fs-extra`, `axios`, and `semver`
- npm audit for dependency vulnerability data

## Privacy and Safety

Scanning is primarily local, but npm audit can contact the npm registry. Reports may contain project paths, dependency names, code locations, or secret-like values; store them securely.

This tool is pattern-based and is not a complete security assessment. It does not replace code review, dependency governance, secret management, penetration testing, or professional security advice. Validate every finding before acting on it.

## Distribution

Vulnerability Scanner CLI is distributed as a paid digital product through Gumroad. The product page may contain the current package, releases, and commercial terms.

## License

The source project declares the MIT License. See `package.json` for metadata. Gumroad purchase terms and the MIT License may apply to different parts of the distributed package.

## Status

Version 1.0.0. Use this scanner as one component of a broader secure development process.