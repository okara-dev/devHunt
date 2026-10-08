# Password Vault CLI

Password Vault CLI is an interactive Node.js terminal application for storing, searching, and managing passwords locally. Entries can include a name, username, password, URL, category, and notes.

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
| `add <name>` | Add an entry with username, URL, category, notes, and a manually entered or generated password |
| `list [--full] [--cat <category>]` | List entries; passwords are masked by default |
| `get <name> [--copy]` | Retrieve an entry and optionally copy its password to the clipboard |
| `search <term>` | Search entries |
| `update <name>` | Update an entry |
| `delete <name>` | Delete an entry after confirmation |
| `gen [length] [--no-symbols] [--no-numbers] [--no-upper]` | Generate a password (default length: 20) |
| `stats` | Show a summary and identify weak passwords |
| `categories`, `addcat <name>` | List or add categories |
| `export <file>`, `import <file> [--merge]` | Create or import an encrypted backup |
| `path`, `help`, `lock`, `exit` | Show the storage path, help, lock the session, or quit |

Entries can also be retrieved, updated, and deleted by ID.

## Storage and Security

The vault is stored in `~/.password-vault/`, with encrypted data in `vault.enc`. Data is encrypted with AES-256-GCM using key material derived from the master password with PBKDF2. Export files are encrypted and require the same master password to import.

Keep the master password safe; it cannot be reset. `list --full` and `get` display passwords in the terminal, and `--copy` places a password on the clipboard. Protect backups and clipboard access.
