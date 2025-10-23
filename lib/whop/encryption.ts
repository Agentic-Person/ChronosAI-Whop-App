/**
 * Token Encryption Utilities
 *
 * Secure encryption/decryption for Whop OAuth tokens
 * Agent: Agent 14 (Whop Integration Specialist)
 */

import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.WHOP_TOKEN_ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  throw new Error(
    'WHOP_TOKEN_ENCRYPTION_KEY must be a 64-character hex string. Generate with: openssl rand -hex 32'
  );
}

/**
 * Encrypt a token for secure storage
 */
export async function encrypt(text: string): Promise<string> {
  try {
    // Generate random IV and salt
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);

    // Derive key from encryption key + salt
    const key = crypto.pbkdf2Sync(
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      salt,
      100000,
      32,
      'sha512'
    );

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get auth tag
    const tag = cipher.getAuthTag();

    // Combine: salt + iv + tag + encrypted
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'hex'),
    ]);

    return combined.toString('base64');
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Decrypt a token from storage
 */
export async function decrypt(encryptedText: string): Promise<string> {
  try {
    const combined = Buffer.from(encryptedText, 'base64');

    // Extract components
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.slice(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    );
    const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    // Derive key
    const key = crypto.pbkdf2Sync(
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      salt,
      100000,
      32,
      'sha512'
    );

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    // Decrypt
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Hash a value (one-way, for comparison)
 */
export function hash(text: string): string {
  return crypto
    .createHash('sha256')
    .update(text)
    .digest('hex');
}

/**
 * Verify a hash
 */
export function verifyHash(text: string, hashedText: string): boolean {
  return hash(text) === hashedText;
}
