import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Prüft ob winget verfügbar ist
 */
export async function isWingetAvailable() {
  try {
    await execAsync('winget --version', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Listet alle verfügbaren winget-Updates auf
 */
export async function listWingetUpdates() {
  try {
    const { stdout } = await execAsync(
      'winget upgrade --include-unknown --accept-source-agreements',
      { timeout: 60000, maxBuffer: 1024 * 1024 * 10 }
    );

    const lines = stdout.split('\n');
    const updates = [];

    // Tabelle finden (Zeile mit "Name" beginnt)
    let tableStarted = false;
    for (const line of lines) {
      if (line.includes('Name') && line.includes('Id') && line.includes('Version')) {
        tableStarted = true;
        continue;
      }

      if (!tableStarted) continue;
      if (line.startsWith('---') || line.startsWith('-')) continue;
      if (line.trim() === '') continue;
      if (line.includes('upgrades available')) break;

      // Zeile parsen: Name (evtl. Leerzeichen), Id, Version, Available, Source
      // Winget trennt Spalten mit 2+ Leerzeichen
      const parts = line.trim().split(/\s{2,}/);
      if (parts.length >= 3) {
        updates.push({
          name: parts[0],
          id: parts[1],
          version: parts[2],
          available: parts[3] || 'N/A',
          source: parts[4] || 'winget'
        });
      }
    }

    return updates;
  } catch (error) {
    // Wenn winget upgrade fehlschlägt (z.B. keine Updates), leer zurückgeben
    if (error.stdout && error.stdout.includes('No installed package')) {
      return [];
    }
    return [];
  }
}

/**
 * Führt alle winget-Updates durch
 */
export async function upgradeAllWinget() {
  try {
    const { stdout, stderr } = await execAsync(
      'winget upgrade --all --include-unknown --accept-source-agreements --accept-package-agreements',
      { timeout: 1800000, maxBuffer: 1024 * 1024 * 50 }
    );

    return {
      success: true,
      output: stdout,
      errors: stderr
    };
  } catch (error) {
    return {
      success: false,
      output: error.stdout || '',
      errors: error.stderr || error.message
    };
  }
}