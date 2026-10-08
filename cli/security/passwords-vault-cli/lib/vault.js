import fs from 'fs';
import path from 'path';
import os from 'os';
import { encrypt, decrypt, hashPassword, generateSalt } from './crypto.js';

const VAULT_DIR = path.join(os.homedir(), '.password-vault');
const VAULT_FILE = path.join(VAULT_DIR, 'vault.enc');
const META_FILE = path.join(VAULT_DIR, 'meta.json');

function ensureVaultDir() {
  if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true, mode: 0o700 });
  }
}

export function vaultExists() {
  return fs.existsSync(VAULT_FILE) && fs.existsSync(META_FILE);
}

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

  const emptyVault = { passwords: [], categories: ['Allgemein', 'Social', 'Arbeit', 'Banking', 'Shopping', 'Sonstiges'] };
  const encrypted = encrypt(emptyVault, masterPassword);

  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2), { mode: 0o600 });
  fs.writeFileSync(VAULT_FILE, encrypted, { mode: 0o600 });

  return true;
}

export function verifyPassword(masterPassword) {
  if (!vaultExists()) {
    throw new Error('Kein Vault vorhanden!');
  }

  const meta = JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
  const hash = hashPassword(masterPassword, meta.salt);
  return hash === meta.passwordHash;
}

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

export function saveVault(vault, masterPassword) {
  const encrypted = encrypt(vault, masterPassword);
  fs.writeFileSync(VAULT_FILE, encrypted, { mode: 0o600 });
}

// ============================================================
// PASSWORT-EINTRÄGE
// ============================================================

/**
 * Fügt einen neuen Passwort-Eintrag hinzu
 */
export function addPassword(masterPassword, { name, username, password, url, category, notes }) {
  const vault = loadVault(masterPassword);

  if (vault.passwords.find(p => p.name.toLowerCase() === name.toLowerCase())) {
    throw new Error(`Ein Eintrag mit dem Namen "${name}" existiert bereits!`);
  }

  const entry = {
    id: generateId(),
    name,
    username: username || '',
    password,
    url: url || '',
    category: category || 'Allgemein',
    notes: notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastUsed: null
  };

  vault.passwords.push(entry);
  saveVault(vault, masterPassword);

  return entry;
}

/**
 * Listet alle Passwörter (maskiert)
 */
export function listPasswords(masterPassword, { showFull = false, category = null } = {}) {
  const vault = loadVault(masterPassword);

  let entries = vault.passwords;
  if (category) {
    entries = entries.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }

  return entries.map(p => ({
    id: p.id,
    name: p.name,
    username: p.username,
    password: showFull ? p.password : maskPassword(p.password),
    url: p.url,
    category: p.category,
    notes: p.notes,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    lastUsed: p.lastUsed
  }));
}

/**
 * Holt einen Eintrag per Name oder ID
 */
export function getPassword(masterPassword, nameOrId, { updateLastUsed = false } = {}) {
  const vault = loadVault(masterPassword);
  const search = nameOrId.toLowerCase();

  const entry = vault.passwords.find(
    p => p.name.toLowerCase() === search || p.id === nameOrId
  );

  if (!entry) {
    throw new Error(`Eintrag "${nameOrId}" nicht gefunden`);
  }

  if (updateLastUsed) {
    entry.lastUsed = new Date().toISOString();
    saveVault(vault, masterPassword);
  }

  return entry;
}

/**
 * Löscht einen Eintrag
 */
export function deletePassword(masterPassword, nameOrId) {
  const vault = loadVault(masterPassword);
  const search = nameOrId.toLowerCase();

  const index = vault.passwords.findIndex(
    p => p.name.toLowerCase() === search || p.id === nameOrId
  );

  if (index === -1) {
    throw new Error(`Eintrag "${nameOrId}" nicht gefunden`);
  }

  const deleted = vault.passwords.splice(index, 1)[0];
  saveVault(vault, masterPassword);

  return deleted;
}

/**
 * Aktualisiert einen Eintrag
 */
