#!/usr/bin/env node

import readline from 'readline';
import path from 'path';
import fs from 'fs';
import { analyzeCode } from '../lib/analyzer.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

// ============================================================
// EINSTIEG
// ============================================================

console.log(`\n${colors.bold}${colors.cyan}🔍 Code Analyzer${colors.reset}`);
console.log('='.repeat(50));

const currentDir = process.cwd();
console.log(`\n${colors.bold}Was passiert jetzt?${colors.reset}`);
console.log(`  ${colors.dim}Der Code Analyzer wird deinen Code analysieren.${colors.reset}`);
console.log(`  ${colors.dim}Er prüft: Dateigröße, Kommentare, Komplexität und Dokumentation.${colors.reset}`);
console.log(`  ${colors.dim}Am Ende bekommst du einen Code Quality Score.${colors.reset}`);

console.log(`\n${colors.bold}Aktueller Pfad:${colors.reset}`);
console.log(`  ${colors.cyan}${currentDir}${colors.reset}`);

console.log(`\n${colors.bold}Was wird analysiert?${colors.reset}`);
console.log(`  ${colors.dim}Alle Code-Dateien in diesem Ordner und Unterordnern.${colors.reset}`);
console.log(`  ${colors.dim}(node_modules, .git, dist, build, .next werden ignoriert)${colors.reset}`);

// ============================================================
// BESTÄTIGUNG
// ============================================================

rl.question(`\n${colors.yellow}❓ Analysieren? (j/n): ${colors.reset}`, async (answer) => {
  const input = answer.trim().toLowerCase();
  
  if (input !== 'j' && input !== 'ja' && input !== 'y' && input !== 'yes') {
    console.log(`\n${colors.yellow}👋 Abgebrochen.${colors.reset}`);
    rl.close();
    process.exit(0);
  }

  console.log(`\n${colors.dim}⏳ Analysiere Code...${colors.reset}\n`);

  try {
    const result = await analyzeCode(currentDir);
    printResult(result);
  } catch (error) {
    console.log(`\n${colors.red}❌ Fehler: ${error.message}${colors.reset}`);
  }

  rl.close();
  process.exit(0);
});

// ============================================================
// AUSGABE
// ============================================================

function printResult(result) {
  console.log(`\n${colors.bold}⭐ Code Quality Score${colors.reset}`);
  console.log('='.repeat(50));

  // Score mit Farbe
  const scoreColor = result.score >= 80 ? colors.green :
                     result.score >= 60 ? colors.yellow : colors.red;

  console.log(`  ${colors.bold}Overall Score:${colors.reset} ${scoreColor}${result.score}/100${colors.reset} (${result.grade})`);

  // Breakdown
  console.log(`\n  ${colors.bold}Breakdown:${colors.reset}`);
  console.log(`    File Size:     ${colorValue(result.breakdown.fileSize)}`);
  console.log(`    Comments:      ${colorValue(result.breakdown.comments)}`);
  console.log(`    Complexity:    ${colorValue(result.breakdown.complexity)}`);
  console.log(`    Documentation: ${colorValue(result.breakdown.documentation)}`);

  // Statistiken
  console.log(`\n  ${colors.bold}Statistiken:${colors.reset}`);
  console.log(`    ${colors.dim}Dateien:        ${result.stats.files}${colors.reset}`);
  console.log(`    ${colors.dim}Zeilen:         ${result.stats.lines}${colors.reset}`);
  console.log(`    ${colors.dim}Funktionen:     ${result.stats.functions}${colors.reset}`);
  console.log(`    ${colors.dim}Kommentare:     ${result.stats.comments}${colors.reset}`);

  // Issues
  if (result.issues.length > 0) {
    console.log(`\n  ${colors.bold}Issues Found:${colors.reset}`);
    result.issues.forEach(issue => {
      const icon = issue.severity === 'high' ? '🔴' :
                   issue.severity === 'medium' ? '🟡' : '🔵';
      console.log(`    ${icon} ${issue.message}`);
    });
  } else {
    console.log(`\n  ${colors.green}✅ Keine Issues gefunden!${colors.reset}`);
  }

  console.log('');
}

function colorValue(value) {
  const color = value >= 80 ? colors.green :
                value >= 60 ? colors.yellow : colors.red;
  return `${color}${value}${colors.reset}`;
}