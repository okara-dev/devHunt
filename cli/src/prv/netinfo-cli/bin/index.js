#!/usr/bin/env node

import readline from 'readline';
import { getLocalInfo } from '../lib/local.js';
import { getPublicInfo } from '../lib/public.js';
import { scanPorts } from '../lib/ports.js';
import { scanNetwork } from '../lib/network.js';
import { scanWifi } from '../lib/wifi.js';
import { speedtest } from '../lib/speedtest.js';

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
║              🌐 Network Info - Diagnose Your Network             ║
║             IPs, Ports, WLAN, Netzwerk-Scan, Speedtest            ║
╚═══════════════════════════════════════════════════════════════════╝${c.reset}
`);
}

function showHelp() {
  console.log(`
${c.bold}Commands:${c.reset}
  ${c.green}info${c.reset}                       - Show all network info (local + public)
  ${c.green}local${c.reset}                      - Show local network info
  ${c.green}public${c.reset}                     - Show public IP + location
  ${c.green}ports <host> <80,443,8080>${c.reset} - Scan ports on a host
  ${c.green}scan [192.168.1.0/24]${c.reset}      - Scan network for devices
  ${c.green}wifi${c.reset}                       - Scan WLAN networks
  ${c.green}speedtest${c.reset}                  - Test internet speed
  ${c.green}help${c.reset}                       - Show this help
  ${c.green}exit${c.reset}                       - Exit

${c.dim}Examples:${c.reset}
  netinfo info
  netinfo ports google.com 80,443
  netinfo scan 192.168.0.0/24
  netinfo wifi
  netinfo speedtest
