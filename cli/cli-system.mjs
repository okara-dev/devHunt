#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));
const sourceDirectory = path.join(rootDirectory, 'src');

async function findPackageDirectories(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const packageDirectories = [];

  if (entries.some((entry) => entry.isFile() && entry.name === 'package.json')) {
    packageDirectories.push(directory);
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || ['.git', 'node_modules'].includes(entry.name)) {
      continue;
    }

    packageDirectories.push(
      ...(await findPackageDirectories(path.join(directory, entry.name))),
    );
  }

  return packageDirectories;
}

async function loadCLIs() {
  let packageDirectories;

  try {
    packageDirectories = await findPackageDirectories(sourceDirectory);
  } catch (error) {
    throw new Error(`CLI-Quellordner konnte nicht gelesen werden: ${sourceDirectory}`, {
      cause: error,
    });
  }

  const clis = [];

  for (const packageDirectory of packageDirectories) {
    const manifestPath = path.join(packageDirectory, 'package.json');
    let manifest;

    try {
      manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    } catch (error) {
      throw new Error(`Ungültige package.json: ${manifestPath}`, { cause: error });
    }

    if (!manifest.bin) {
      continue;
    }

    const binaries =
      typeof manifest.bin === 'string'
        ? [[manifest.name?.split('/').pop() ?? path.basename(packageDirectory), manifest.bin]]
        : Object.entries(manifest.bin);

    for (const [command, relativeEntryPoint] of binaries) {
      if (typeof relativeEntryPoint !== 'string') {
        throw new Error(`Ungültiger CLI-Einstiegspunkt für "${command}" in ${manifestPath}`);
      }

      const entryPoint = path.resolve(packageDirectory, relativeEntryPoint);
      const relativePath = path.relative(packageDirectory, entryPoint);

      if (
        relativePath === '..' ||
        relativePath.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relativePath)
      ) {
        throw new Error(`CLI-Einstiegspunkt liegt außerhalb des Pakets: ${manifestPath}`);
      }

      clis.push({
        command,
        description: manifest.description ?? 'Keine Beschreibung vorhanden',
        entryPoint,
        manifestPath,
        packageDirectory,
        packageName: manifest.name ?? path.basename(packageDirectory),
        category:
          path.relative(sourceDirectory, packageDirectory).split(path.sep)[0] ?? 'sonstige',
      });
    }
  }

  return clis.sort(
    (left, right) =>
      left.category.localeCompare(right.category) ||
      left.command.localeCompare(right.command),
  );
}

function printOverview(clis) {
  if (clis.length === 0) {
    console.log('Keine CLI-Pakete mit "bin"-Eintrag unter src gefunden.');
    return;
  }

  console.log(`\nCLI-System: ${clis.length} verfügbare Tools\n`);
  let currentCategory;

  clis.forEach((cli, index) => {
    if (cli.category !== currentCategory) {
      currentCategory = cli.category;
      console.log(`\n${currentCategory.replaceAll('-', ' ').toUpperCase()}`);
    }

    console.log(
      `  ${String(index + 1).padStart(2, ' ')}. ${cli.command.padEnd(20)} ${cli.description}`,
    );
  });

  console.log('\nAufruf: cli-system run <befehl> [argumente...]');
}

function printHelp() {
  console.log(`CLI-System

Verwendung:
  cli-system                  Übersicht öffnen und ein Tool auswählen
  cli-system list             Alle verfügbaren Tools anzeigen
  cli-system install          Abhängigkeiten aller Tools installieren
  cli-system run <befehl>     Ein Tool direkt starten
  cli-system help             Diese Hilfe anzeigen`);
}

function installDependencies(clis) {
  const packageDirectories = [...new Set(clis.map((cli) => cli.packageDirectory))];
  const failedPackages = [];
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  for (const packageDirectory of packageDirectories) {
    console.log(`\nInstalliere Abhängigkeiten: ${path.basename(packageDirectory)}`);
    const result = spawnSync(
      npmCommand,
      ['install', '--omit=dev', '--no-audit', '--no-fund'],
      {
        cwd: packageDirectory,
        stdio: 'inherit',
        shell: process.platform === 'win32',
      },
    );

    if (result.error) {
      console.error(`npm konnte nicht gestartet werden: ${result.error.message}`);
      failedPackages.push(packageDirectory);
    } else if (result.status !== 0) {
      console.error(`Installation fehlgeschlagen (Exit-Code ${result.status ?? 'unbekannt'}).`);
      failedPackages.push(packageDirectory);
    }
  }

  if (failedPackages.length > 0) {
    console.error(
      `\n${failedPackages.length} Paket(e) konnten nicht installiert werden: ${failedPackages
        .map((directory) => path.basename(directory))
        .join(', ')}`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(`\nAbhängigkeiten für ${packageDirectories.length} CLI-Pakete installiert.`);
}

function runCLI(cli, args) {
  return new Promise((resolve, reject) => {
    const hasInteractiveTerminal = Boolean(process.stdin.isTTY);
    const child = spawn(process.execPath, [cli.entryPoint, ...args], {
      cwd: cli.packageDirectory,
      stdio: [hasInteractiveTerminal ? 'inherit' : 'pipe', 'inherit', 'inherit'],
    });

    if (!hasInteractiveTerminal) {
      process.stdin.pipe(child.stdin);
    }

    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (!hasInteractiveTerminal) {
        process.stdin.unpipe(child.stdin);
        process.stdin.pause();
      }

      if (signal) {
        console.error(`\n"${cli.command}" wurde durch Signal ${signal} beendet.`);
        process.exitCode = 1;
      } else {
        process.exitCode = code ?? 1;
      }
      resolve();
    });
  });
}

async function chooseCLI(clis) {
  printOverview(clis);
  if (clis.length === 0) {
    return;
  }

  const prompt = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let selected;

  try {
    const answer = (await prompt.question('\nNummer oder Befehl eingeben (q zum Beenden): ')).trim();
    if (!answer || answer.toLowerCase() === 'q') {
      return;
    }

    selected = /^\d+$/.test(answer)
      ? clis[Number(answer) - 1]
      : clis.find((cli) => cli.command.toLowerCase() === answer.toLowerCase());

    if (!selected) {
      console.error(`Keine CLI für "${answer}" gefunden.`);
      process.exitCode = 1;
      return;
    }
  } finally {
    prompt.close();
    process.stdin.pause();
  }

  await runCLI(selected, []);
}

async function main() {
  const [action, ...args] = process.argv.slice(2);
  const clis = await loadCLIs();

  if (!action) {
    await chooseCLI(clis);
    return;
  }

  switch (action.toLowerCase()) {
    case 'list':
      printOverview(clis);
      break;
    case 'install':
      installDependencies(clis);
      break;
    case 'run': {
      const [command, ...cliArgs] = args;
      const selected = clis.find((cli) => cli.command.toLowerCase() === command?.toLowerCase());

      if (!selected) {
        console.error(`CLI-Befehl fehlt oder wurde nicht gefunden: ${command ?? ''}`);
        printHelp();
        process.exitCode = 1;
        return;
      }

      await runCLI(selected, cliArgs);
      break;
    }
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;
    default:
      console.error(`Unbekannte Option: ${action}`);
      printHelp();
      process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`CLI-System-Fehler: ${error.message}`);
  if (error.cause) {
    console.error(error.cause.message);
  }
  process.exitCode = 1;
});