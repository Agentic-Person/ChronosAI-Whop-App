#!/usr/bin/env node

/**
 * Encryption Key Generator
 *
 * Generates a secure 64-character hexadecimal string for WHOP_TOKEN_ENCRYPTION_KEY.
 * This key is used to encrypt and decrypt Whop OAuth tokens stored in the database.
 *
 * Usage:
 *   node scripts/generate-encryption-key.js
 *
 * Security Notes:
 * - This generates a cryptographically secure random key using Node.js crypto module
 * - The key is 32 bytes (256 bits) represented as 64 hexadecimal characters
 * - Store this key securely in your environment variables
 * - NEVER commit this key to version control
 * - Use different keys for staging and production environments
 * - Rotate keys periodically (quarterly recommended)
 */

const crypto = require('crypto');

console.log('='.repeat(80));
console.log('WHOP TOKEN ENCRYPTION KEY GENERATOR');
console.log('='.repeat(80));
console.log('');

// Generate 32 random bytes (256 bits)
const keyBuffer = crypto.randomBytes(32);

// Convert to hexadecimal string (64 characters)
const key = keyBuffer.toString('hex');

// Validate key length
if (key.length !== 64) {
  console.error('ERROR: Generated key is not 64 characters long!');
  process.exit(1);
}

// Display the key
console.log('Generated Encryption Key:');
console.log('');
console.log('┌' + '─'.repeat(66) + '┐');
console.log('│ ' + key + ' │');
console.log('└' + '─'.repeat(66) + '┘');
console.log('');

// Display usage instructions
console.log('IMPORTANT: Copy the key above and store it securely!');
console.log('');
console.log('Usage:');
console.log('  1. Copy the 64-character key above (between the box)');
console.log('  2. Add to your environment variables:');
console.log('');
console.log('     WHOP_TOKEN_ENCRYPTION_KEY=' + key);
console.log('');
console.log('  3. For Vercel deployment:');
console.log('     a. Go to Vercel Dashboard → Your Project → Settings');
console.log('     b. Navigate to Environment Variables');
console.log('     c. Add new variable:');
console.log('        - Key: WHOP_TOKEN_ENCRYPTION_KEY');
console.log('        - Value: (paste the key above)');
console.log('        - Environments: Production, Preview, Development');
console.log('');
console.log('  4. For local development:');
console.log('     a. Add to your .env.local file:');
console.log('        WHOP_TOKEN_ENCRYPTION_KEY=' + key);
console.log('     b. Never commit .env.local to git!');
console.log('');

// Security warnings
console.log('SECURITY WARNINGS:');
console.log('  ⚠ NEVER commit this key to version control (git, GitHub, etc.)');
console.log('  ⚠ Store it securely (password manager, Vercel dashboard, etc.)');
console.log('  ⚠ Use different keys for staging and production');
console.log('  ⚠ If compromised, generate a new key immediately');
console.log('  ⚠ Rotating this key will invalidate all existing user sessions');
console.log('');

// Generate additional metadata
const timestamp = new Date().toISOString();
const checksum = crypto.createHash('sha256').update(key).digest('hex').substring(0, 8);

console.log('Key Metadata:');
console.log('  Generated: ' + timestamp);
console.log('  Checksum:  ' + checksum + ' (first 8 chars of SHA-256 hash)');
console.log('  Length:    ' + key.length + ' characters (32 bytes)');
console.log('  Format:    Hexadecimal');
console.log('');

console.log('='.repeat(80));
console.log('Key generation complete! Store it securely and add to environment variables.');
console.log('='.repeat(80));
console.log('');

// Optional: Validate the key works with crypto
try {
  const testCipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), crypto.randomBytes(16));
  console.log('✓ Key validation passed - compatible with AES-256 encryption');
  console.log('');
} catch (error) {
  console.error('✗ Key validation failed:', error.message);
  process.exit(1);
}
