#!/usr/bin/env node

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  vaultExists,
  createVault,
  addKey,
  listKeys,
  getKey,
  deleteKey,
  updateKey,
  searchKeys,
  exportVault,
  importVault,
  getVaultPath
} from '../lib/vault.js';

const execAsync = promisify(exec);
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

// Global: Master-Passwort für Session
let sessionPassword = null;

// ============================================================
// BANNER & HELP
// ============================================================

function showBanner() {
  console.log(`
${c.bold}${c.magenta}╔═══════════════════════════════════════════════════════════════════╗
║              🔐 API Key Vault - Sicher & Einfach                 ║
║         Keys speichern • anzeigen • kopieren • wiederverwenden   ║
╚═══════════════════════════════════════════════════════════════════╝${c.reset}
`);
}

function showHelp() {
  console.log(`
${c.bold}Commands:${c.reset}
  ${c.green}init${c.reset}                          - Vault erstellen (einmalig)
  ${c.green}add${c.reset} <name>                    - Neuen API-Key hinzufügen
  ${c.green}list${c.reset} [--full]                 - Alle Keys anzeigen
  ${c.green}get${c.reset} <name> [--copy]           - Key anzeigen (mit --copy in Clipboard)
  ${c.green}search${c.reset} <query>                - Keys durchsuchen
  ${c.green}update${c.reset} <name>                 - Key aktualisieren
  ${c.green}delete${c.reset} <name>                 - Key löschen
  ${c.green}export${c.reset} <datei>                - Backup erstellen
  ${c.green}import${c.reset} <datei> [--merge]      - Backup einspielen
  ${c.green}lock${c.reset}                          - Session sperren
  ${c.green}path${c.reset}                          - Vault-Speicherort anzeigen
  ${c.green}help${c.reset}                          - Zeigt diese Hilfe
  ${c.green}exit${c.reset}                          - Beendet

${c.bold}Beispiele:${c.reset}
  vault init
  vault add github
  vault get github --copy
  vault list
  vault search google
`);
}

// ============================================================
// PASSWORT-EINGABE (versteckt)
// ============================================================

function askPassword(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);

    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.resume();

    let password = '';

    const onData = (char) => {
      char = char.toString('utf8');

      if (char === '\n' || char === '\r' || char === '\u0004') {
        if (stdin.isTTY) stdin.setRawMode(wasRaw || false);
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(password);
      } else if (char === '\u0003') {
        // Ctrl+C
        process.stdout.write('\n');
        process.exit(0);
      } else if (char === '\u007f' || char === '\b') {
        // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        password += char;
        process.stdout.write('*');
      }
    };

    stdin.on('data', onData);
  });
}

async function askQuestion(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer.trim()));
  });
}

// ============================================================
// SESSION MANAGEMENT
// ============================================================

async function ensurePassword() {
  if (sessionPassword) return sessionPassword;

  if (!vaultExists()) {
    console.log(`\n${c.yellow}⚠️  Noch kein Vault vorhanden!${c.reset}`);
    console.log(`${c.dim}Erstelle zuerst einen mit: vault init${c.reset}`);
    return null;
  }

  const pw = await askPassword(`\n${c.cyan}🔑 Master-Passwort: ${c.reset}`);
  sessionPassword = pw;
  return pw;
}

// ============================================================
// COPY TO CLIPBOARD
// ============================================================

