import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Findet große Dateien im angegebenen Ordner (rekursiv)
 */
export function findLargeFiles(dirPath, minSizeMB = 100) {
  const minSize = minSizeMB * 1024 * 1024;
  const largeFiles = [];
  const ignoreDirs = ['node_modules', '.git', 'Windows', 'Program Files', 'Program Files (x86)', '$Recycle.Bin', 'AppData'];

  function walk(dir) {
    let items;
    try {
      items = fs.readdirSync(dir, { withFileTypes: true });
    } catch { return; }

    for (const item of items) {
      if (item.name.startsWith('.')) continue;
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        // System-Ordner überspringen, um Crashes zu vermeiden
        if (ignoreDirs.includes(item.name)) continue;
        walk(fullPath);
      } else {
        try {
          const stats = fs.statSync(fullPath);
          if (stats.size >= minSize) {
            largeFiles.push({
              path: fullPath,
              size: stats.size,
              sizeMB: (stats.size / (1024 * 1024)).toFixed(2)
            });
          }
        } catch { /* Ignorieren */ }
      }
    }
  }

  walk(dirPath);
  return largeFiles.sort((a, b) => b.size - a.size);
}

/**
 * Findet Duplikate basierend auf Dateigröße und SHA-256 Hash
 */
export function findDuplicates(dirPath) {
  const filesBySize = {};
  const duplicates = [];
  const ignoreDirs = ['node_modules', '.git', 'Windows', 'Program Files', 'Program Files (x86)', '$Recycle.Bin'];

  // Schritt 1: Nach Größe gruppieren
  function walk(dir) {
    let items;
    try {
      items = fs.readdirSync(dir, { withFileTypes: true });
    } catch { return; }

    for (const item of items) {
      if (item.name.startsWith('.')) continue;
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        if (ignoreDirs.includes(item.name)) continue;
        walk(fullPath);
      } else {
        try {
          const stats = fs.statSync(fullPath);
          if (stats.size === 0) continue; // Leere Dateien ignorieren
          if (!filesBySize[stats.size]) filesBySize[stats.size] = [];
          filesBySize[stats.size].push(fullPath);
        } catch { /* Ignorieren */ }
      }
    }
  }

  walk(dirPath);

  // Schritt 2: Bei gleicher Größe Hashes vergleichen
  for (const size in filesBySize) {
    const files = filesBySize[size];
    if (files.length < 2) continue;

    const hashes = {};
    for (const file of files) {
      try {
        const fileBuffer = fs.readFileSync(file);
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        
        if (!hashes[hash]) hashes[hash] = [];
        hashes[hash].push(file);
      } catch { /* Datei gesperrt */ }
    }

    for (const hash in hashes) {
      if (hashes[hash].length > 1) {
        duplicates.push({
          hash: hash,
          size: parseInt(size),
          sizeMB: (parseInt(size) / (1024 * 1024)).toFixed(2),
          files: hashes[hash]
        });
      }
    }
  }

  return duplicates;
}

/**
 * Leert die Caches gängiger Browser unter Windows
 */
export async function cleanBrowserCaches() {
  const user = process.env.USERPROFILE;
  const cachePaths = [
    // Chrome
    path.join(user, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Cache', 'Cache_Data'),
    path.join(user, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Code Cache'),
    // Edge
    path.join(user, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache', 'Cache_Data'),
    path.join(user, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Code Cache'),
    // Firefox
    path.join(user, 'AppData', 'Local', 'Mozilla', 'Firefox', 'Profiles')
  ];

  let deletedCount = 0;
  let freedBytes = 0;

  for (const cachePath of cachePaths) {
    if (!fs.existsSync(cachePath)) continue;

    // Firefox hat mehrere Profile-Ordner
    if (cachePath.endsWith('Profiles')) {
      const profiles = fs.readdirSync(cachePath, { withFileTypes: true });
      for (const profile of profiles) {
        if (profile.isDirectory()) {
          const cacheDir = path.join(cachePath, profile.name, 'cache2');
          if (fs.existsSync(cacheDir)) {
            const result = deleteFolderContents(cacheDir);
            deletedCount += result.count;
            freedBytes += result.bytes;
          }
        }
      }
    } else {
      const result = deleteFolderContents(cachePath);
      deletedCount += result.count;
      freedBytes += result.bytes;
    }
  }

  return { deletedCount, freedBytes };
}

/**
 * Hilfsfunktion: Löscht Inhalt eines Ordners und berechnet Größe
 */
function deleteFolderContents(dirPath) {
  let count = 0;
  let bytes = 0;

  function walkAndDelete(dir) {
    let items;
    try {
      items = fs.readdirSync(dir, { withFileTypes: true });
    } catch { return; }

    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      try {
        if (item.isDirectory()) {
          walkAndDelete(fullPath);
          fs.rmdirSync(fullPath);
        } else {
          bytes += fs.statSync(fullPath).size;
          fs.unlinkSync(fullPath);
          count++;
        }
      } catch { /* Datei in Benutzung (z.B. Browser offen) */ }
    }
  }

  walkAndDelete(dirPath);
  return { count, bytes };
}