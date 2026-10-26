#!/usr/bin/env node

import readline from 'readline';
import { testEndpoint, testMultiple } from '../lib/tester.js';

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

function showBanner() {
  console.log(`
${c.bold}${c.cyan}╔═══════════════════════════════════════════════════════════════════╗
║              🔍 API Tester - Endpunkte prüfen                    ║
║        Erreichbarkeit • Auth-Check • Header-Info                 ║
╚═══════════════════════════════════════════════════════════════════╝${c.reset}
`);
}

function showHelp() {
  console.log(`
${c.bold}Commands:${c.reset}
  ${c.green}test${c.reset} <url> [url2] [url3]...  - Testet einen oder mehrere Endpunkte
  ${c.green}help${c.reset}                           - Zeigt diese Hilfe
  ${c.green}exit${c.reset}                           - Beendet das Tool

${c.bold}Optionen:${c.reset}
  ${c.cyan}--timeout <ms>${c.reset}                 - Timeout in ms (Standard: 10000)
  ${c.cyan}--json${c.reset}                         - Ausgabe als JSON

${c.bold}Beispiele:${c.reset}
  apitest test https://api.github.com
  apitest test https://api.example.com https://httpbin.org/get
  apitest test https://api.example.com --json
`);
}

function formatResult(result) {
  const lines = [];

  // Status-Icon
  let icon, statusColor;
  if (!result.reachable) {
    icon = '❌';
    statusColor = c.red;
  } else if (result.status >= 200 && result.status < 300) {
    icon = '✅';
    statusColor = c.green;
  } else if (result.status >= 400 && result.status < 500) {
    icon = '⚠️';
    statusColor = c.yellow;
  } else {
    icon = '❌';
    statusColor = c.red;
  }

  lines.push(`\n${c.bold}${icon} ${result.url}${c.reset}`);
  lines.push('─'.repeat(60));

  if (!result.reachable) {
    lines.push(`  ${c.red}Status:${c.reset}       NICHT ERREICHBAR`);
    lines.push(`  ${c.blue}Zeit:${c.reset}         ${result.responseTime}ms`);
    lines.push(`  ${c.red}Fehler:${c.reset}       ${result.error}`);
    return lines.join('\n');
  }

  // Erreichbar
  lines.push(`  ${c.blue}Status:${c.reset}       ${statusColor}${result.status} ${result.statusText}${c.reset}`);
  lines.push(`  ${c.blue}Antwortzeit:${c.reset}  ${result.responseTime}ms`);

  // Auth-Info [citation:2][citation:5]
  if (result.requiresAuth === true) {
    lines.push(`  ${c.yellow}Auth:${c.reset}         ${c.yellow}🔒 Ja (erforderlich)${c.reset}`);
    lines.push(`  ${c.blue}Auth-Typ:${c.reset}     ${result.authType || 'Unbekannt'}`);
  } else if (result.requiresAuth === false) {
    lines.push(`  ${c.green}Auth:${c.reset}         ${c.green}🔓 Nein (öffentlich)${c.reset}`);
  } else {
    lines.push(`  ${c.yellow}Auth:${c.reset}         ${result.requiresAuth || 'Unbekannt'}`);
  }

  // Content-Type
  if (result.contentType) {
    lines.push(`  ${c.blue}Content-Type:${c.reset} ${result.contentType}`);
  }

  // Server
  if (result.server) {
    lines.push(`  ${c.blue}Server:${c.reset}       ${result.server}`);
  }

  // CORS
  if (result.cors) {
    const corsColor = result.cors === '*' ? c.green : c.dim;
    lines.push(`  ${c.blue}CORS:${c.reset}         ${corsColor}${result.cors}${c.reset}`);
  }

  // Security-Headers
  const securityHeaders = {
    'x-frame-options': 'X-Frame-Options',
    'x-content-type-options': 'X-Content-Type-Options',
    'strict-transport-security': 'Strict-Transport-Security',
    'content-security-policy': 'Content-Security-Policy'
  };

  const foundSecurity = [];
  for (const [key, label] of Object.entries(securityHeaders)) {
    if (result.headers[key]) {
      foundSecurity.push(label);
    }
  }
  if (foundSecurity.length > 0) {
    lines.push(`  ${c.blue}Sicherheit:${c.reset}   ${foundSecurity.join(', ')}`);
  }

  return lines.join('\n');
}

async function handleTest(args) {
  const urls = [];
  let timeout = 10000;
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--timeout') {
      timeout = parseInt(args[i + 1]) || 10000;
      i++;
    } else if (args[i] === '--json') {
      jsonOutput = true;
    } else if (!args[i].startsWith('--')) {
      urls.push(args[i]);
    }
  }

  if (urls.length === 0) {
    console.log(`${c.yellow}Usage: test <url> [url2] [url3]...${c.reset}`);
    return;
  }

  // URLs normalisieren
  const normalizedUrls = urls.map(u => {
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
      return 'https://' + u;
    }
    return u;
  });

  console.log(`\n${c.dim}⏳ Teste ${normalizedUrls.length} Endpunkt(e)...${c.reset}`);

  let results;
  if (normalizedUrls.length === 1) {
    results = [await testEndpoint(normalizedUrls[0], { timeout })];
  } else {
    results = await testMultiple(normalizedUrls, { timeout });
  }

  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  // Formatierte Ausgabe
  for (const result of results) {
    console.log(formatResult(result));
  }

  // Zusammenfassung
  if (results.length > 1) {
    const reachable = results.filter(r => r.reachable).length;
    const withAuth = results.filter(r => r.requiresAuth === true).length;
    console.log(`\n${c.bold}📊 Zusammenfassung:${c.reset}`);
    console.log(`  ${c.green}✅ Erreichbar:${c.reset} ${reachable}/${results.length}`);
    console.log(`  ${c.yellow}🔒 Mit Auth:${c.reset}   ${withAuth}`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showBanner();
    showHelp();
    process.exit(0);
  }

  showBanner();

  const cmd = args[0]?.toLowerCase();
  const cmdArgs = args.slice(1);

  switch (cmd) {
    case 'test':
    case 't':
      await handleTest(cmdArgs);
      break;
    case 'help':
    case 'h':
      showHelp();
      break;
    case 'exit':
    case 'quit':
      console.log(`${c.bold}👋 Tschüss!${c.reset}`);
      process.exit(0);
    default:
      // Wenn erste Arg eine URL ist → direkt testen
      if (cmd && (cmd.startsWith('http') || cmd.includes('.'))) {
        await handleTest(args);
      } else {
        console.log(`${c.red}❌ Unbekannter Befehl: ${cmd}${c.reset}`);
        showHelp();
      }
  }

  rl.close();
}

main().catch(error => {
  console.log(`${c.red}❌ Fehler: ${error.message}${c.reset}`);
  process.exit(1);
});