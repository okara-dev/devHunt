# JSON Formatter CLI

## What It Is

JSON Formatter CLI is an interactive terminal tool for formatting, minifying, validating, and inspecting JSON data.

## Features

- Format JSON from inline text, a file, or built-in examples.
- Minify valid JSON and validate syntax with line and column information.
- Display JSON as a tree and show size, depth, key, value, and type statistics.
- Save the last formatted result and compare original versus formatted content.
- Copy the last result to the clipboard when supported by the environment.

## Usage

```bash
npm install
npm start
```

Inside the prompt:

```text
format {"name":"Ada","active":true}
format file ./data.json
validate {"invalid": json}
minify file ./data.json
examples
format example messy1
save ./formatted.json
tree
stats
```

After `npm link`, use `json-formatter`. Formatted data stays in memory only for the current process until saved.

## Technology

- Node.js 14 or newer and ES modules
- Native JSON parsing and Node.js filesystem/readline APIs
- No external runtime dependencies

## Privacy and Safety

JSON is processed locally and is not transmitted. Be careful when saving or copying credentials, tokens, personal data, or production configuration.

## Distribution

JSON Formatter CLI is distributed as a paid digital product through Gumroad. The product page may contain the current package, releases, and commercial terms.

## License

The source project declares the MIT License. See `package.json` for metadata. Gumroad purchase terms and the MIT License may apply to different parts of the distributed package.

## Status

Version 1.0.0. The formatter expects strict JSON and does not parse JavaScript object literals or JSON with comments.