export function updatePassword(masterPassword, nameOrId, updates) {
  const vault = loadVault(masterPassword);
  const search = nameOrId.toLowerCase();

  const entry = vault.passwords.find(
    p => p.name.toLowerCase() === search || p.id === nameOrId
  );

  if (!entry) {
    throw new Error(`Eintrag "${nameOrId}" nicht gefunden`);
  }

  if (updates.name !== undefined) entry.name = updates.name;
  if (updates.username !== undefined) entry.username = updates.username;
  if (updates.password !== undefined) entry.password = updates.password;
  if (updates.url !== undefined) entry.url = updates.url;
  if (updates.category !== undefined) entry.category = updates.category;
  if (updates.notes !== undefined) entry.notes = updates.notes;

  entry.updatedAt = new Date().toISOString();
  saveVault(vault, masterPassword);

  return entry;
}

/**
 * Sucht Einträge
 */
export function searchPasswords(masterPassword, query) {
  const vault = loadVault(masterPassword);
  const q = query.toLowerCase();

  return vault.passwords.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.username.toLowerCase().includes(q) ||
    p.url.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    p.notes.toLowerCase().includes(q)
  ).map(p => ({
    ...p,
    password: maskPassword(p.password)
  }));
}

/**
 * Listet alle Kategorien
 */
export function getCategories(masterPassword) {
  const vault = loadVault(masterPassword);
  return vault.categories || [];
}

/**
 * Fügt eine neue Kategorie hinzu
 */
export function addCategory(masterPassword, name) {
  const vault = loadVault(masterPassword);
  if (!vault.categories) vault.categories = [];

  if (vault.categories.find(c => c.toLowerCase() === name.toLowerCase())) {
    throw new Error(`Kategorie "${name}" existiert bereits`);
  }

  vault.categories.push(name);
  saveVault(vault, masterPassword);
  return name;
}

/**
 * Zeigt Statistiken
 */
export function getStats(masterPassword) {
  const vault = loadVault(masterPassword);

  const total = vault.passwords.length;
  const withUsername = vault.passwords.filter(p => p.username).length;
  const withUrl = vault.passwords.filter(p => p.url).length;

  // Nach Kategorie gruppieren
  const byCategory = {};
  for (const p of vault.passwords) {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
  }

  // Schwache Passwörter finden
  const weakPasswords = vault.passwords.filter(p => {
    if (p.password.length < 8) return true;
    if (!/[A-Z]/.test(p.password)) return true;
    if (!/[0-9]/.test(p.password)) return true;
    return false;
  }).map(p => p.name);

  return {
    total,
    withUsername,
    withUrl,
    byCategory,
    weakPasswords,
    categories: vault.categories?.length || 0
  };
}

// ============================================================
// EXPORT / IMPORT
// ============================================================

export function exportVault(masterPassword) {
  const vault = loadVault(masterPassword);
  return encrypt(vault, masterPassword);
}

export function importVault(masterPassword, encryptedBackup, { merge = false } = {}) {
  const imported = decrypt(encryptedBackup, masterPassword);

  if (!imported.passwords || !Array.isArray(imported.passwords)) {
    throw new Error('Ungültiges Backup-Format');
  }

  if (merge) {
    const vault = loadVault(masterPassword);
    let added = 0;

    for (const entry of imported.passwords) {
      if (!vault.passwords.find(p => p.name.toLowerCase() === entry.name.toLowerCase())) {
        vault.passwords.push(entry);
        added++;
      }
    }

    // Kategorien mergen
    if (imported.categories) {
      if (!vault.categories) vault.categories = [];
      for (const cat of imported.categories) {
        if (!vault.categories.find(c => c.toLowerCase() === cat.toLowerCase())) {
          vault.categories.push(cat);
        }
      }
    }

    saveVault(vault, masterPassword);
    return added;
  } else {
    saveVault(imported, masterPassword);
    return imported.passwords.length;
  }
}

// ============================================================
// HILFSFUNKTIONEN
// ============================================================

function maskPassword(password) {
  if (!password) return '••••••••';
  return '•'.repeat(Math.min(password.length, 16));
}

function generateId() {
  return Math.random().toString(36).substring(2, 10) +
         Date.now().toString(36).substring(-4);
}

export function getVaultPath() {
  return VAULT_FILE;
}