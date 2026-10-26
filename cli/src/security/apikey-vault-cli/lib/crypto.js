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