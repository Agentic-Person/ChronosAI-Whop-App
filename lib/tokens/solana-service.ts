/**
 * Solana Blockchain Service
 * Handles all Solana blockchain operations for CHRONOS token system
 * - Wallet creation with keypair generation
 * - Private key encryption/decryption (AES-256-GCM)
 * - Token minting to user wallets
 * - Token transfers between wallets
 * - Balance queries and transaction verification
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import * as crypto from 'crypto';
import bs58 from 'bs58';
import type {
  SolanaWalletKeypair,
  SolanaNetwork,
  MintTokensResult,
  TransferTokensResult,
} from '@/types/tokens';

// ============================================================================
// Configuration
// ============================================================================

const SOLANA_NETWORK: SolanaNetwork =
  (process.env.SOLANA_NETWORK as SolanaNetwork) || 'devnet';

const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || clusterApiUrl(SOLANA_NETWORK);

// Token mint authority (platform-controlled)
const MINT_AUTHORITY_PRIVATE_KEY = process.env
  .SOLANA_MINT_AUTHORITY_PRIVATE_KEY as string;

// CHRONOS token mint address (created once, stored in env)
const CHRONOS_TOKEN_MINT_ADDRESS = process.env.CHRONOS_TOKEN_MINT_ADDRESS as string;

// Encryption key for private keys (64-character hex string)
const WALLET_ENCRYPTION_KEY = process.env
  .TOKEN_WALLET_ENCRYPTION_KEY as string;

// Validate required environment variables (only in runtime, not at build time)
const validateEnvironment = () => {
  if (!MINT_AUTHORITY_PRIVATE_KEY) {
    throw new Error('SOLANA_MINT_AUTHORITY_PRIVATE_KEY not configured');
  }

  if (!CHRONOS_TOKEN_MINT_ADDRESS) {
    throw new Error('CHRONOS_TOKEN_MINT_ADDRESS not configured');
  }

  if (!WALLET_ENCRYPTION_KEY || WALLET_ENCRYPTION_KEY.length !== 64) {
    throw new Error(
      'TOKEN_WALLET_ENCRYPTION_KEY must be a 64-character hex string'
    );
  }
};

// ============================================================================
// Connection Management
// ============================================================================

let connectionInstance: Connection | null = null;

/**
 * Get or create Solana connection
 */
export function getSolanaConnection(): Connection {
  if (!connectionInstance) {
    connectionInstance = new Connection(SOLANA_RPC_URL, 'confirmed');
  }
  return connectionInstance;
}

/**
 * Initialize Solana connection (explicit initialization)
 */
export async function initializeSolana(): Promise<Connection> {
  validateEnvironment();
  const connection = getSolanaConnection();

  // Test connection
  try {
    const version = await connection.getVersion();
    console.log(`Connected to Solana ${SOLANA_NETWORK}:`, version);
  } catch (error) {
    console.error('Failed to connect to Solana:', error);
    throw new Error('Solana connection failed');
  }

  return connection;
}

// ============================================================================
// Keypair & Wallet Management
// ============================================================================

/**
 * Create a new Solana wallet keypair
 * Returns public key (address) and private key (base58 encoded)
 */
export async function createWallet(): Promise<SolanaWalletKeypair> {
  const keypair = Keypair.generate();

  return {
    publicKey: keypair.publicKey.toBase58(),
    privateKey: bs58.encode(keypair.secretKey),
  };
}

/**
 * Get keypair from private key string
 */
export function getKeypairFromPrivateKey(privateKey: string): Keypair {
  const secretKey = bs58.decode(privateKey);
  return Keypair.fromSecretKey(secretKey);
}

/**
 * Get mint authority keypair (platform-controlled)
 */
function getMintAuthorityKeypair(): Keypair {
  validateEnvironment();
  const secretKey = bs58.decode(MINT_AUTHORITY_PRIVATE_KEY);
  return Keypair.fromSecretKey(secretKey);
}

// ============================================================================
// Private Key Encryption/Decryption
// ============================================================================

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128-bit IV for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag

