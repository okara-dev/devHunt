# Password Vault CLI

Ein interaktives Node.js-Terminalprogramm zum lokalen Speichern, Suchen und Verwalten von Passwörtern. Einträge enthalten Name, Benutzername, Passwort, URL, Kategorie und Notizen.

## Voraussetzungen und Start

- Node.js 14 oder neuer

Im Verzeichnis `devHunt/cli/passwords-vault-cli`:

```powershell
npm start
```

Das Programm öffnet eine interaktive Eingabeaufforderung. Alternativ kann ein einzelner Befehl direkt ausgeführt werden:

```powershell
npm start -- init
npm start -- add github
npm start -- get github --copy
```

Beim ersten Start den Vault mit `init` anlegen. Das Master-Passwort muss mindestens 8 Zeichen lang sein und kann nicht wiederhergestellt werden. Es wird während der Sitzung wiederverwendet; `lock` sperrt die Sitzung.

## Befehle

| Befehl | Funktion |
| --- | --- |
| `init` | Vault erstellen |
| `add <name>` | Eintrag anlegen; Benutzername, URL, Kategorie und Notiz eingeben, Passwort manuell eingeben oder generieren |
| `list [--full] [--cat <kategorie>]` | Einträge anzeigen; Passwörter standardmäßig maskieren |
| `get <name> [--copy]` | Eintrag abrufen und optional Passwort in die Zwischenablage kopieren |
| `search <begriff>` | Einträge durchsuchen |
| `update <name>` | Eintrag bearbeiten |
| `delete <name>` | Eintrag nach Bestätigung löschen |
| `gen [länge] [--no-symbols] [--no-numbers] [--no-upper]` | Passwort generieren; Standardlänge 20 |
| `stats` | Übersicht und schwache Passwörter anzeigen |
| `categories`, `addcat <name>` | Kategorien anzeigen oder hinzufügen |
| `export <datei>`, `import <datei> [--merge]` | Verschlüsseltes Backup erstellen oder einspielen |
| `path`, `help`, `lock`, `exit` | Speicherort, Hilfe, Sitzungssperre oder Beenden |

Einträge können auch über ihre ID statt über den Namen abgerufen, aktualisiert oder gelöscht werden.

## Speicherung und Sicherheit

Der Vault liegt unter `~/.password-vault/`; die verschlüsselten Daten werden in `vault.enc` gespeichert. Die Inhalte werden mit AES-256-GCM verschlüsselt; der Schlüssel wird aus dem Master-Passwort mit PBKDF2 abgeleitet. Exportdateien sind ebenfalls verschlüsselt und benötigen dasselbe Master-Passwort.

Bewahre das Master-Passwort sicher auf: Es gibt keine Wiederherstellungsfunktion. `list --full` und `get` zeigen Geheimnisse im Terminal an; `--copy` legt das Passwort in die Zwischenablage. Schütze auch Backups und die Zwischenablage vor unbefugtem Zugriff.