`);
}

function showProgress(current, total, message = '') {
  const percentage = Math.round((current / total) * 100);
  const barLength = 30;
  const filled = Math.round((percentage / 100) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  process.stdout.write(`\r${c.dim}[${bar}] ${percentage}% ${message}${c.reset}`);
  if (percentage === 100) process.stdout.write('\n');
}

async function handleInfo() {
  try {
    const local = await getLocalInfo();
    
    console.log(`\n${c.bold}🌐 Network Information${c.reset}`);
    console.log('='.repeat(50));
    console.log(`  ${c.blue}Lokale IP:${c.reset}       ${local.ips.join(', ')}`);
    console.log(`  ${c.blue}MAC-Adresse:${c.reset}     ${local.mac || 'N/A'}`);
    console.log(`  ${c.blue}Gateway:${c.reset}         ${local.gateway || 'N/A'}`);
    console.log(`  ${c.blue}DNS-Server:${c.reset}      ${local.dns.join(', ') || 'N/A'}`);
    console.log(`  ${c.blue}Hostname:${c.reset}        ${local.hostname}`);
    console.log(`  ${c.blue}Plattform:${c.reset}       ${local.platform}`);

    console.log(`\n${c.dim}⏳ Lade öffentliche IP...${c.reset}`);
    const publicInfo = await getPublicInfo();
    
    console.log(`\n  ${c.blue}Öffentliche IP:${c.reset}  ${c.bold}${publicInfo.ip}${c.reset}`);
    console.log(`  ${c.blue}Standort:${c.reset}        ${publicInfo.city}, ${publicInfo.country}`);
    console.log(`  ${c.blue}ISP:${c.reset}             ${publicInfo.isp}`);
  } catch (error) {
    console.log(`${c.red}❌ Fehler: ${error.message}${c.reset}`);
  }
}

async function handlePorts(args) {
  if (args.length < 2) {
    console.log(`${c.yellow}Usage: ports <host> <port1,port2,...>${c.reset}`);
    console.log(`${c.dim}Beispiel: ports google.com 80,443,8080${c.reset}`);
    return;
  }

  const host = args[0];
  const ports = args[1].split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));

  console.log(`\n${c.bold}🔍 Port-Scan: ${host}${c.reset}`);
  console.log('='.repeat(50));

  const results = await scanPorts(host, ports, (progress) => {
    showProgress(progress.current, progress.total, `Prüfe Port ${progress.port}...`);
  });

  results.forEach(r => {
    const icon = r.open ? '✅' : '❌';
    const color = r.open ? c.green : c.red;
    const status = r.open ? 'offen' : 'geschlossen';
    const service = r.service ? ` (${r.service})` : '';
    console.log(`  Port ${r.port.toString().padEnd(6)} ${color}${icon} ${status}${c.reset}${service}`);
  });
}

async function handleScan(args) {
  const subnet = args[0] || null;

  console.log(`\n${c.bold}🔍 Netzwerk-Scan${c.reset}`);
  console.log('='.repeat(50));

  if (!subnet) {
    console.log(`${c.dim}💡 Dein Netzwerk wird automatisch erkannt...${c.reset}\n`);
  }

  const devices = await scanNetwork(subnet, (progress) => {
    showProgress(progress.current, progress.total, `Scanne ${progress.current}/${progress.total}`);
  });

  if (devices.length === 0) {
    console.log(`${c.yellow}Keine Geräte gefunden.${c.reset}`);
    return;
  }

  console.log(`\n${c.green}✅ ${devices.length} aktive Geräte gefunden:${c.reset}\n`);
  devices.forEach(d => {
    console.log(`  ${c.cyan}${d.ip.padEnd(16)}${c.reset} ${c.bold}${d.hostname || 'Unbekannt'}${c.reset}`);
  });
}

async function handleWifi() {
  console.log(`\n${c.bold}📡 WLAN-Scan${c.reset}`);
  console.log('='.repeat(50));

  try {
    const networks = await scanWifi();

    if (networks.length === 0) {
      console.log(`${c.yellow}Keine WLAN-Netzwerke gefunden.${c.reset}`);
      return;
    }

    networks.forEach(n => {
      const signalPercent = n.signal || 0;
      const signalBars = '📶'.repeat(Math.max(1, Math.ceil(signalPercent / 25)));
      const security = n.security || 'offen';
      const secColor = security.toLowerCase().includes('offen') ? c.red : c.green;
      console.log(`  ${c.cyan}${n.ssid.padEnd(28)}${c.reset} ${signalBars} ${signalPercent}%  ${secColor}${security}${c.reset}  Kanal ${n.channel || '?'}`);
    });
  } catch (error) {
    console.log(`${c.red}❌ Fehler: ${error.message}${c.reset}`);
  }
}

async function handleSpeedtest() {
  console.log(`\n${c.bold}⚡ Speedtest${c.reset}`);
  console.log('='.repeat(50));

  try {
    const result = await speedtest((step) => {
      process.stdout.write(`\r${c.dim}${step}${c.reset}                                `);
    });
    console.log('');

    console.log(`\n  ${c.blue}📥 Download:${c.reset}  ${c.green}${c.bold}${result.download} Mbit/s${c.reset}`);
    console.log(`  ${c.blue}📤 Upload:${c.reset}    ${c.green}${c.bold}${result.upload} Mbit/s${c.reset}`);
    console.log(`  ${c.blue}📡 Ping:${c.reset}      ${result.ping}ms`);
  } catch (error) {
    console.log(`${c.red}❌ Fehler: ${error.message}${c.reset}`);
  }
}

async function main() {
  showBanner();
  showHelp();

  console.log(`\n${c.dim}💡 Tipp: 'info' für alle Netzwerk-Infos${c.reset}`);
  console.log('─'.repeat(50));

  rl.on('line', async (input) => {
    const parts = input.trim().split(/\s+/);
    const cmd = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    try {
      switch (cmd) {
        case 'info':
        case 'i':
          await handleInfo();
          break;
        case 'local':
        case 'l': {
          const local = await getLocalInfo();
          console.log(`\n${c.bold}💻 Lokale Netzwerk-Infos${c.reset}`);
          console.log('='.repeat(50));
          console.log(`  ${c.blue}IPs:${c.reset}         ${local.ips.join(', ')}`);
          console.log(`  ${c.blue}MAC:${c.reset}         ${local.mac || 'N/A'}`);
          console.log(`  ${c.blue}Gateway:${c.reset}     ${local.gateway || 'N/A'}`);
          console.log(`  ${c.blue}DNS:${c.reset}         ${local.dns.join(', ') || 'N/A'}`);
          console.log(`  ${c.blue}Hostname:${c.reset}    ${local.hostname}`);
          console.log(`  ${c.blue}Plattform:${c.reset}   ${local.platform}`);
          break;
        }
        case 'public':
        case 'p': {
          console.log(`${c.dim}⏳ Lade öffentliche IP...${c.reset}`);
          const pub = await getPublicInfo();
          console.log(`\n${c.bold}🌍 Öffentliche IP${c.reset}`);
          console.log('='.repeat(50));
          console.log(`  ${c.blue}IP:${c.reset}          ${c.bold}${pub.ip}${c.reset}`);
          console.log(`  ${c.blue}Land:${c.reset}        ${pub.country}`);
          console.log(`  ${c.blue}Stadt:${c.reset}       ${pub.city}`);
          console.log(`  ${c.blue}ISP:${c.reset}         ${pub.isp}`);
          break;
        }
        case 'ports':
        case 'port':
          await handlePorts(args);
          break;
        case 'scan':
          await handleScan(args);
          break;
        case 'wifi':
          await handleWifi();
          break;
        case 'speedtest':
        case 'speed':
          await handleSpeedtest();
          break;
        case 'help':
        case 'h':
          showHelp();
          break;
        case 'exit':
        case 'quit':
        case 'q':
          console.log(`\n${c.bold}👋 Tschüss!${c.reset}`);
          process.exit(0);
          break;
        default:
          if (cmd) {
            console.log(`${c.red}❌ Unbekannter Befehl: ${cmd}${c.reset}`);
            console.log(`${c.yellow}💡 Tippe 'help' für Hilfe${c.reset}`);
          }
      }
    } catch (error) {
      console.log(`${c.red}❌ Fehler: ${error.message}${c.reset}`);
    }
  });

  process.stdout.write(`\n${c.cyan}netinfo${c.reset}> `);
}

process.on('uncaughtException', (error) => {
  console.log(`${c.red}❌ Unerwarteter Fehler: ${error.message}${c.reset}`);
});

main();