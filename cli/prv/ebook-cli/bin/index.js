#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { loadConfig } from '../lib/config.js';
import { LLMClient } from '../lib/llm-client.js';
import { EbookBuilder } from '../lib/ebook-builder.js';
import { VoxTTS } from '../lib/vox-tts.js';

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

// ============================================================
// KATEGORIEN
// ============================================================

const KATEGORIEN = {
  'Roman': {
    beschreibung: 'lange Erzählung mit komplexer Handlung und vielen Figuren',
    kapitel: 11
  },
  'Kurzgeschichte': {
    beschreibung: 'kurze Erzählung, oft ein Ausschnitt, wenig Figuren, offener Schluss',
    kapitel: 4
  },
  'Märchen': {
    beschreibung: 'fantastische Geschichte mit magischen Elementen, oft "Es war einmal …"',
    kapitel: 7
  },
  'Tragödie': {
    beschreibung: 'ernstes Drama mit tragischem Ausgang',
    kapitel: 7
  },
  'Komödie': {
    beschreibung: 'heiteres Drama mit komischem Konflikt, oft gutes Ende',
    kapitel: 7
  },
  'Sachbuch': {
    beschreibung: 'vermittelt Fakten und Wissen zu einem Thema',
    kapitel: 7
  },
  'Thriller': {
    beschreibung: 'spannungsgeladene Geschichte, oft mit Verbrechen und Gefahr',
    kapitel: 7
  },
  'Liebesroman': {
    beschreibung: 'Roman, bei dem die Liebesbeziehung im Mittelpunkt steht',
    kapitel: 7
  }
};

function ask(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer.trim()));
  });
}

function showBanner() {
  console.log(`
${c.bold}${c.magenta}╔══════════════════════════════════════════════════════════════╗
║                      📖 E-BOOK-BOT                           ║
╚══════════════════════════════════════════════════════════════╝${c.reset}
Der Bot schreibt ein ganzes Buch zu deiner gewählten Kategorie.
Du bekommst automatisch:
  - ${c.cyan}HTML-Version${c.reset} (zum Lesen im Browser)
  - ${c.cyan}MP3-Version${c.reset}  (zum Hören)
Gespeichert in einem Ordner auf deinem Desktop.
${c.magenta}╚══════════════════════════════════════════════════════════════╝${c.reset}
`);
}

function showKategorien() {
  console.log(`\n${c.bold}📚 Verfügbare Kategorien:${c.reset}\n`);
  let i = 1;
  for (const [name, info] of Object.entries(KATEGORIEN)) {
    const kapitelText = info.kapitel === 1 ? '1 Kapitel' : `${info.kapitel} Kapitel`;
    console.log(`  ${c.green}${i}.${c.reset} ${c.bold}${name}${c.reset} ${c.dim}(${kapitelText})${c.reset}`);
    console.log(`     ${c.dim}${info.beschreibung}${c.reset}\n`);
    i++;
  }
}

// ============================================================
// KI-FUNKTIONEN
// ============================================================

