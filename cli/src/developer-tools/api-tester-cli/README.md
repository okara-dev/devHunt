# API Tester CLI

API Tester CLI checks whether HTTP API endpoints respond and reports response status, timing, authentication hints, and selected response headers.

## Requirements and Installation

- Node.js 18 or newer (the CLI uses the built-in `fetch` API)

From this project directory, install dependencies (none are required at runtime) and start the interactive CLI:

```bash
npm install
npm start
```

To install the `apitest` command globally for local development:

```bash
npm link
```

## Usage

At the prompt, enter `test` followed by one or more URLs. You can also pass a command directly:

```bash
npm start -- test https://api.github.com
npm start -- test https://api.example.com https://httpbin.org/get --timeout 5000
npm start -- test https://api.example.com --json
apitest test api.example.com --json
```

The tool adds `https://` when a URL does not include a scheme. Supported options are `--timeout <ms>` (default: 10000) and `--json`. Use `help` for the interactive command list and `exit` to quit.

## Reported Information

- Reachability, HTTP status, response time, and errors such as timeouts or DNS failures
- Content type, server, CORS, and selected security headers
- A heuristic indication of whether authentication may be required

The tester tries a `HEAD` request first and falls back to `GET` if the request fails. Authentication detection is based on response status and headers; it is only an estimate, not a complete API security test.

## Privacy

Requests are sent directly to the URLs you provide. Only test services you are authorized to access. Response headers and endpoint names are shown in the terminal or JSON output.
