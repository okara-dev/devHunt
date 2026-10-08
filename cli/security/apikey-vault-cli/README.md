# API Key Vault CLI

API Key Vault CLI is an interactive Node.js terminal application for storing and managing API keys locally. Each entry can include a name, provider, and notes.

## Requirements and Start

- Node.js 14 or newer

From the project directory:

```bash
npm install
npm start
```

You can also pass a command directly:

```bash
npm start -- init
npm start -- add github
npm start -- get github --copy
```

Initialize the vault with `init` on first use. The master password must be at least 8 characters long and cannot be recovered. It is reused during the current session; use `lock` to lock the session.

## Commands

| Command | Description |
| --- | --- |
| `init` | Create the vault |
| `add <name>` | Add an API key; the key is entered with input hidden |
| `list [--full]` | List keys, masked by default |
| `get <name> [--copy]` | Retrieve an entry and optionally copy its key to the clipboard |
| `search <term>` | Search entries |
| `update <name>` | Change an entry's name, key, provider, or notes |
| `delete <name>` | Delete an entry after confirmation |
| `export <file>`, `import <file> [--merge]` | Create or import an encrypted backup |
| `path`, `help`, `lock`, `exit` | Show the storage path, help, lock the session, or quit |

Entries can also be retrieved, updated, and deleted by ID.

## Storage and Security

The vault is stored in `~/.apikey-vault/`, with encrypted data in `vault.enc`. Data is encrypted with AES-256-GCM using key material derived from the master password with PBKDF2. Export files are encrypted and require the same master password to import.

Keep the master password safe; it cannot be reset. `list --full` and `get` display API keys in the terminal, and `--copy` places a key on the clipboard. Protect backups and clipboard access.