async function generateThema(llm, kategorie) {
  const systemPrompt = `Du bist ein kreativer Ideengeber für ${kategorie}.`;
  const userPrompt = `Denk dir ein interessantes, originelles Thema für einen ${kategorie} aus.

Der ${kategorie} ist definiert als: ${KATEGORIEN[kategorie].beschreibung}

Antworte NUR mit dem Thema in maximal 10 Wörtern.
Keine Anführungszeichen, kein Punkt am Ende.`;

  const thema = await llm.generate(systemPrompt, userPrompt, 50, 1.0);
  if (thema) {
    return thema.trim().replace(/^["'*]+|["'*.]+$/g, '');
  }
  return null;
}

async function generateKapitelGeruest(llm, kategorie, thema, anzahl) {
  const systemPrompt = `Du bist ein erfahrener Autor für ${kategorie}.`;
  
  let userPrompt;
  if (anzahl === 1) {
    userPrompt = `Plane ein ${kategorie} zum Thema "${thema}".
Gib einen einzigen fesselnden Titel für dieses Werk an.

Antworte EXAKT:
TITEL: [Dein Titel]`;
  } else {
    userPrompt = `Plane einen ${kategorie} zum Thema "${thema}".
Erstelle ein Gerüst mit ${anzahl} Kapiteln.

Antworte EXAKT:

KAPITEL 1: [Titel]
KAPITEL 2: [Titel]
...

Nur die KAPITEL-Zeilen.`;
  }

  const response = await llm.generate(systemPrompt, userPrompt, 500, 0.8);
  if (!response) return [];

  if (anzahl === 1) {
    const match = response.match(/TITEL:\s*(.+)/i);
    return match ? [match[1].trim()] : [thema];
  }

  const kapitel = [];
  for (const line of response.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.toUpperCase().startsWith('KAPITEL')) {
      const parts = trimmed.split(':');
      if (parts.length >= 2) {
        kapitel.push(parts.slice(1).join(':').trim());
      }
    }
  }
  return kapitel.slice(0, anzahl);
}

async function generateKapitelText(llm, kategorie, thema, kapitelTitel, nr, gesamt, handlung, woerter) {
  const systemPrompt = `Du bist ein begabter deutschsprachiger Autor für ${kategorie}.`;
  
  let userPrompt;
  if (gesamt === 1) {
    userPrompt = `Schreibe ein ${kategorie} zum Thema "${thema}".

Titel: ${kapitelTitel}

Anforderungen:
- Ca. ${woerter * 5} Wörter (da es nur ein Kapitel ist)
- Fesselnd, atmosphärisch
- Behandelt "${thema}" intensiv

Nur den Text.`;
  } else {
    userPrompt = `Schreibe Kapitel ${nr} von ${gesamt} eines ${kategorie} zum Thema "${thema}".

Kapitel-Titel: ${kapitelTitel}

Bisherige Handlung:
${handlung || 'Erstes Kapitel.'}

Anforderungen:
- Ca. ${woerter} Wörter
- Fesselnd, atmosphärisch
- Behandelt "${thema}" subtil
- Endet mit Cliffhanger

Nur den Kapiteltext, keine Überschrift.`;
  }

  return await llm.generate(systemPrompt, userPrompt, gesamt === 1 ? 3000 : 1200, 0.85);
}

async function generateBuchTitel(llm, kategorie, thema, kapitelTitel) {
  if (kapitelTitel.length === 1 && kapitelTitel[0] !== thema) {
    return kapitelTitel[0];
  }

  const systemPrompt = `Du bist ein kreativer Lektor für ${kategorie}.`;
  const kapitelStr = kapitelTitel.map(t => `- ${t}`).join('\n');
  const userPrompt = `Finde einen fesselnden Titel für einen ${kategorie} zum Thema "${thema}".

Kapitel:
${kapitelStr}

Der Titel soll einprägsam und 2-6 Wörter lang sein.
Antworte NUR mit dem Titel.`;

  const titel = await llm.generate(systemPrompt, userPrompt, 50, 0.9);
  if (titel) {
    return titel.trim().replace(/^["'*]+|["'*]+$/g, '');
  }
  return `${kategorie}: ${thema}`;
}

// ============================================================
// MAIN FLOW
// ============================================================

async function createEbook() {
  console.log(`${c.bold}📖 E-Book-Bot wird gestartet...${c.reset}`);
  console.log(`📅 ${new Date().toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
  console.log('-'.repeat(60));

  const config = loadConfig();
  const settings = config.settings || {};

  const llm = new LLMClient(config.groq_api_key);
  const builder = new EbookBuilder();

  showBanner();

  // Kategorie auswählen
  showKategorien();
  console.log(`${c.bold}Wähle eine Kategorie (1-${Object.keys(KATEGORIEN).length}):${c.reset}`);
  
  const katInput = await ask('> ');
  const katIndex = parseInt(katInput) - 1;
  const katNames = Object.keys(KATEGORIEN);
  
  if (isNaN(katIndex) || katIndex < 0 || katIndex >= katNames.length) {
    console.log(`${c.red}❌ Ungültige Auswahl.${c.reset}`);
    return;
  }

  const kategorie = katNames[katIndex];
  const katInfo = KATEGORIEN[kategorie];
  const kapitelAnzahl = katInfo.kapitel;

  console.log(`\n${c.green}✅ Kategorie: ${kategorie}${c.reset}`);
  console.log(`   ${c.dim}${katInfo.beschreibung}${c.reset}`);
  console.log(`   ${c.dim}Kapitel: ${kapitelAnzahl}${c.reset}`);
  console.log(`   ${c.dim}Die KI wird sich ein eigenes Thema ausdenken.${c.reset}`);

  const woerter = settings.woerter_pro_kapitel || 500;

  const confirm = await ask(`\n▶️  Buch generieren? (j/n): `);
  if (confirm.toLowerCase() !== 'j') {
    console.log(`${c.red}❌ Abgebrochen.${c.reset}`);
    return;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Generiere E-Book...`);
  console.log(`${'='.repeat(60)}`);

  // 1. KI wählt Thema
  console.log(`\n💡 Die KI wählt ein Thema...`);
  const thema = await generateThema(llm, kategorie);

  if (!thema) {
    console.log(`${c.red}❌ Thema-Generierung fehlgeschlagen.${c.reset}`);
    return;
  }
  console.log(`   ✅ Thema: "${thema}"`);

  // 2. Kapitel-Planung
  console.log(`\n📋 Plane ${kapitelAnzahl === 1 ? 'Titel' : 'Kapitel'}...`);
  const kapitelTitel = await generateKapitelGeruest(llm, kategorie, thema, kapitelAnzahl);

  if (!kapitelTitel || kapitelTitel.length === 0) {
    console.log(`${c.red}❌ Planung fehlgeschlagen.${c.reset}`);
    return;
  }
  console.log(`   ✅ ${kapitelTitel.length} ${kapitelAnzahl === 1 ? 'Titel' : 'Kapitel'} geplant`);

  // 3. Buchtitel
  console.log(`\n📖 Generiere Titel...`);
  const buchTitel = await generateBuchTitel(llm, kategorie, thema, kapitelTitel);
  console.log(`   ✅ "${buchTitel}"`);

  // 4. Text schreiben
  console.log(`\n✍️  Schreibe ${kapitelAnzahl === 1 ? 'Text' : 'Kapitel'}...`);
  const kapitelListe = [];
  let handlung = '';

  for (let i = 0; i < kapitelTitel.length; i++) {
    const titel = kapitelTitel[i];
    const label = kapitelAnzahl === 1 ? 'Text' : `Kapitel ${i + 1}/${kapitelTitel.length}`;
    console.log(`   📝 ${label}: ${titel.substring(0, 50)}...`);

    const text = await generateKapitelText(
      llm, kategorie, thema, titel, i + 1, kapitelTitel.length, handlung, woerter
    );

    if (!text) {
      console.log(`      ⚠️  Übersprungen`);
      continue;
    }

    kapitelListe.push({ titel, text });
    handlung += `\nKapitel ${i + 1}: ${text.substring(0, 300)}...`;
  }

  if (kapitelListe.length === 0) {
    console.log(`${c.red}❌ Kein Text geschrieben.${c.reset}`);
    return;
  }

  const totalWoerter = kapitelListe.reduce((sum, k) => sum + k.text.split(/\s+/).length, 0);
  console.log(`   ✅ ${kapitelListe.length} ${kapitelAnzahl === 1 ? 'Text' : 'Kapitel'}, ~${totalWoerter} Wörter`);

  // 5. HTML bauen
  console.log(`\n📚 Baue HTML...`);
  const html = builder.buildHtml(buchTitel, 'KI-Autor', kategorie, thema, kapitelListe);
  console.log(`   ✅ HTML fertig`);

  // Temporärer Ordner
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ebookbot-'));
  const safeTitle = buchTitel.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '_');

  const htmlPath = path.join(tempDir, `${safeTitle}.html`);
  const mp3Path = path.join(tempDir, `${safeTitle}.mp3`);

  const attachments = [];

  fs.writeFileSync(htmlPath, html, 'utf8');
  attachments.push(htmlPath);

  // 6. MP3 erstellen
  console.log(`\n🎙️  Erstelle Audio-Version...`);
  try {
    const vox = new VoxTTS(config);
    const fullText = vox.buildFullText(buchTitel, thema, kapitelListe);
    const mp3Result = await vox.textToSpeech(fullText, mp3Path, 'mp3');

    if (mp3Result) {
      attachments.push(mp3Result);
    }
  } catch (error) {
    if (error.message.includes('nicht gefunden')) {
      console.log(`   ❌ Vox nicht verfügbar: ${error.message}`);
    } else {
      console.log(`   ❌ Vox-Fehler: ${error.message}`);
    }
  }

  // 7. In Ordner auf dem Desktop speichern
  console.log(`\n💾 Speichere Dateien...`);

  const desktopPath = path.join(os.homedir(), 'Desktop');
  const outputFolder = path.join(desktopPath, safeTitle);

  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  for (const att of attachments) {
    const fileName = path.basename(att);
    const destPath = path.join(outputFolder, fileName);
    fs.copyFileSync(att, destPath);
  }

  // Temporären Ordner löschen
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}

  // Zusammenfassung
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎉 FERTIG!`);
  console.log(`${'='.repeat(60)}`);
  console.log(`   📖 Titel: ${buchTitel}`);
  console.log(`   📚 Kategorie: ${kategorie}`);
  console.log(`   💡 Thema: ${thema}`);
  console.log(`   📝 Kapitel: ${kapitelListe.length}`);
  console.log(`   📊 Wörter: ~${totalWoerter}`);
  console.log(`\n   📁 Gespeichert in:`);
  console.log(`      ${c.cyan}${outputFolder}${c.reset}`);
  console.log(`\n   📎 Dateien:`);
  for (const att of attachments) {
    const fileName = path.basename(att);
    const sizeMb = fs.statSync(att).size / (1024 * 1024);
    console.log(`      • ${fileName} (${sizeMb.toFixed(2)} MB)`);
  }
  console.log('');
}

// ============================================================
// START
// ============================================================

async function main() {
  if (!fs.existsSync(path.join(__dirname, '..', 'config.json'))) {
    console.log(`${c.red}❌ config.json nicht gefunden!${c.reset}`);
    process.exit(1);
  }

  try {
    await createEbook();
  } catch (error) {
    if (error.message.includes('SIGINT')) {
      console.log(`\n\n👋 Bis bald!`);
    } else {
      console.log(`${c.red}❌ Fehler: ${error.message}${c.reset}`);
    }
  }

  rl.close();
  process.exit(0);
}

process.on('SIGINT', () => {
  console.log(`\n\n👋 Bis bald!`);
  process.exit(0);
});

main();