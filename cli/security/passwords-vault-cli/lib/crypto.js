import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;

/**
 * Leitet einen Schlüssel aus dem Master-Passwort ab (PBKDF2)
 */
export function deriveKey(masterPassword, salt) {
  return crypto.pbkdf2Sync(
    masterPassword,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha512'
  );
}

/**
 * Verschlüsselt Daten mit AES-256-GCM
 */
export function encrypt(data, masterPassword) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(masterPassword, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), 'utf8'),
    cipher.final()
  ]);

  const tag = cipher.getAuthTag();

  // Format: salt + iv + tag + encrypted
  const result = Buffer.concat([salt, iv, tag, encrypted]);
  return result.toString('base64');
}

/**
 * Entschlüsselt Daten mit AES-256-GCM
 */
export function decrypt(encryptedBase64, masterPassword) {
  const buffer = Buffer.from(encryptedBase64, 'base64');

  const salt = buffer.subarray(0, SALT_LENGTH);
  const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const key = deriveKey(masterPassword, salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch (error) {
    throw new Error('Falsches Master-Passwort oder beschädigte Daten');
  }
}

/**
 * Erzeugt einen SHA-256 Hash (zum Verifizieren des Master-Passworts)
 */
export function hashPassword(password, salt) {
  return crypto
    .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, 'sha512')
    .toString('hex');
}

/**
 * Erzeugt ein neues Salt
 */
export function generateSalt() {
  return crypto.randomBytes(SALT_LENGTH).toString('hex');
}

/**
 * Generiert ein sicheres zufälliges Passwort
 */
export function generatePassword(length = 20, options = {}) {
  const {
    lowercase = true,
    uppercase = true,
    numbers = true,
    symbols = true,
    excludeAmbiguous = true
  } = options;

  let chars = '';
  if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (numbers) chars += '0123456789';
  if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (excludeAmbiguous) {
    chars = chars.replace(/[il1Lo0O]/g, '');
  }

  if (chars.length === 0) {
    throw new Error('Mindestens eine Zeichengruppe muss aktiviert sein');
  }

  let password = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }

  return password;
}

/**
 * Berechnet die Passwort-Stärke (0-100)
 */
export function calculateStrength(password) {
  if (!password) return { score: 0, label: 'Leer', color: 'red' };

  let score = 0;

  // Länge
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 15;
  if (password.length >= 16) score += 15;
  if (password.length >= 20) score += 10;

  // Zeichenvielfalt
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^a-zA-Z0-9]/.test(password)) score += 10;

  // Bonus: gemischt
  if (password.length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password)) {
    score += 10;
  }

  // Malus: Wiederholungen
  if (/(.)\1{2,}/.test(password)) score -= 10;
  if (/^[a-zA-Z]+$/.test(password)) score -= 15;
  if (/^\d+$/.test(password)) score -= 20;

  score = Math.max(0, Math.min(100, score));

  let label, color;
  if (score >= 80) { label = 'Sehr stark'; color = 'green'; }
  else if (score >= 60) { label = 'Stark'; color = 'green'; }
  else if (score >= 40) { label = 'Mittel'; color = 'yellow'; }
  else if (score >= 20) { label = 'Schwach'; color = 'red'; }
  else { label = 'Sehr schwach'; color = 'red'; }

  return { score, label, color };
}