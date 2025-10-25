/**
 * CHRONOS Token System - Main Export
 * Central export point for all token-related services
 */

// Export everything from solana-service EXCEPT getBalance to avoid conflict
export {
  getSolanaConnection,
  initializeSolana,
  createWallet,
  getKeypairFromPrivateKey,
  encryptPrivateKey,
  decryptPrivateKey,
  mintTokens,
  transferTokens,
  getSolBalance,
  airdropSol,
  verifyTransaction,
  isValidSolanaAddress,
  getNetworkInfo,
  generateEncryptionKey,
} from './solana-service';

// Export everything from wallet-service
export * from './wallet-service';
export * from './reward-engine';
export * from './redemption-service';

// Re-export default services
export { default as SolanaService } from './solana-service';
export { default as WalletService } from './wallet-service';
export { default as RewardEngine } from './reward-engine';
export { default as RedemptionService } from './redemption-service';

// Export getBalance from wallet-service as the primary implementation
// If you need Solana's getBalance, import directly from './solana-service'
export { getBalance } from './wallet-service';
