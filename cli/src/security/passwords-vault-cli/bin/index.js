#!/usr/bin/env node

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  vaultExists,
  createVault,
  addPassword,
  listPasswords,
  getPassword,
  deletePassword,
  updatePassword,
  searchPasswords,
  getCategories,
  addCategory,
  getStats,
  exportVault,
  importVault,
  getVaultPath
} from '../lib/vault.js';
import { generatePassword, calculateStrength } from '../lib/crypto.js';

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

let sessionPassword = null;

// ============================================================
// BANNER & HELP
// ============================================================

function showBanner() {
  console.log(`
${c.bold}${c.magenta}╔═══════════════════════════════════════════════════════════════════╗
║              🔐 Password Vault - Sicher & Einfach                ║
║        Passwörter speichern • anzeigen • generieren • nutzen     ║
╚═══════════════════════════════════════════════════════════════════╝${c.reset}
`);
}

function showHelp() {
  console.log(`
${c.bold}Commands:${c.reset}
  ${c.green}init${c.reset}                          - Vault erstellen (einmalig)
  ${c.green}add${c.reset} <name>                    - Neuen Eintrag hinzufügen
  ${c.green}list${c.reset} [--full] [--cat <kat>]   - Alle Einträge anzeigen
  ${c.green}get${c.reset} <name> [--copy]           - Passwort anzeigen (+ Clipboard)
  ${c.green}search${c.reset} <query>                - Einträge durchsuchen
  ${c.green}update${c.reset} <name>                 - Eintrag bearbeiten
  ${c.green}delete${c.reset} <name>                 - Eintrag löschen
  ${c.green}gen${c.reset} [length] [optionen]       - Passwort generieren
  ${c.green}stats${c.reset}                         - Statistiken + schwache Passwörter
  ${c.green}categories${c.reset}                    - Alle Kategorien anzeigen
  ${c.green}addcat${c.reset} <name>                 - Neue Kategorie
  ${c.green}export${c.reset} <datei>                - Backup erstellen
  ${c.green}import${c.reset} <datei> [--merge]      - Backup einspielen
  ${c.green}lock${c.reset}                          - Session sperren
  ${c.green}path${c.reset}                          - Vault-Speicherort anzeigen
  ${c.green}help${c.reset}                          - Zeigt diese Hilfe
  ${c.green}exit${c.reset}                          - Beendet

${c.bold}Gen-Optionen:${c.reset}
  ${c.cyan}--no-symbols${c.reset}  - Keine Sonderzeichen
  ${c.cyan}--no-numbers${c.reset}  - Keine Zahlen
  ${c.cyan}--no-upper${c.reset}    - Keine Großbuchstaben

${c.bold}Beispiele:${c.reset}
  passvault init
  passvault add github
  passvault gen 24
  passvault get github --copy
  passvault list --cat Social
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
        process.stdout.write('\n');
        process.exit(0);
      } else if (char === '\u007f' || char === '\b') {
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

async function askVisible(prompt) {
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
    console.log(`${c.dim}Erstelle zuerst einen mit: passvault init${c.reset}`);
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
// STÄRKE-ANZEIGE
// ============================================================

function showStrength(password) {
  const strength = calculateStrength(password);
  const colorMap = { green: c.green, yellow: c.yellow, red: c.red };
  const color = colorMap[strength.color] || c.reset;
  const barLength = 20;
  const filled = Math.round((strength.score / 100) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  console.log(`  ${c.blue}Stärke:${c.reset}   ${color}[${bar}] ${strength.score}/100 (${strength.label})${c.reset}`);
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
  console.log(`${c.dim}Das Master-Passwort schützt alle deine Passwörter.${c.reset}`);
  console.log(`${c.dim}⚠️  Wenn du es vergisst, sind alle Passwörter verloren!${c.reset}\n`);

  const pw1 = await askPassword(`${c.cyan}Master-Passwort: ${c.reset}`);
  if (pw1.length < 8) {
    console.log(`${c.red}❌ Passwort muss mindestens 8 Zeichen haben!${c.reset}`);
    return;
  }

  const strength = calculateStrength(pw1);
  console.log(`  ${c.blue}Stärke:${c.reset}  ${strength.label} (${strength.score}/100)`);

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

  console.log(`\n${c.bold}➕ Neuen Eintrag hinzufügen: ${name}${c.reset}`);
  console.log('='.repeat(50));

  const username = await askVisible(`${c.cyan}Benutzername/E-Mail: ${c.reset}`);
  const url = await askVisible(`${c.cyan}URL (optional): ${c.reset}`);

  // Kategorie
  const cats = getCategories(pw);
  console.log(`${c.dim}Kategorien: ${cats.join(', ')}${c.reset}`);
  const category = await askVisible(`${c.cyan}Kategorie [Allgemein]: ${c.reset}`) || 'Allgemein';

  // Passwort: eingeben oder generieren?
  console.log(`\n${c.yellow}Passwort eingeben oder generieren?${c.reset}`);
  console.log(`  ${c.dim}[1] Manuell eingeben${c.reset}`);
  console.log(`  ${c.dim}[2] Generieren lassen (20 Zeichen)${c.reset}`);
  const choice = await askVisible(`${c.cyan}Wahl [1]: ${c.reset}`) || '1';

  let password;
  if (choice === '2') {
    password = generatePassword(20);
    console.log(`\n${c.green}✨ Generiertes Passwort:${c.reset}`);
    console.log(`  ${c.bold}${password}${c.reset}\n`);
    showStrength(password);
    const ok = await askVisible(`${c.cyan}Übernehmen? (j/n) [j]: ${c.reset}`) || 'j';
    if (ok.toLowerCase() !== 'j' && ok.toLowerCase() !== 'ja' && ok.toLowerCase() !== 'y') {
      console.log(`${c.yellow}Abgebrochen.${c.reset}`);
      return;
    }
  } else {
    password = await askPassword(`${c.cyan}Passwort (versteckt): ${c.reset}`);
    if (!password) {
      console.log(`${c.red}❌ Kein Passwort eingegeben!${c.reset}`);
      return;
    }
    showStrength(password);
  }

  const notes = await askVisible(`${c.cyan}Notizen (optional): ${c.reset}`);

  try {
    const entry = addPassword(pw, {
      name,
      username,
      password,
      url,
      category,
      notes
    });

    console.log(`\n${c.green}✅ Eintrag gespeichert!${c.reset}`);
    console.log(`  ${c.blue}Name:${c.reset}      ${entry.name}`);
    console.log(`  ${c.blue}User:${c.reset}      ${entry.username || '-'}`);
    console.log(`  ${c.blue}Kategorie:${c.reset} ${entry.category}`);
    if (url) console.log(`  ${c.blue}URL:${c.reset}       ${url}`);
  } catch (error) {
    console.log(`${c.red}❌ Fehler: ${error.message}${c.reset}`);
  }
}

async function handleList(args) {
  const pw = await ensurePassword();
  if (!pw) return;

  const showFull = args.includes('--full');
  let category = null;
  const catIdx = args.indexOf('--cat');
  if (catIdx !== -1) category = args[catIdx + 1];

  try {
    const entries = listPasswords(pw, { showFull, category });

    if (entries.length === 0) {
      console.log(`\n${c.yellow}📭 Keine Einträge${category ? ` in Kategorie "${category}"` : ''}.${c.reset}`);
      return;
    }

    console.log(`\n${c.bold}🔑 Gespeicherte Passwörter (${entries.length})${category ? ` - ${category}` : ''}${c.reset}`);
    console.log('='.repeat(60));

    // Gruppieren nach Kategorie
    const grouped = {};
    for (const entry of entries) {
      if (!grouped[entry.category]) grouped[entry.category] = [];
      grouped[entry.category].push(entry);
    }

    for (const [cat, items] of Object.entries(grouped)) {
      console.log(`\n${c.magenta}${c.bold}📁 ${cat}${c.reset}`);
      for (const item of items) {
        console.log(`  ${c.cyan}${item.name}${c.reset}`);
        console.log(`    ${c.dim}User: ${item.username || '-'}${c.reset}`);
        console.log(`    ${c.dim}Pw:   ${item.password}${c.reset}`);
        if (item.url) console.log(`    ${c.dim}URL:  ${item.url}${c.reset}`);
      }
    }

    if (!showFull) {
      console.log(`\n${c.dim}💡 Für volle Passwörter: list --full${c.reset}`);
      console.log(`${c.dim}💡 Für einen Eintrag: get <name> --copy${c.reset}`);
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
    const entry = getPassword(pw, name, { updateLastUsed: true });

    console.log(`\n${c.bold}🔑 ${entry.name}${c.reset}`);
    console.log('='.repeat(50));
    if (entry.username) console.log(`  ${c.blue}Benutzer:${c.reset}  ${entry.username}`);
    console.log(`  ${c.blue}Passwort:${c.reset}  ${c.bold}${entry.password}${c.reset}`);
    if (entry.url) console.log(`  ${c.blue}URL:${c.reset}       ${entry.url}`);
    console.log(`  ${c.blue}Kategorie:${c.reset} ${entry.category}`);
    if (entry.notes) console.log(`  ${c.blue}Notiz:${c.reset}     ${entry.notes}`);
    console.log(`  ${c.dim}Erstellt:  ${new Date(entry.createdAt).toLocaleDateString()}${c.reset}`);
    if (entry.lastUsed) console.log(`  ${c.dim}Zuletzt:   ${new Date(entry.lastUsed).toLocaleString()}${c.reset}`);

    showStrength(entry.password);

    if (copy) {
      const success = await copyToClipboard(entry.password);
      if (success) {
        console.log(`\n${c.green}📋 Passwort in Zwischenablage kopiert!${c.reset}`);
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
    const results = searchPasswords(pw, query);

    if (results.length === 0) {
      console.log(`\n${c.yellow}📭 Keine Treffer für "${query}"${c.reset}`);
      return;
    }

    console.log(`\n${c.bold}🔍 Suchergebnisse (${results.length}):${c.reset}`);
    console.log('='.repeat(50));

    for (const entry of results) {
      console.log(`\n  ${c.cyan}${entry.name}${c.reset}  ${c.dim}(${entry.category})${c.reset}`);
      if (entry.username) console.log(`    User: ${entry.username}`);
      if (entry.url) console.log(`    URL:  ${entry.url}`);
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
    const existing = getPassword(pw, name);

    console.log(`\n${c.bold}✏️  Eintrag bearbeiten: ${existing.name}${c.reset}`);
    console.log('='.repeat(50));
    console.log(`${c.dim}Leer lassen = nicht ändern${c.reset}\n`);

    const newName = await askVisible(`${c.cyan}Name [${existing.name}]: ${c.reset}`);
    const newUser = await askVisible(`${c.cyan}Benutzer [${existing.username || '-'}]: ${c.reset}`);
    const newPw = await askPassword(`${c.cyan}Passwort (versteckt) [Enter=behalten]: ${c.reset}`);
    const newUrl = await askVisible(`${c.cyan}URL [${existing.url || '-'}]: ${c.reset}`);
    const newCat = await askVisible(`${c.cyan}Kategorie [${existing.category}]: ${c.reset}`);
    const newNotes = await askVisible(`${c.cyan}Notiz [${existing.notes || '-'}]: ${c.reset}`);

    const updates = {};
    if (newName) updates.name = newName;
    if (newUser) updates.username = newUser;
    if (newPw) updates.password = newPw;
    if (newUrl) updates.url = newUrl;
    if (newCat) updates.category = newCat;
    if (newNotes) updates.notes = newNotes;

    if (Object.keys(updates).length === 0) {
      console.log(`${c.yellow}Keine Änderungen.${c.reset}`);
      return;
    }

    const updated = updatePassword(pw, name, updates);
    console.log(`\n${c.green}✅ Aktualisiert: ${updated.name}${c.reset}`);
    if (newPw) showStrength(newPw);
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
    const entry = getPassword(pw, name);
    console.log(`\n${c.yellow}⚠️  Eintrag löschen: ${entry.name}?${c.reset}`);
    const confirm = await askVisible(`${c.cyan}(j/n): ${c.reset}`);

    if (confirm.toLowerCase() !== 'j' && confirm.toLowerCase() !== 'ja' && confirm.toLowerCase() !== 'y') {
      console.log(`${c.yellow}Abgebrochen.${c.reset}`);
      return;
    }

    deletePassword(pw, name);
    console.log(`${c.green}✅ Eintrag "${entry.name}" gelöscht.${c.reset}`);
  } catch (error) {
    console.log(`${c.red}❌ Fehler: ${error.message}${c.reset}`);
  }
}

async function handleGen(args) {
  const length = parseInt(args.find(a => !a.startsWith('--'))) || 20;
  const noSymbols = args.includes('--no-symbols');
  const noNumbers = args.includes('--no-numbers');
  const noUpper = args.includes('--no-upper');

  try {
    const password = generatePassword(length, {
      symbols: !noSymbols,
      numbers: !noNumbers,
      uppercase: !noUpper
    });

    console.log(`\n${c.bold}✨ Generiertes Passwort (${length} Zeichen)${c.reset}`);
    console.log('='.repeat(50));
    console.log(`\n  ${c.bold}${c.green}${password}${c.reset}\n`);
    showStrength(password);

    console.log(`\n${c.dim}💡 Kopieren mit: get <name> --copy${c.reset}`);
  } catch (error) {
    console.log(`${c.red}❌ Fehler: ${error.message}${c.reset}`);
  }
}

async function handleStats() {
  const pw = await ensurePassword();
  if (!pw) return;

  try {
    const stats = getStats(pw);

    console.log(`\n${c.bold}📊 Statistiken${c.reset}`);
    console.log('='.repeat(50));
    console.log(`  ${c.blue}Einträge:${c.reset}           ${stats.total}`);
    console.log(`  ${c.blue}Mit Benutzername:${c.reset}   ${stats.withUsername}`);
    console.log(`  ${c.blue}Mit URL:${c.reset}            ${stats.withUrl}`);
    console.log(`  ${c.blue}Kategorien:${c.reset}         ${stats.categories}`);

    if (Object.keys(stats.byCategory).length > 0) {
      console.log(`\n  ${c.bold}Nach Kategorie:${c.reset}`);
      for (const [cat, count] of Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])) {
        console.log(`    ${cat}: ${count}`);
      }
    }

    if (stats.weakPasswords.length > 0) {
      console.log(`\n  ${c.yellow}⚠️  Schwache Passwörter (${stats.weakPasswords.length}):${c.reset}`);
      stats.weakPasswords.forEach(name => {
        console.log(`    ${c.red}•${c.reset} ${name}`);
      });
      console.log(`\n  ${c.dim}💡 Empfehlung: Diese mit "update <name>" ändern${c.reset}`);
    } else {
      console.log(`\n  ${c.green}✅ Alle Passwörter stark genug!${c.reset}`);
    }
  } catch (error) {
    console.log(`${c.red}❌ Fehler: ${error.message}${c.reset}`);
  }
}

async function handleCategories() {
  const pw = await ensurePassword();
  if (!pw) return;

  try {
    const cats = getCategories(pw);
    const stats = getStats(pw);

    console.log(`\n${c.bold}📁 Kategorien${c.reset}`);
    console.log('='.repeat(50));
    cats.forEach(cat => {
      const count = stats.byCategory[cat] || 0;
      console.log(`  ${c.cyan}${cat}${c.reset} (${count} Einträge)`);
    });
  } catch (error) {
    console.log(`${c.red}❌ Fehler: ${error.message}${c.reset}`);
  }
}

async function handleAddCat(name) {
  const pw = await ensurePassword();
  if (!pw) return;

  if (!name) {
    console.log(`${c.yellow}Usage: addcat <name>${c.reset}`);
    return;
  }

  try {
    addCategory(pw, name);
    console.log(`${c.green}✅ Kategorie "${name}" hinzugefügt.${c.reset}`);
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
    console.log(`  ${c.blue}${count}${c.reset} Einträge importiert${merge ? ' (gemerged)' : ''}`);
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
      case 'gen': case 'generate': await handleGen(args); break;
      case 'stats': await handleStats(); break;
      case 'categories': case 'cats': await handleCategories(); break;
      case 'addcat': await handleAddCat(args[0]); break;
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

  if (args.length > 0) {
    showBanner();
    await handleCommand(args.join(' '));
    rl.close();
    process.exit(0);
  }

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

  process.stdout.write(`\n${c.magenta}passvault${c.reset}> `);

  rl.on('line', async (input) => {
    await handleCommand(input);
    process.stdout.write(`\n${c.magenta}passvault${c.reset}> `);
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