async function copyToClipboard(text) {
  try {
    const platform = process.platform;
    let cmd;

    if (platform === 'win32') {
      cmd = `powershell -command "Set-Clipboard -Value '${text.replace(/'/g, "''")}'"`;
    } else if (platform === 'darwin') {
      cmd = `echo '${text.replace(/'/g, "'\\''")}' | pbcopy`;
    } else {
      cmd = `echo '${text.replace(/'/g, "'\\''")}' | xclip -selection clipboard`;
    }

    await execAsync(cmd);
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// COMMANDS
// ============================================================

async function handleInit() {
  if (vaultExists()) {
    console.log(`\n${c.yellow}⚠️  Vault existiert bereits!${c.reset}`);
    console.log(`${c.dim}Speicherort: ${getVaultPath()}${c.reset}`);
    return;
  }

  console.log(`\n${c.bold}🔐 Neuen Vault erstellen${c.reset}`);
  console.log('='.repeat(50));
  console.log(`${c.dim}Das Master-Passwort schützt alle deine API-Keys.${c.reset}`);
  console.log(`${c.dim}⚠️  Wenn du es vergisst, sind alle Keys verloren!${c.reset}\n`);

  const pw1 = await askPassword(`${c.cyan}Master-Passwort: ${c.reset}`);
  if (pw1.length < 8) {
    console.log(`${c.red}❌ Passwort muss mindestens 8 Zeichen haben!${c.reset}`);
    return;
  }

  const pw2 = await askPassword(`${c.cyan}Passwort wiederholen: ${c.reset}`);
  if (pw1 !== pw2) {
    console.log(`${c.red}❌ Passwörter stimmen nicht überein!${c.reset}`);
    return;
  }

  try {
    createVault(pw1);
    sessionPassword = pw1;
    console.log(`\n${c.green}✅ Vault erstellt!${c.reset}`);
    console.log(`${c.dim}Speicherort: ${getVaultPath()}${c.reset}`);
    console.log(`\n${c.yellow}💡 Tipp: Merke dir das Passwort gut!${c.reset}`);
  } catch (error) {
    console.log(`${c.red}❌ Fehler: ${error.message}${c.reset}`);
  }
}

async function handleAdd(name) {
  const pw = await ensurePassword();
  if (!pw) return;

  if (!name) {
    console.log(`${c.yellow}Usage: add <name>${c.reset}`);
    return;
  }

  console.log(`\n${c.bold}➕ Neuen Key hinzufügen: ${name}${c.reset}`);
  console.log('='.repeat(50));

  const keyValue = await askPassword(`${c.cyan}API-Key (versteckt): ${c.reset}`);
  if (!keyValue) {
    console.log(`${c.red}❌ Kein Key eingegeben!${c.reset}`);
    return;
  }

  const service = await askQuestion(`${c.cyan}Service/Anbieter (optional): ${c.reset}`);
  const notes = await askQuestion(`${c.cyan}Notizen (optional): ${c.reset}`);

  try {
    const entry = addKey(pw, {
      name,
      key: keyValue,
      service,
      notes
    });

    console.log(`\n${c.green}✅ Key gespeichert!${c.reset}`);
    console.log(`  ${c.blue}Name:${c.reset}    ${entry.name}`);
    console.log(`  ${c.blue}ID:${c.reset}      ${entry.id}`);
    if (service) console.log(`  ${c.blue}Service:${c.reset} ${service}`);
  } catch (error) {
    console.log(`${c.red}❌ Fehler: ${error.message}${c.reset}`);
  }
}

async function handleList(args) {
  const pw = await ensurePassword();
  if (!pw) return;

  const showFull = args.includes('--full');

  try {
    const keys = listKeys(pw, { showFull });

    if (keys.length === 0) {
      console.log(`\n${c.yellow}📭 Keine Keys gespeichert.${c.reset}`);
      console.log(`${c.dim}Füge einen hinzu mit: add <name>${c.reset}`);
      return;
    }

    console.log(`\n${c.bold}🔑 Gespeicherte Keys (${keys.length})${c.reset}`);
    console.log('='.repeat(60));

    for (const key of keys) {
      console.log(`\n  ${c.cyan}${c.bold}${key.name}${c.reset}`);
      console.log(`    ${c.blue}Key:${c.reset}     ${key.key}`);
      if (key.service) console.log(`    ${c.blue}Service:${c.reset} ${key.service}`);
      if (key.notes) console.log(`    ${c.blue}Notiz:${c.reset}   ${key.notes}`);
      console.log(`    ${c.dim}Erstellt: ${new Date(key.createdAt).toLocaleDateString()}${c.reset}`);
    }

    if (!showFull) {
      console.log(`\n${c.dim}💡 Für volle Keys: list --full${c.reset}`);
      console.log(`${c.dim}💡 Für einen Key: get <name> --copy${c.reset}`);
    }
  } catch (error) {
    console.log(`${c.red}❌ Fehler: ${error.message}${c.reset}`);
  }
}

async function handleGet(args) {
  const pw = await ensurePassword();
  if (!pw) return;

  const name = args.find(a => !a.startsWith('--'));
  const copy = args.includes('--copy');

  if (!name) {
    console.log(`${c.yellow}Usage: get <name> [--copy]${c.reset}`);
    return;
  }

  try {
    const entry = getKey(pw, name);

    console.log(`\n${c.bold}🔑 ${entry.name}${c.reset}`);
    console.log('='.repeat(50));
    console.log(`  ${c.blue}Key:${c.reset}     ${c.bold}${entry.key}${c.reset}`);
    if (entry.service) console.log(`  ${c.blue}Service:${c.reset} ${entry.service}`);
    if (entry.notes) console.log(`  ${c.blue}Notiz:${c.reset}   ${entry.notes}`);

    if (copy) {
      const success = await copyToClipboard(entry.key);
      if (success) {
        console.log(`\n${c.green}📋 In Zwischenablage kopiert!${c.reset}`);
      } else {
        console.log(`\n${c.yellow}⚠️  Clipboard-Zugriff fehlgeschlagen${c.reset}`);
      }
    }
  } catch (error) {
    console.log(`${c.red}❌ Fehler: ${error.message}${c.reset}`);
  }
}

async function handleSearch(query) {
  const pw = await ensurePassword();
  if (!pw) return;

  if (!query) {
    console.log(`${c.yellow}Usage: search <query>${c.reset}`);
    return;
  }

  try {
    const results = searchKeys(pw, query);

    if (results.length === 0) {
      console.log(`\n${c.yellow}📭 Keine Treffer für "${query}"${c.reset}`);
      return;
    }

    console.log(`\n${c.bold}🔍 Suchergebnisse (${results.length}):${c.reset}`);
    console.log('='.repeat(50));

    for (const key of results) {
      console.log(`\n  ${c.cyan}${key.name}${c.reset}  ${c.dim}${key.key}${c.reset}`);
      if (key.service) console.log(`    Service: ${key.service}`);
    }
  } catch (error) {
    console.log(`${c.red}❌ Fehler: ${error.message}${c.reset}`);
  }
}

async function handleUpdate(name) {
  const pw = await ensurePassword();
  if (!pw) return;

  if (!name) {
    console.log(`${c.yellow}Usage: update <name>${c.reset}`);
    return;
  }

  try {
    // Prüfen ob Key existiert
    const existing = getKey(pw, name);

    console.log(`\n${c.bold}✏️  Key aktualisieren: ${existing.name}${c.reset}`);
    console.log('='.repeat(50));
    console.log(`${c.dim}Leer lassen = nicht ändern${c.reset}\n`);

    const newName = await askQuestion(`${c.cyan}Neuer Name [${existing.name}]: ${c.reset}`);
    const newKey = await askPassword(`${c.cyan}Neuer Key (versteckt) [Enter=behalten]: ${c.reset}`);
    const newService = await askQuestion(`${c.cyan}Service [${existing.service || '-'}]: ${c.reset}`);
    const newNotes = await askQuestion(`${c.cyan}Notiz [${existing.notes || '-'}]: ${c.reset}`);

    const updates = {};
    if (newName) updates.name = newName;
    if (newKey) updates.key = newKey;
    if (newService) updates.service = newService;
    if (newNotes) updates.notes = newNotes;

    if (Object.keys(updates).length === 0) {
      console.log(`${c.yellow}Keine Änderungen.${c.reset}`);
      return;
    }

    const updated = updateKey(pw, name, updates);
    console.log(`\n${c.green}✅ Aktualisiert: ${updated.name}${c.reset}`);
  } catch (error) {
    console.log(`${c.red}❌ Fehler: ${error.message}${c.reset}`);
  }
}

async function handleDelete(name) {
  const pw = await ensurePassword();
  if (!pw) return;

  if (!name) {
    console.log(`${c.yellow}Usage: delete <name>${c.reset}`);
    return;
  }

  try {
    const entry = getKey(pw, name);
    console.log(`\n${c.yellow}⚠️  Key löschen: ${entry.name}?${c.reset}`);
    const confirm = await askQuestion(`${c.cyan}(j/n): ${c.reset}`);

    if (confirm.toLowerCase() !== 'j' && confirm.toLowerCase() !== 'ja' && confirm.toLowerCase() !== 'y') {
      console.log(`${c.yellow}Abgebrochen.${c.reset}`);
      return;
    }

    deleteKey(pw, name);
    console.log(`${c.green}✅ Key "${entry.name}" gelöscht.${c.reset}`);
  } catch (error) {
    console.log(`${c.red}❌ Fehler: ${error.message}${c.reset}`);
  }
}

async function handleExport(file) {
  const pw = await ensurePassword();
  if (!pw) return;

  if (!file) {
    console.log(`${c.yellow}Usage: export <datei>${c.reset}`);
    return;
  }

  try {
    const backup = exportVault(pw);
    const outputPath = path.resolve(file);
    fs.writeFileSync(outputPath, backup, { mode: 0o600 });

    console.log(`\n${c.green}✅ Backup erstellt: ${outputPath}${c.reset}`);
    console.log(`${c.dim}Das Backup ist mit demselben Master-Passwort verschlüsselt.${c.reset}`);
  } catch (error) {
    console.log(`${c.red}❌ Fehler: ${error.message}${c.reset}`);
  }
}

async function handleImport(args) {
  const pw = await ensurePassword();
  if (!pw) return;

  const file = args.find(a => !a.startsWith('--'));
  const merge = args.includes('--merge');

  if (!file) {
    console.log(`${c.yellow}Usage: import <datei> [--merge]${c.reset}`);
    console.log(`${c.dim}--merge: Keys hinzufügen statt ersetzen${c.reset}`);
    return;
  }

  try {
    const inputPath = path.resolve(file);
    if (!fs.existsSync(inputPath)) {
      console.log(`${c.red}❌ Datei nicht gefunden: ${inputPath}${c.reset}`);
      return;
    }

    const backup = fs.readFileSync(inputPath, 'utf8');
    const count = importVault(pw, backup, { merge });

    console.log(`\n${c.green}✅ Import erfolgreich!${c.reset}`);
    console.log(`  ${c.blue}${count}${c.reset} Keys importiert${merge ? ' (gemerged)' : ''}`);
  } catch (error) {
    console.log(`${c.red}❌ Fehler: ${error.message}${c.reset}`);
  }
}

function handleLock() {
  sessionPassword = null;
  console.log(`${c.green}🔒 Session gesperrt.${c.reset}`);
  console.log(`${c.dim}Beim nächsten Befehl wird das Passwort erneut abgefragt.${c.reset}`);
}

function handlePath() {
  console.log(`\n${c.bold}📁 Vault-Speicherort${c.reset}`);
  console.log('='.repeat(50));
  console.log(`  ${getVaultPath()}`);
  console.log(`\n${c.dim}Der Ordner ist nur für deinen Benutzer zugänglich (chmod 700).${c.reset}`);
}

// ============================================================
// MAIN
// ============================================================

async function handleCommand(input) {
  const parts = input.trim().split(/\s+/);
  const cmd = parts[0]?.toLowerCase();
  const args = parts.slice(1);

  try {
    switch (cmd) {
      case 'init': await handleInit(); break;
      case 'add': await handleAdd(args[0]); break;
      case 'list': case 'ls': await handleList(args); break;
      case 'get': await handleGet(args); break;
      case 'search': await handleSearch(args[0]); break;
      case 'update': case 'edit': await handleUpdate(args[0]); break;
      case 'delete': case 'del': case 'rm': await handleDelete(args[0]); break;
      case 'export': await handleExport(args[0]); break;
      case 'import': await handleImport(args); break;
      case 'lock': handleLock(); break;
      case 'path': handlePath(); break;
      case 'help': case 'h': showHelp(); break;
      case 'exit': case 'quit': case 'q':
        console.log(`${c.bold}👋 Tschüss!${c.reset}`);
        process.exit(0);
      case '':
        break;
      default:
        console.log(`${c.red}❌ Unbekannter Befehl: ${cmd}${c.reset}`);
        console.log(`${c.yellow}💡 Tippe 'help' für Hilfe${c.reset}`);
    }
  } catch (error) {
    console.log(`${c.red}❌ Fehler: ${error.message}${c.reset}`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  // Wenn Argumente übergeben wurden → direkt ausführen und beenden
  if (args.length > 0) {
    showBanner();
    await handleCommand(args.join(' '));
    rl.close();
    process.exit(0);
  }

  // Sonst: interaktiver Modus
  showBanner();
  showHelp();

  const exists = vaultExists();
  if (!exists) {
    console.log(`\n${c.yellow}⚠️  Noch kein Vault vorhanden.${c.reset}`);
    console.log(`${c.dim}Erstelle einen mit: init${c.reset}`);
  } else {
    console.log(`\n${c.green}✅ Vault gefunden${c.reset}`);
    console.log(`${c.dim}Speicherort: ${getVaultPath()}${c.reset}`);
  }

  console.log('\n' + '─'.repeat(50));

  process.stdout.write(`\n${c.magenta}vault${c.reset}> `);

  rl.on('line', async (input) => {
    await handleCommand(input);
    process.stdout.write(`\n${c.magenta}vault${c.reset}> `);
  });

  rl.on('close', () => {
    console.log(`\n${c.bold}👋 Tschüss!${c.reset}`);
    process.exit(0);
  });
}

main().catch(error => {
  console.log(`${c.red}❌ Fehler: ${error.message}${c.reset}`);
  process.exit(1);
});