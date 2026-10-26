#!/usr/bin/env node

import readline from 'readline';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  cleanScreenshots,
  cleanDownloads,
  emptyRecycleBin,
  cleanTemp,
  getFolderSize,
  formatBytes
} from '../lib/cleaner.js';
import {
  findLargeFiles,
  findDuplicates,
  cleanBrowserCaches
} from '../lib/analyzer.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const c = {
  reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', red: '\x1b[31m', cyan: '\x1b[36m',
  magenta: '\x1b[35m', bold: '\x1b[1m', dim: '\x1b[2m'
};

function ask(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer.trim()));
  });
}

function showBanner() {
  console.log(`
${c.bold}${c.cyan}╔═══════════════════════════════════════════════════════════════╗
║              🧹 PC Cleaner & Analyzer                         ║
╚═══════════════════════════════════════════════════════════════╝${c.reset}
`);
}

async function main() {
  showBanner();

  const userHome = os.homedir();
  
  // 1. Analyse-Phase
  console.log(`${c.bold}📊 Analysiere deinen PC...${c.reset}\n`);

  const screenshotSize = getFolderSize(path.join(userHome, 'Pictures', 'Screenshots'));
  const downloadsSize = getFolderSize(path.join(userHome, 'Downloads'));
  const tempSize = getFolderSize(os.tmpdir());

  console.log(`  ${c.blue}Screenshots:${c.reset}  ${formatBytes(screenshotSize)}`);
  console.log(`  ${c.blue}Downloads:${c.reset}    ${formatBytes(downloadsSize)}`);
  console.log(`  ${c.blue}Temp-Dateien:${c.reset} ${formatBytes(tempSize)}`);
  
  console.log(`\n${c.yellow}⚠️  ACHTUNG:${c.reset} Downloads werden GELÖSCHT (nicht in den Papierkorb).\n`);

  // 2. Bestätigung für Standard-Reinigung
  const answer = await ask(`${c.bold}${c.yellow}❓ Standard-Aufräumen (Screenshots, Downloads, Temp, Papierkorb) starten? (j/n): ${c.reset}`);

  if (answer.toLowerCase() === 'j' || answer.toLowerCase() === 'ja') {
    console.log(`\n${'='.repeat(60)}\n🚀 Starte Standard-Aufräumen...\n${'='.repeat(60)}`);

    console.log(`\n${c.bold}📸 Lösche Screenshots...${c.reset}`);
    const sRes = await cleanScreenshots();
    console.log(sRes.deleted > 0 ? `   ${c.green}✅ ${sRes.deleted} Datei(en) gelöscht${c.reset}` : `   ${c.dim}📭 Keine gefunden.${c.reset}`);

    console.log(`\n${c.bold}📥 Lösche Downloads...${c.reset}`);
    const dRes = await cleanDownloads();
    console.log(dRes.deleted > 0 ? `   ${c.green}✅ ${dRes.deleted} Datei(en) gelöscht${c.reset}` : `   ${c.dim}📭 Keine gefunden.${c.reset}`);

    console.log(`\n${c.bold}🗑️  Leere Temp-Ordner...${c.reset}`);
    const tRes = await cleanTemp();
    console.log(tRes.deleted > 0 ? `   ${c.green}✅ ${tRes.deleted} Datei(en) gelöscht${c.reset}` : `   ${c.dim}📭 Bereits leer.${c.reset}`);

    console.log(`\n${c.bold}♻️  Leere Papierkorb...${c.reset}`);
    const rRes = await emptyRecycleBin();
    console.log(rRes.success ? `   ${c.green}✅ Papierkorb geleert${c.reset}` : `   ${c.red}❌ ${rRes.message}${c.reset}`);
  } else {
    console.log(`\n${c.yellow}⏭️  Standard-Aufräumen übersprungen.${c.reset}`);
  }

  // 3. Tiefen-Analyse (Neue Features)
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${c.bold}🔍 Tiefen-Analyse${c.reset}`);
  console.log('='.repeat(60));

  const deepAnswer = await ask(`\n${c.cyan}Möchtest du nach großen Dateien & Duplikaten suchen? (j/n): ${c.reset}`);
  
  if (deepAnswer.toLowerCase() === 'j' || deepAnswer.toLowerCase() === 'ja') {
    const searchPath = await ask(`In welchem Ordner suchen? (Enter = Home: ${userHome}): `);
    const targetDir = searchPath || userHome;

    // 3a. Große Dateien
    console.log(`\n${c.dim}⏳ Suche nach Dateien > 100 MB in ${targetDir}...${c.reset}`);
    const largeFiles = findLargeFiles(targetDir, 100);

    if (largeFiles.length > 0) {
      console.log(`\n${c.bold}🐘 Große Dateien (>100 MB):${c.reset}`);
      largeFiles.slice(0, 10).forEach((f, i) => {
        console.log(`  ${i + 1}. ${c.yellow}${f.sizeMB} MB${c.reset} - ${path.basename(f.path)}`);
        console.log(`     ${c.dim}${f.path}${c.reset}`);
      });
    } else {
      console.log(`  ${c.green}✅ Keine großen Dateien gefunden.${c.reset}`);
    }

    // 3b. Duplikate
    console.log(`\n${c.dim}⏳ Suche nach Duplikaten (kann dauern)...${c.reset}`);
    const duplicates = findDuplicates(targetDir);

    if (duplicates.length > 0) {
      let totalWasted = 0;
      console.log(`\n${c.bold}👯 Duplikate gefunden:${c.reset}`);
      duplicates.forEach((dup, i) => {
        const wasted = dup.size * (dup.files.length - 1);
        totalWasted += wasted;
        console.log(`\n  Gruppe ${i + 1} (${dup.sizeMB} MB pro Datei, ${dup.files.length}x):`);
        dup.files.forEach(f => console.log(`    ${c.dim}• ${f}${c.reset}`));
      });
      console.log(`\n  ${c.red}🗑️  Verschwendeter Speicherplatz: ${formatBytes(totalWasted)}${c.reset}`);
      console.log(`  ${c.dim}(Lösche Duplikate manuell, um Datenverlust zu vermeiden!)${c.reset}`);
    } else {
      console.log(`  ${c.green}✅ Keine Duplikate gefunden.${c.reset}`);
    }
  }

  // 4. Browser-Caches
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${c.bold}🌐 Browser-Caches${c.reset}`);
  console.log('='.repeat(60));

  const browserAnswer = await ask(`\n${c.cyan}Möchtest du die Browser-Caches (Chrome, Edge, Firefox) leeren? (j/n): ${c.reset}`);
  
  if (browserAnswer.toLowerCase() === 'j' || browserAnswer.toLowerCase() === 'ja') {
    console.log(`\n${c.dim}⏳ Leere Caches... (Browser sollten geschlossen sein)${c.reset}`);
    const cacheResult = await cleanBrowserCaches();
    console.log(`\n   ${c.green}✅ ${cacheResult.deletedCount} Cache-Dateien gelöscht${c.reset}`);
    console.log(`   ${c.green}💾 ${formatBytes(cacheResult.freedBytes)} freigegeben${c.reset}`);
  }

  // 5. Abschluss
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎉 FERTIG!`);
  console.log('='.repeat(60));
  console.log(`\n${c.green}Dein PC wurde erfolgreich aufgeräumt!${c.reset}\n`);

  rl.close();
  process.exit(0);
}

process.on('SIGINT', () => {
  console.log(`\n\n${c.yellow}👋 Abgebrochen.${c.reset}\n`);
  rl.close();
  process.exit(0);
});

main();