/**
 * Encrypt private key with AES-256-GCM
 * Format: <IV>:<AuthTag>:<CipherText> (all hex encoded)
 */
export async function encryptPrivateKey(
  privateKey: string,
  encryptionKey: string = WALLET_ENCRYPTION_KEY
): Promise<string> {
  try {
    if (!encryptionKey) {
      throw new Error('TOKEN_WALLET_ENCRYPTION_KEY not configured');
    }

    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);

    // Convert hex encryption key to buffer
    const keyBuffer = Buffer.from(encryptionKey, 'hex');

    // Create cipher
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, keyBuffer, iv);

    // Encrypt
    const encrypted = Buffer.concat([
      cipher.update(privateKey, 'utf8'),
      cipher.final(),
    ]);

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Combine: IV:AuthTag:CipherText (all hex)
    const combined = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;

    return combined;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt private key');
  }
}

/**
 * Decrypt private key with AES-256-GCM
 * Input format: <IV>:<AuthTag>:<CipherText> (all hex encoded)
 */
export async function decryptPrivateKey(
  encryptedKey: string,
  encryptionKey: string = WALLET_ENCRYPTION_KEY
): Promise<string> {
  try {
    if (!encryptionKey) {
      throw new Error('TOKEN_WALLET_ENCRYPTION_KEY not configured');
    }

    // Split components
    const parts = encryptedKey.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted key format');
    }

    const [ivHex, authTagHex, cipherTextHex] = parts;

    // Convert from hex
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const cipherText = Buffer.from(cipherTextHex, 'hex');
    const keyBuffer = Buffer.from(encryptionKey, 'hex');

    // Create decipher
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      keyBuffer,
      iv
    );
    decipher.setAuthTag(authTag);

    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(cipherText),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt private key');
  }
}

// ============================================================================
// Token Operations
// ============================================================================

/**
 * Get CHRONOS token mint PublicKey
 */
function getBloxTokenMint(): PublicKey {
  validateEnvironment();
  return new PublicKey(CHRONOS_TOKEN_MINT_ADDRESS);
}

/**
 * Mint CHRONOS tokens to a recipient wallet
 * Returns transaction signature
 */
export async function mintTokens(
  recipientAddress: string,
  amount: number
): Promise<MintTokensResult> {
  const connection = getSolanaConnection();
  const mintAuthority = getMintAuthorityKeypair();
  const tokenMint = getBloxTokenMint();
  const recipientPublicKey = new PublicKey(recipientAddress);

  try {
    // Get or create associated token account for recipient
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      mintAuthority, // Payer
      tokenMint,
      recipientPublicKey
    );

    // Mint tokens (amount in smallest unit - no decimals for CHRONOS)
    const signature = await mintTo(
      connection,
      mintAuthority, // Payer
      tokenMint,
      recipientTokenAccount.address,
      mintAuthority, // Mint authority
      amount // Amount in base units
    );

    // Confirm transaction
    const confirmation = await connection.confirmTransaction(
      signature,
      'confirmed'
    );

    return {
      signature,
      amount,
      recipient: recipientAddress,
      confirmations: 1,
    };
  } catch (error) {
    console.error('Mint tokens failed:', error);
    throw new Error(`Failed to mint tokens: ${(error as Error).message}`);
  }
}

/**
 * Transfer CHRONOS tokens between wallets
 * Requires sender's private key
 */
export async function transferTokens(
  fromPrivateKey: string,
  toAddress: string,
  amount: number
): Promise<TransferTokensResult> {
  const connection = getSolanaConnection();
  const fromKeypair = getKeypairFromPrivateKey(fromPrivateKey);
  const toPublicKey = new PublicKey(toAddress);
  const tokenMint = getBloxTokenMint();

  try {
    // Get or create associated token accounts
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      fromKeypair,
      tokenMint,
      fromKeypair.publicKey
    );

    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      fromKeypair, // Payer
      tokenMint,
      toPublicKey
    );

    // Transfer tokens
    const signature = await transfer(
      connection,
      fromKeypair, // Payer
      fromTokenAccount.address,
      toTokenAccount.address,
      fromKeypair.publicKey, // Owner
      amount
    );

    // Confirm transaction
    await connection.confirmTransaction(signature, 'confirmed');

    return {
      signature,
      amount,
      from: fromKeypair.publicKey.toBase58(),
      to: toAddress,
      confirmations: 1,
    };
  } catch (error) {
    console.error('Transfer tokens failed:', error);
    throw new Error(`Failed to transfer tokens: ${(error as Error).message}`);
  }
}

