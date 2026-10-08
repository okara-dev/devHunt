#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
${c.bold}${c.magenta}╔═══════════════════════════════════════════════════════════════╗
║              📦 CLI Auto-Installer                           ║
║        Findet alle CLI-Tools und verlinkt sie automatisch    ║
╚═══════════════════════════════════════════════════════════════╝${c.reset}
`);
}

// ============================================================
// CLI-ORDNER FINDEN
// ============================================================

function findCliProjects(rootDir) {
  const projects = [];
  const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '.next', '.cache', 'coverage'];

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    const hasPackageJson = entries.some(
      e => e.isFile() && e.name === 'package.json'
    );

    const hasBinFolder = entries.some(
      e => e.isDirectory() && e.name === 'bin'
    );

    if (hasPackageJson && hasBinFolder) {
      const pkgPath = path.join(dir, 'package.json');
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        projects.push({
          name: pkg.name || path.basename(dir),
          version: pkg.version || '?.?.?',
          description: pkg.description || '',
          bin: pkg.bin || null,
          path: dir,
          relative: path.relative(rootDir, dir)
        });
      } catch {
        // Ungültige package.json → überspringen
      }
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue;
      if (ignoreDirs.includes(entry.name)) continue;
      walk(path.join(dir, entry.name));
    }
  }

  walk(rootDir);
  return projects;
}

// ============================================================
// EINZELNES PROJEKT INSTALLIEREN
// ============================================================

async function installProject(project, force = false) {
  const result = {
    name: project.name,
    success: false,
    steps: [],
    error: null
  };

  try {
    const nodeModulesPath = path.join(project.path, 'node_modules');

    // Bei --force: node_modules löschen
    if (force && fs.existsSync(nodeModulesPath)) {
      try {
        fs.rmSync(nodeModulesPath, { recursive: true, force: true });
      } catch {}
    }

    const hasNodeModules = fs.existsSync(nodeModulesPath);

    // Schritt 1: npm install
    if (!hasNodeModules) {
      result.steps.push({ name: 'npm install', status: 'running' });
      process.stdout.write(`      ${c.dim}→ npm install...${c.reset}`);

      try {
        await execAsync('npm install', {
          cwd: project.path,
          timeout: 300000,
          maxBuffer: 1024 * 1024 * 10
        });
        result.steps[result.steps.length - 1].status = 'success';
        process.stdout.write(`\r      ${c.green}✅ npm install${c.reset}\n`);
      } catch (error) {
        result.steps[result.steps.length - 1].status = 'failed';
        process.stdout.write(`\r      ${c.red}❌ npm install fehlgeschlagen${c.reset}\n`);
        throw new Error(`npm install: ${error.message.substring(0, 100)}`);
      }
    } else {
      result.steps.push({ name: 'npm install', status: 'skipped' });
      process.stdout.write(`      ${c.dim}→ npm install ${c.green}(bereits vorhanden)${c.reset}\n`);
    }

    // Schritt 2: npm link
    result.steps.push({ name: 'npm link', status: 'running' });
    process.stdout.write(`      ${c.dim}→ npm link...${c.reset}`);

    try {
      await execAsync('npm link', {
        cwd: project.path,
        timeout: 120000,
        maxBuffer: 1024 * 1024 * 10
      });
      result.steps[result.steps.length - 1].status = 'success';
      process.stdout.write(`\r      ${c.green}✅ npm link${c.reset}\n`);
    } catch (error) {
      result.steps[result.steps.length - 1].status = 'failed';
      process.stdout.write(`\r      ${c.red}❌ npm link fehlgeschlagen${c.reset}\n`);
      throw new Error(`npm link: ${error.message.substring(0, 100)}`);
    }

    result.success = true;
    return result;

  } catch (error) {
    result.error = error.message;
    return result;
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  showBanner();

  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isForce = args.includes('--force');
  const filterCategory = args.find(a => !a.startsWith('--'));

  console.log(`📂 Durchsuche: ${c.cyan}${__dirname}${c.reset}`);

  if (filterCategory) {
    console.log(`🔍 Filter: ${c.yellow}${filterCategory}${c.reset}`);
  }

  if (isDryRun) {
    console.log(`🧪 ${c.yellow}DRY-RUN Modus (nur anzeigen)${c.reset}`);
  }

  if (isForce) {
    console.log(`💪 ${c.yellow}FORCE Modus (node_modules neu)${c.reset}`);
  }

  console.log(`${c.dim}⏳ Suche nach CLI-Projekten...${c.reset}\n`);

  let projects = findCliProjects(__dirname);

  if (filterCategory) {
    projects = projects.filter(p =>
      p.relative.toLowerCase().startsWith(filterCategory.toLowerCase())
    );
  }

  if (projects.length === 0) {
    console.log(`${c.yellow}📭 Keine CLI-Projekte gefunden.${c.reset}`);
    console.log(`${c.dim}Tipp: Ordner muss package.json UND bin/ enthalten.${c.reset}\n`);
    process.exit(0);
  }

  console.log(`${c.bold}📋 Gefundene CLI-Projekte (${projects.length}):${c.reset}`);
  console.log('='.repeat(70));

  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    console.log(`\n  ${c.cyan}${i + 1}.${c.reset} ${c.bold}${p.name}${c.reset} ${c.dim}v${p.version}${c.reset}`);
    console.log(`     ${c.dim}${p.relative}${c.reset}`);
    if (p.description) {
      console.log(`     ${c.dim}${p.description.substring(0, 60)}${c.reset}`);
    }
    if (p.bin) {
      const binNames = typeof p.bin === 'string' ? [p.bin] : Object.keys(p.bin);
      console.log(`     ${c.green}🔗 Befehl:${c.reset} ${binNames.join(', ')}`);
    }
  }

  console.log('\n' + '='.repeat(70));

  if (isDryRun) {
    console.log(`\n${c.yellow}🧪 Dry-Run beendet. Keine Änderungen vorgenommen.${c.reset}\n`);
    process.exit(0);
  }

  console.log(`\n${c.bold}🚀 Starte Installation...${c.reset}\n`);

  const results = [];
  const startTime = Date.now();

  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    const num = `[${i + 1}/${projects.length}]`;

    console.log(`${c.bold}${num} ${p.name}${c.reset}`);
    console.log(`   ${c.dim}${p.relative}${c.reset}`);

    const result = await installProject(p, isForce);
    results.push(result);

    if (result.success) {
      console.log(`   ${c.green}✅ Fertig!${c.reset}\n`);
    } else {
      console.log(`   ${c.red}❌ Fehler: ${result.error}${c.reset}\n`);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('='.repeat(70));
  console.log(`${c.bold}📊 ZUSAMMENFASSUNG${c.reset}`);
  console.log('='.repeat(70));
  console.log(`  ${c.blue}Gesamt:${c.reset}        ${results.length} CLIs`);
  console.log(`  ${c.green}✅ Erfolgreich:${c.reset} ${successful}`);
  if (failed > 0) {
    console.log(`  ${c.red}❌ Fehlgeschlagen:${c.reset} ${failed}`);
  }
  console.log(`  ${c.blue}⏱️  Dauer:${c.reset}        ${duration}s`);

  if (failed > 0) {
    console.log(`\n${c.red}${c.bold}Fehlgeschlagene CLIs:${c.reset}`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`  ${c.red}✗${c.reset} ${r.name}`);
      console.log(`    ${c.dim}${r.error}${c.reset}`);
    });
  }

  if (successful > 0) {
    console.log(`\n${c.bold}🎉 Verfügbare Befehle:${c.reset}`);
    for (const p of projects) {
      const r = results.find(res => res.name === p.name);
      if (!r || !r.success) continue;
      if (!p.bin) continue;

      const binNames = typeof p.bin === 'string' ? [p.bin] : Object.keys(p.bin);
      binNames.forEach(b => {
        console.log(`  ${c.green}$${c.reset} ${c.cyan}${b}${c.reset}`);
      });
    }
  }

  console.log(`\n${c.green}${c.bold}✅ Alle CLIs sind einsatzbereit!${c.reset}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

// ============================================================
// START
// ============================================================

process.on('SIGINT', () => {
  console.log(`\n\n${c.yellow}👋 Abgebrochen.${c.reset}\n`);
  process.exit(130);
});

main().catch(error => {
  console.log(`\n${c.red}❌ Fehler: ${error.message}${c.reset}\n`);
  console.log(`${c.dim}${error.stack}${c.reset}\n`);
  process.exit(1);
});