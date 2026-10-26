#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { convertImage, getImageInfo } from '../lib/converter.js';

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
║              🖼️  Image Converter - JPG ↔ PNG                  ║
║              Einfach Bilder umwandeln!                        ║
╚═══════════════════════════════════════════════════════════════╝${c.reset}
`);
}

function showHelp() {
  console.log(`
${c.bold}Usage:${c.reset}
  ${c.green}imgconvert${c.reset} <datei> [optionen]
  ${c.green}imgconvert${c.reset} <ordner> [optionen]

${c.bold}Optionen:${c.reset}
  ${c.cyan}--to${c.reset} <jpg|png>       Ziel-Format (Standard: jpg)
  ${c.cyan}--quality${c.reset} <1-100>    Qualität für JPG (Standard: 90)
  ${c.cyan}--output${c.reset} <pfad>      Ziel-Datei oder Ziel-Ordner
  ${c.cyan}--all${c.reset}                Alle Bilder im Ordner konvertieren
  ${c.cyan}--info${c.reset}               Nur Bild-Info anzeigen (kein Konvertieren)
  ${c.cyan}--overwrite${c.reset}         Überschreiben ohne Nachfrage

${c.bold}Beispiele:${c.reset}
  imgconvert photo.png                     → photo.jpg
  imgconvert photo.jpg --to png            → photo.png
  imgconvert bild.png --quality 100        → bild.jpg (100%)
  imgconvert ./bilder --all --to png       → alle → PNG
  imgconvert foto.png --info               → nur Infos anzeigen
  imgconvert bild.png --output fertig.jpg  → eigener Name

${c.bold}Unterstützte Formate:${c.reset}
  ${c.dim}Input:${c.reset}   .jpg .jpeg .png .webp .tiff .gif .bmp .avif .heic
  ${c.dim}Output:${c.reset}  .jpg .jpeg .png
