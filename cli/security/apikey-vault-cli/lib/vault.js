import fs from 'fs';
import path from 'path';
import os from 'os';
import { encrypt, decrypt, hashPassword, generateSalt } from './crypto.js';

const VAULT_DIR = path.join(os.homedir(), '.apikey-vault');
const VAULT_FILE = path.join(VAULT_DIR, 'vault.enc');
const META_FILE = path.join(VAULT_DIR, 'meta.json');

/**
 * Stellt sicher dass der Vault-Ordner existiert
 */
function ensureVaultDir() {
  if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Prüft ob ein Vault existiert
 */
export function vaultExists() {
  return fs.existsSync(VAULT_FILE) && fs.existsSync(META_FILE);
}

/**
 * Erstellt einen neuen Vault mit Master-Passwort
 */
export function createVault(masterPassword) {
  ensureVaultDir();

  if (vaultExists()) {
    throw new Error('Vault existiert bereits!');
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(masterPassword, salt);

  const meta = {
    version: 1,
    salt,
    passwordHash,
    createdAt: new Date().toISOString()
  };

  const emptyVault = { keys: [] };
  const encrypted = encrypt(emptyVault, masterPassword);

  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2), { mode: 0o600 });
  fs.writeFileSync(VAULT_FILE, encrypted, { mode: 0o600 });

  return true;
}

/**
 * Prüft das Master-Passwort
 */
export function verifyPassword(masterPassword) {
  if (!vaultExists()) {
    throw new Error('Kein Vault vorhanden!');
  }

  const meta = JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
  const hash = hashPassword(masterPassword, meta.salt);
  return hash === meta.passwordHash;
}

/**
 * Lädt den Vault (entschlüsselt)
 */
export function loadVault(masterPassword) {
  if (!vaultExists()) {
    throw new Error('Kein Vault vorhanden!');
  }

  if (!verifyPassword(masterPassword)) {
    throw new Error('Falsches Master-Passwort!');
  }

  const encrypted = fs.readFileSync(VAULT_FILE, 'utf8');
  return decrypt(encrypted, masterPassword);
}

/**
 * Speichert den Vault (verschlüsselt)
 */
export function saveVault(vault, masterPassword) {
  const encrypted = encrypt(vault, masterPassword);
  fs.writeFileSync(VAULT_FILE, encrypted, { mode: 0o600 });
}

/**
 * Fügt einen neuen API-Key hinzu
 */
export function addKey(masterPassword, { name, key, service, notes }) {
  const vault = loadVault(masterPassword);

  // Prüfen ob Name schon existiert
  if (vault.keys.find(k => k.name.toLowerCase() === name.toLowerCase())) {
    throw new Error(`Ein Key mit dem Namen "${name}" existiert bereits!`);
  }

  const entry = {
    id: generateId(),
    name,
    key,
    service: service || '',
    notes: notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  vault.keys.push(entry);
  saveVault(vault, masterPassword);

  return entry;
}

/**
 * Zeigt alle Keys (maskiert)
 */
export function listKeys(masterPassword, { showFull = false } = {}) {
  const vault = loadVault(masterPassword);

  return vault.keys.map(k => ({
    id: k.id,
    name: k.name,
    key: showFull ? k.key : maskKey(k.key),
    service: k.service,
    notes: k.notes,
    createdAt: k.createdAt,
    updatedAt: k.updatedAt
  }));
}

/**
 * Holt einen Key per Name oder ID
 */
export function getKey(masterPassword, nameOrId) {
  const vault = loadVault(masterPassword);
  const search = nameOrId.toLowerCase();

  const entry = vault.keys.find(
    k => k.name.toLowerCase() === search || k.id === nameOrId
  );

  if (!entry) {
    throw new Error(`Key "${nameOrId}" nicht gefunden`);
  }

  return entry;
}

/**
 * Löscht einen Key
 */
export function deleteKey(masterPassword, nameOrId) {
  const vault = loadVault(masterPassword);
  const search = nameOrId.toLowerCase();

  const index = vault.keys.findIndex(
    k => k.name.toLowerCase() === search || k.id === nameOrId
  );

  if (index === -1) {
    throw new Error(`Key "${nameOrId}" nicht gefunden`);
  }

  const deleted = vault.keys.splice(index, 1)[0];
  saveVault(vault, masterPassword);

  return deleted;
}

/**
 * Aktualisiert einen Key
 */
export function updateKey(masterPassword, nameOrId, updates) {
  const vault = loadVault(masterPassword);
  const search = nameOrId.toLowerCase();

  const entry = vault.keys.find(
    k => k.name.toLowerCase() === search || k.id === nameOrId
  );

  if (!entry) {
    throw new Error(`Key "${nameOrId}" nicht gefunden`);
  }

  if (updates.name !== undefined) entry.name = updates.name;
  if (updates.key !== undefined) entry.key = updates.key;
  if (updates.service !== undefined) entry.service = updates.service;
  if (updates.notes !== undefined) entry.notes = updates.notes;

  entry.updatedAt = new Date().toISOString();
  saveVault(vault, masterPassword);

  return entry;
}

/**
 * Sucht Keys
 */
export function searchKeys(masterPassword, query) {
  const vault = loadVault(masterPassword);
  const q = query.toLowerCase();

  return vault.keys.filter(k =>
    k.name.toLowerCase().includes(q) ||
    k.service.toLowerCase().includes(q) ||
    k.notes.toLowerCase().includes(q)
  ).map(k => ({
    ...k,
    key: maskKey(k.key)
  }));
}

/**
 * Exportiert alle Keys (verschlüsselt als Backup)
 */
export function exportVault(masterPassword) {
  const vault = loadVault(masterPassword);
  return encrypt(vault, masterPassword);
}

/**
 * Importiert Keys aus einem Backup
 */
export function importVault(masterPassword, encryptedBackup, { merge = false } = {}) {
  const imported = decrypt(encryptedBackup, masterPassword);

  if (!imported.keys || !Array.isArray(imported.keys)) {
    throw new Error('Ungültiges Backup-Format');
  }

  if (merge) {
    const vault = loadVault(masterPassword);
    let added = 0;

    for (const key of imported.keys) {
      if (!vault.keys.find(k => k.name.toLowerCase() === key.name.toLowerCase())) {
        vault.keys.push(key);
        added++;
      }
    }

    saveVault(vault, masterPassword);
    return added;
  } else {
    saveVault(imported, masterPassword);
    return imported.keys.length;
  }
}

/**
 * Hilfsfunktionen
 */
function maskKey(key) {
  if (!key || key.length < 8) return '••••••••';
  const start = key.substring(0, 4);
  const end = key.substring(key.length - 4);
  return `${start}${'•'.repeat(20)}${end}`;
}

function generateId() {
  return Math.random().toString(36).substring(2, 10) +
         Date.now().toString(36).substring(-4);
}

export function getVaultPath() {
  return VAULT_FILE;
}