import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Windows Standard-Pfade
const USER_PROFILE = os.homedir();
const SCREENSHOTS_DIR = path.join(USER_PROFILE, 'Pictures', 'Screenshots');
const DOWNLOADS_DIR = path.join(USER_PROFILE, 'Downloads');
const TEMP_DIR = os.tmpdir();

/**
 * Hilfsfunktion: Löscht einen Ordnerinhalt (aber nicht den Ordner selbst)
 */
async function emptyDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return { deleted: 0, errors: 0, skipped: 0 };

  let deleted = 0;
  let errors = 0;
  let skipped = 0;

  const items = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    try {
      if (item.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
      deleted++;
    } catch (error) {
      // Datei ist möglicherweise in Benutzung
      errors++;
    }
  }

  return { deleted, errors, skipped };
}

/**
 * Leert den Papierkorb (Windows)
 */
export async function emptyRecycleBin() {
  try {
    // PowerShell Befehl zum Leeren des Papierkorbs [citation:7]
    await execAsync('powershell -NoProfile -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"', { timeout: 30000 });
    return { success: true, message: 'Papierkorb geleert' };
  } catch (error) {
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

/**
 * Löscht alle Screenshots
 */
export async function cleanScreenshots() {
  const result = await emptyDirectory(SCREENSHOTS_DIR);
  return { ...result, path: SCREENSHOTS_DIR };
}

/**
 * Löscht alle Downloads (Vorsicht!)
 */
export async function cleanDownloads() {
  const result = await emptyDirectory(DOWNLOADS_DIR);
  return { ...result, path: DOWNLOADS_DIR };
}

/**
 * Leert den Windows Temp-Ordner
 */
export async function cleanTemp() {
  const result = await emptyDirectory(TEMP_DIR);
  return { ...result, path: TEMP_DIR };
}

/**
 * Löscht alte Windows Update-Dateien (SoftwareDistribution)
 * ACHTUNG: Erfordert Admin-Rechte und kann Windows Update zurücksetzen
 */
export async function cleanWindowsUpdateCache() {
  try {
    // Stoppt den Windows Update Dienst, löscht den Cache, startet den Dienst neu
    const cmd = `
      net stop wuauserv
      rd /s /q C:\\Windows\\SoftwareDistribution\\Download
      net start wuauserv
    `;
    await execAsync(cmd, { timeout: 60000 });
    return { success: true, message: 'Windows Update Cache geleert' };
  } catch (error) {
    return { success: false, message: `Fehler (Admin-Rechte benötigt?): ${error.message}` };
  }
}

/**
 * Zeigt die Größe von Ordnern an
 */
export function getFolderSize(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  let size = 0;
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        size += getFolderSize(fullPath);
      } else {
        size += fs.statSync(fullPath).size;
      }
    }
  } catch { /* Ignorieren */ }
  return size;
}

/**
 * Formatiert Bytes in lesbare Größe
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}