/**
 * Get on-chain CHRONOS token balance for a wallet
 * Returns balance in CHRONOS (base units)
 */
export async function getBalance(walletAddress: string): Promise<number> {
  const connection = getSolanaConnection();
  const walletPublicKey = new PublicKey(walletAddress);
  const tokenMint = getBloxTokenMint();

  try {
    // Get associated token account
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      getMintAuthorityKeypair(), // Payer (temporary - need to optimize)
      tokenMint,
      walletPublicKey
    );

    // Get account info
    const accountInfo = await getAccount(connection, tokenAccount.address);

    return Number(accountInfo.amount);
  } catch (error) {
    console.error('Get balance failed:', error);
    // If account doesn't exist, balance is 0
    return 0;
  }
}

/**
 * Verify a transaction signature exists and is confirmed
 */
export async function verifyTransaction(signature: string): Promise<boolean> {
  const connection = getSolanaConnection();

  try {
    const status = await connection.getSignatureStatus(signature);

    if (!status || !status.value) {
      return false;
    }

    // Check if confirmed
    return status.value.confirmationStatus === 'confirmed' ||
      status.value.confirmationStatus === 'finalized';
  } catch (error) {
    console.error('Verify transaction failed:', error);
    return false;
  }
}

/**
 * Get SOL balance for a wallet (for gas fees)
 */
export async function getSolBalance(walletAddress: string): Promise<number> {
  const connection = getSolanaConnection();
  const publicKey = new PublicKey(walletAddress);

  try {
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Get SOL balance failed:', error);
    return 0;
  }
}

/**
 * Airdrop SOL to a wallet (Devnet only, for gas fees)
 */
export async function airdropSol(
  walletAddress: string,
  amount: number = 1
): Promise<string> {
  if (SOLANA_NETWORK !== 'devnet') {
    throw new Error('Airdrops only available on Devnet');
  }

  const connection = getSolanaConnection();
  const publicKey = new PublicKey(walletAddress);

  try {
    const signature = await connection.requestAirdrop(
      publicKey,
      amount * LAMPORTS_PER_SOL
    );

    await connection.confirmTransaction(signature, 'confirmed');

    return signature;
  } catch (error) {
    console.error('Airdrop failed:', error);
    throw new Error(`Failed to airdrop SOL: ${(error as Error).message}`);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a random encryption key (64-character hex)
 * Use this once to generate TOKEN_WALLET_ENCRYPTION_KEY
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate Solana address format
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    const publicKey = new PublicKey(address);
    return PublicKey.isOnCurve(publicKey.toBytes());
  } catch {
    return false;
  }
}

/**
 * Get network info
 */
export function getNetworkInfo() {
  return {
    network: SOLANA_NETWORK,
    rpcUrl: SOLANA_RPC_URL,
    tokenMint: CHRONOS_TOKEN_MINT_ADDRESS,
  };
}

// ============================================================================
// Export Service Object
// ============================================================================

export const SolanaService = {
  // Connection
  initializeSolana,
  getSolanaConnection,
  getNetworkInfo,

  // Wallet management
  createWallet,
  getKeypairFromPrivateKey,
  isValidSolanaAddress,

  // Encryption
  encryptPrivateKey,
  decryptPrivateKey,
  generateEncryptionKey,

  // Token operations
  mintTokens,
  transferTokens,
  getBalance,
  getSolBalance,
  airdropSol,
  verifyTransaction,
};

export default SolanaService;
