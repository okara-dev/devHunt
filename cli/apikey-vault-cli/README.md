# API Key Vault CLI

Ein interaktives Node.js-Terminalprogramm zur lokalen Verwaltung von API-Schlüsseln. Zu jedem Schlüssel können ein Name, ein Anbieter und Notizen gespeichert werden.

## Voraussetzungen und Start

- Node.js 14 oder neuer

Im Verzeichnis `devHunt/cli/apikey-vault-cli`:

```powershell
npm start
```

Das Programm öffnet eine interaktive Eingabeaufforderung. Ein einzelner Befehl kann auch direkt gestartet werden:

```powershell
npm start -- init
npm start -- add github
npm start -- get github --copy
```

Lege beim ersten Start mit `init` einen Vault an. Das Master-Passwort muss mindestens 8 Zeichen lang sein. Ohne das Master-Passwort lassen sich die gespeicherten Schlüssel nicht wiederherstellen. Während einer Sitzung wird es wiederverwendet; `lock` sperrt die Sitzung.

## Befehle

| Befehl | Funktion |
| --- | --- |
| `init` | Vault erstellen |
| `add <name>` | API-Key hinzufügen; Schlüssel wird verdeckt abgefragt |
| `list [--full]` | Schlüssel anzeigen; standardmäßig maskiert |
| `get <name> [--copy]` | Schlüssel abrufen und optional in die Zwischenablage kopieren |
| `search <begriff>` | Einträge durchsuchen |
| `update <name>` | Name, Schlüssel, Anbieter oder Notizen ändern |
| `delete <name>` | Eintrag nach Bestätigung löschen |
| `export <datei>`, `import <datei> [--merge]` | Verschlüsseltes Backup erstellen oder einspielen |
| `path`, `help`, `lock`, `exit` | Speicherort, Hilfe, Sitzungssperre oder Beenden |

Einträge lassen sich über ihren Namen oder ihre ID abrufen, aktualisieren und löschen.

## Speicherung und Sicherheit

Der Vault wird unter `~/.apikey-vault/` gespeichert; die verschlüsselten Daten liegen in `vault.enc`. Die Verschlüsselung verwendet AES-256-GCM und eine mit PBKDF2 aus dem Master-Passwort abgeleitete Schlüsselbasis. Exporte sind verschlüsselt und werden mit demselben Master-Passwort importiert.

Bewahre das Master-Passwort sicher auf; eine Wiederherstellung ist nicht möglich. `list --full` und `get` geben API-Keys im Terminal aus. `--copy` kopiert sie in die Zwischenablage. Schütze Backups und Clipboard-Zugriff entsprechend.
