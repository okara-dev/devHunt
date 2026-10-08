#!/usr/bin/env node

import {
  isWingetAvailable,
  listWingetUpdates,
  upgradeAllWinget
} from '../lib/winget.js';
import {
  listWindowsUpdates,
  installWindowsUpdates
} from '../lib/windows-update.js';
import { ask, closePrompt } from '../lib/prompt.js';

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

// ============================================================
// BANNER
// ============================================================

function showBanner() {
  console.log(`
${c.bold}${c.cyan}╔═══════════════════════════════════════════════════════════════╗
║              🔄 Update Checker - Windows Updates             ║
║         Prüft und installiert verfügbare Updates             ║
╚═══════════════════════════════════════════════════════════════╝${c.reset}
`);
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================================
// WINGET UPDATES
// ============================================================

async function handleWingetUpdates() {
  console.log(`\n${c.bold}📦 Prüfe winget-Updates...${c.reset}`);

  const available = await isWingetAvailable();
  if (!available) {
    console.log(`${c.yellow}⚠️  winget ist nicht verfügbar (Windows 10 1809+ benötigt)${c.reset}`);
    return { count: 0, updates: [] };
  }

  console.log(`${c.dim}⏳ Lade Updates (kann dauern)...${c.reset}`);
  const updates = await listWingetUpdates();

  if (updates.length === 0) {
    console.log(`${c.green}✅ Keine winget-Updates verfügbar${c.reset}`);
    return { count: 0, updates: [] };
  }

  console.log(`\n${c.bold}📦 winget-Updates (${updates.length}):${c.reset}`);
  console.log('─'.repeat(70));
  console.log(`${c.dim}${'Name'.padEnd(35)} ${'Version'.padEnd(15)} ${'Verfügbar'.padEnd(15)}${c.reset}`);
  console.log('─'.repeat(70));

  for (const update of updates) {
    const name = update.name.length > 33 ? update.name.substring(0, 33) + '…' : update.name;
    console.log(`  ${c.cyan}${name.padEnd(35)}${c.reset} ${update.version.padEnd(15)} ${c.green}${update.available.padEnd(15)}${c.reset}`);
  }
  console.log('─'.repeat(70));

  return { count: updates.length, updates };
}

// ============================================================
// WINDOWS UPDATES
// ============================================================

async function handleWindowsUpdates() {
  console.log(`\n${c.bold}🪟 Prüfe Windows-Updates...${c.reset}`);

  console.log(`${c.dim}⏳ Suche nach Updates (kann dauern)...${c.reset}`);
  const result = await listWindowsUpdates();

  if (result.error) {
    console.log(`${c.yellow}⚠️  Windows Update API: ${result.error.substring(0, 100)}${c.reset}`);
    return { count: 0, updates: [] };
  }

  if (!result.updates || result.updates.length === 0) {
    console.log(`${c.green}✅ Keine Windows-Updates verfügbar${c.reset}`);
    return { count: 0, updates: [] };
  }

  console.log(`\n${c.bold}🪟 Windows-Updates (${result.updates.length}):${c.reset}`);
  console.log('─'.repeat(70));

  for (const update of result.updates) {
    console.log(`  ${c.magenta}•${c.reset} ${c.bold}${update.title}${c.reset}`);
    if (update.sizeMb && update.sizeMb !== '0.00') {
      console.log(`    ${c.dim}Größe: ${update.sizeMb} MB${update.rebootRequired ? ' | Neustart erforderlich' : ''}${c.reset}`);
    }
  }
  console.log('─'.repeat(70));

  return { count: result.updates.length, updates: result.updates };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  showBanner();

  // 1. Updates prüfen (beide Quellen)
  const wingetResult = await handleWingetUpdates();
  const windowsResult = await handleWindowsUpdates();

  const totalUpdates = wingetResult.count + windowsResult.count;

  // 2. Zusammenfassung
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${c.bold}📊 ZUSAMMENFASSUNG${c.reset}`);
  console.log('='.repeat(70));

  if (totalUpdates === 0) {
    console.log(`\n${c.green}${c.bold}✅ Dein System ist auf dem neuesten Stand!${c.reset}`);
    console.log(`${c.dim}Keine Updates verfügbar.${c.reset}\n`);
    closePrompt();
    process.exit(0);
  }

  console.log(`\n${c.yellow}${c.bold}📦 ${totalUpdates} Update(s) verfügbar:${c.reset}`);
  if (wingetResult.count > 0) {
    console.log(`   • ${wingetResult.count} winget-Update(s)`);
  }
  if (windowsResult.count > 0) {
    console.log(`   • ${windowsResult.count} Windows-Update(s)`);
  }

  // 3. Nach Bestätigung fragen
  console.log(`\n${c.bold}${c.yellow}❓ Updates durchführen? (j/n):${c.reset} `);
  const answer = await ask('');

  if (answer.toLowerCase() !== 'j' && answer.toLowerCase() !== 'ja' && answer.toLowerCase() !== 'y') {
    console.log(`\n${c.yellow}👋 Abgebrochen.${c.reset}\n`);
    closePrompt();
    process.exit(0);
  }

  // 4. Updates durchführen
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🚀 Starte Updates...`);
  console.log('='.repeat(70));

  // 4a. Winget-Updates
  if (wingetResult.count > 0) {
    console.log(`\n${c.bold}📦 Führe winget-Updates durch...${c.reset}`);
    const wingetResult2 = await upgradeAllWinget();

    if (wingetResult2.success) {
      console.log(`${c.green}✅ winget-Updates abgeschlossen${c.reset}`);
    } else {
      console.log(`${c.red}❌ winget-Updates fehlgeschlagen: ${wingetResult2.errors.substring(0, 200)}${c.reset}`);
    }
  }

  // 4b. Windows-Updates
  if (windowsResult.count > 0) {
    console.log(`\n${c.bold}🪟 Führe Windows-Updates durch...${c.reset}`);
    console.log(`${c.dim}⏳ Dies kann mehrere Minuten dauern...${c.reset}`);
    const winResult = await installWindowsUpdates();

    if (winResult.success) {
      console.log(`${c.green}✅ Windows-Updates abgeschlossen${c.reset}`);
      if (winResult.rebootRequired) {
        console.log(`\n${c.yellow}${c.bold}⚠️  NEUSTART ERFORDERLICH!${c.reset}`);
        console.log(`${c.dim}Bitte starte deinen PC neu, um die Updates abzuschließen.${c.reset}`);
      }
    } else {
      console.log(`${c.red}❌ Windows-Updates fehlgeschlagen: ${winResult.error.substring(0, 200)}${c.reset}`);
    }
  }

  // 5. Abschluss
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🎉 FERTIG!`);
  console.log('='.repeat(70));
  console.log(`\n${c.green}✅ Alle Updates durchgeführt.${c.reset}`);
  console.log(`${c.dim}Einige Updates benötigen möglicherweise einen Neustart.${c.reset}\n`);

  closePrompt();
  process.exit(0);
}

// ============================================================
// START
// ============================================================

process.on('SIGINT', () => {
  console.log(`\n\n👋 Bis bald!`);
  closePrompt();
  process.exit(0);
});

main().catch(error => {
  console.log(`${c.red}❌ Fehler: ${error.message}${c.reset}`);
  closePrompt();
  process.exit(1);
});