`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================================
// ARGUMENT PARSER
// ============================================================

function parseArgs(args) {
  const opts = {
    input: null,
    to: 'jpg',
    quality: 90,
    output: null,
    all: false,
    info: false,
    overwrite: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--to') {
      const val = args[i + 1]?.toLowerCase();
      if (val === 'jpg' || val === 'jpeg') opts.to = 'jpg';
      else if (val === 'png') opts.to = 'png';
      else {
        console.log(`${c.red}❌ Ungültiges Format: ${val}${c.reset}`);
        console.log(`${c.dim}Erlaubt: jpg, png${c.reset}`);
        process.exit(1);
      }
      i++;
    } else if (arg === '--quality') {
      const val = parseInt(args[i + 1]);
      if (isNaN(val) || val < 1 || val > 100) {
        console.log(`${c.red}❌ Ungültige Quality: ${args[i + 1]} (1-100)${c.reset}`);
        process.exit(1);
      }
      opts.quality = val;
      i++;
    } else if (arg === '--output') {
      opts.output = args[i + 1];
      i++;
    } else if (arg === '--all') {
      opts.all = true;
    } else if (arg === '--info') {
      opts.info = true;
    } else if (arg === '--overwrite') {
      opts.overwrite = true;
    } else if (!arg.startsWith('--')) {
      if (!opts.input) opts.input = arg;
    }
  }

  return opts;
}

// ============================================================
// BILD INFO ANZEIGEN
// ============================================================

async function showInfo(filePath) {
  try {
    const info = await getImageInfo(filePath);
    const stats = fs.statSync(filePath);

    console.log(`\n${c.bold}📷 Bild-Info: ${path.basename(filePath)}${c.reset}`);
    console.log('='.repeat(50));
    console.log(`  ${c.blue}Format:${c.reset}       ${info.format.toUpperCase()}`);
    console.log(`  ${c.blue}Größe:${c.reset}        ${info.width} × ${info.height} px`);
    console.log(`  ${c.blue}Datei-Größe:${c.reset}  ${formatBytes(stats.size)}`);
    console.log(`  ${c.blue}Kanäle:${c.reset}       ${info.channels}`);
    console.log(`  ${c.blue}Farbraum:${c.reset}     ${info.space || 'N/A'}`);
    console.log(`  ${c.blue}DPI:${c.reset}          ${info.density || 'N/A'}`);
    console.log(`  ${c.blue}Hat Alpha:${c.reset}    ${info.hasAlpha ? '✅ ja' : '❌ nein'}`);
    console.log(`  ${c.blue}Pfad:${c.reset}         ${path.resolve(filePath)}`);

    // Empfehlung für Konvertierung
    if (info.hasAlpha && info.format === 'png') {
      console.log(`\n  ${c.yellow}💡 Hinweis:${c.reset} PNG mit Transparenz → JPG verliert Alpha-Kanal!`);
    }
  } catch (error) {
    console.log(`${c.red}❌ Fehler: ${error.message}${c.reset}`);
  }
}

// ============================================================
// EINZELNES BILD KONVERTIEREN
// ============================================================

async function convertSingle(inputPath, opts) {
  // Output-Pfad bestimmen
  let outputPath = opts.output;
  if (!outputPath) {
    const dir = path.dirname(inputPath);
    const base = path.basename(inputPath, path.extname(inputPath));
    outputPath = path.join(dir, `${base}.${opts.to}`);
  }

  // Prüfen ob Input = Output (gleiche Datei)
  if (path.resolve(inputPath) === path.resolve(outputPath)) {
    console.log(`${c.red}❌ Input und Output sind die gleiche Datei!${c.reset}`);
    return { success: false };
  }

  // Prüfen ob Output bereits existiert
  if (fs.existsSync(outputPath) && !opts.overwrite) {
    console.log(`${c.yellow}⚠️  Datei existiert bereits: ${path.basename(outputPath)}${c.reset}`);
    console.log(`${c.dim}Überschreiben mit --overwrite${c.reset}`);
    return { success: false };
  }

  try {
    const beforeStats = fs.statSync(inputPath);
    const beforeInfo = await getImageInfo(inputPath);

    console.log(`\n${c.bold}🔄 Konvertiere:${c.reset} ${path.basename(inputPath)}`);
    console.log('='.repeat(50));
    console.log(`  ${c.dim}${beforeInfo.format.toUpperCase()} → ${opts.to.toUpperCase()}${c.reset}`);
    console.log(`  ${c.dim}${beforeInfo.width}×${beforeInfo.height} px${c.reset}`);

    const result = await convertImage(inputPath, outputPath, opts.to, opts.quality);

    const afterStats = fs.statSync(outputPath);
    const diff = afterStats.size - beforeStats.size;
    const diffPercent = ((diff / beforeStats.size) * 100).toFixed(1);
    const diffSign = diff > 0 ? '+' : '';

    console.log(`\n  ${c.green}✅ Fertig!${c.reset}`);
    console.log(`  ${c.blue}Output:${c.reset}       ${path.basename(outputPath)}`);
    console.log(`  ${c.blue}Datei-Größe:${c.reset}  ${formatBytes(beforeStats.size)} → ${formatBytes(afterStats.size)} ${c.dim}(${diffSign}${diffPercent}%)${c.reset}`);
    console.log(`  ${c.blue}Pfad:${c.reset}         ${path.resolve(outputPath)}`);

    return { success: true, output: outputPath };
  } catch (error) {
    console.log(`${c.red}❌ Fehler: ${error.message}${c.reset}`);
    return { success: false };
  }
}

// ============================================================
// ORDNER KONVERTIEREN
// ============================================================

const IMAGE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif',
  '.gif', '.bmp', '.avif', '.heic', '.heif'
];

async function convertFolder(folderPath, opts) {
  // Alle Bilddateien finden
  const files = fs.readdirSync(folderPath).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext);
  });

  // Bereits Ziel-Format rausfiltern
  const targetExt = `.${opts.to}`;
  const toConvert = files.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ext !== targetExt && !(opts.to === 'jpg' && ext === '.jpeg');
  });

  if (toConvert.length === 0) {
    console.log(`${c.yellow}📭 Keine Bilder zum Konvertieren gefunden.${c.reset}`);
    console.log(`${c.dim}(${files.length} Bild(er) gefunden, aber alle bereits im Ziel-Format)${c.reset}`);
    return;
  }

  console.log(`\n${c.bold}📁 Ordner: ${folderPath}${c.reset}`);
  console.log('='.repeat(50));
  console.log(`  ${c.blue}Gefunden:${c.reset}     ${files.length} Bild(er)`);
  console.log(`  ${c.blue}Zu konvertieren:${c.reset} ${toConvert.length}`);
  console.log(`  ${c.blue}Ziel-Format:${c.reset}  ${opts.to.toUpperCase()}`);
  console.log('');

  let success = 0;
  let failed = 0;

  for (let i = 0; i < toConvert.length; i++) {
    const file = toConvert[i];
    const inputPath = path.join(folderPath, file);
    const base = path.basename(file, path.extname(file));
    const outputPath = opts.output
      ? path.join(opts.output, `${base}.${opts.to}`)
      : path.join(folderPath, `${base}.${opts.to}`);

    // Progress
    const percent = Math.round(((i + 1) / toConvert.length) * 100);
    const barLength = 25;
    const filled = Math.round((percent / 100) * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    process.stdout.write(`\r${c.dim}[${bar}] ${percent}% ${file.padEnd(30).substring(0, 30)}${c.reset}`);

    try {
      if (fs.existsSync(outputPath) && !opts.overwrite) {
        failed++;
        continue;
      }
      await convertImage(inputPath, outputPath, opts.to, opts.quality);
      success++;
    } catch (error) {
      failed++;
    }
  }

  process.stdout.write('\n');
  console.log('');
  console.log(`${c.bold}📊 Ergebnis:${c.reset}`);
  console.log(`  ${c.green}✅ Erfolgreich:${c.reset} ${success}`);
  if (failed > 0) {
    console.log(`  ${c.red}❌ Fehlgeschlagen:${c.reset} ${failed}`);
  }
  console.log(`  ${c.blue}📁 Ziel:${c.reset} ${opts.output || folderPath}`);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const args = process.argv.slice(2);

  // Kein Input → Hilfe
  if (args.length === 0) {
    showBanner();
    showHelp();
    process.exit(0);
  }

  // --help
  if (args.includes('--help') || args.includes('-h')) {
    showBanner();
    showHelp();
    process.exit(0);
  }

  const opts = parseArgs(args);

  if (!opts.input) {
    console.log(`${c.red}❌ Kein Input angegeben!${c.reset}`);
    console.log(`${c.dim}Usage: imgconvert <datei|ordner> [--to jpg|png]${c.reset}`);
    process.exit(1);
  }

  const inputPath = path.resolve(opts.input);

  // Existiert?
  if (!fs.existsSync(inputPath)) {
    console.log(`${c.red}❌ Pfad nicht gefunden: ${inputPath}${c.reset}`);
    process.exit(1);
  }

  showBanner();

  const stats = fs.statSync(inputPath);

  // Info-Modus
  if (opts.info) {
    if (stats.isDirectory()) {
      console.log(`${c.yellow}⚠️  --info funktioniert nur mit Dateien${c.reset}`);
      process.exit(1);
    }
    await showInfo(inputPath);
    process.exit(0);
  }

  // Datei oder Ordner?
  if (stats.isDirectory()) {
    if (!opts.all) {
      console.log(`${c.yellow}⚠️  "${opts.input}" ist ein Ordner.${c.reset}`);
      console.log(`${c.dim}Verwende --all um alle Bilder zu konvertieren:${c.reset}`);
      console.log(`${c.dim}  imgconvert "${opts.input}" --all --to ${opts.to}${c.reset}`);
      process.exit(1);
    }
    await convertFolder(inputPath, opts);
  } else {
    await convertSingle(inputPath, opts);
  }
}

main().catch(error => {
  console.log(`${c.red}❌ Unerwarteter Fehler: ${error.message}${c.reset}`);
  process.exit(1);
});