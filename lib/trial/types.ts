/**
 * Trial System Type Definitions
 */

export enum TrialStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CONVERTED = 'converted',
}

export interface TrialInfo {
  status: TrialStatus;
  startedAt: Date;
  expiresAt: Date;
  daysRemaining: number;
  hasDemoContent: boolean;
}

export interface TrialConversionResult {
  success: boolean;
  message: string;
  demoContentRemoved: boolean;
  newTier: string;
}
