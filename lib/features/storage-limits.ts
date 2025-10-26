/**
 * Storage Limits Configuration
 *
 * Defines storage tier limits and provides utilities for checking
 * storage quotas in the multi-tenant video platform.
 */

import { getSupabaseAdmin } from '@/lib/infrastructure/database/connection-pool';
import { logError, logInfo } from '@/lib/infrastructure/monitoring/logger';

// ============================================================================
// TIER CONFIGURATIONS
// ============================================================================

export type MembershipTier = 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';

export interface TierLimits {
  tier: MembershipTier;
  storageLimitGB: number;
  storageLimitBytes: number;
  maxVideoCount: number | null; // null means unlimited
  maxVideoSizeMB: number;
  dailyChatLimit: number | null; // null means unlimited
  monthlyProcessingMinutes: number | null; // null means unlimited
  features: {
    chat: boolean;
    upload: boolean;
    analytics: boolean;
    api: boolean;
    team: boolean;
  };
  monthlyPriceUSD: number;
}

/**
 * Storage tier configurations
 * Matches database tier_configurations table
 */
export const STORAGE_TIERS: Record<MembershipTier, TierLimits> = {
  FREE: {
    tier: 'FREE',
    storageLimitGB: 5,
    storageLimitBytes: 5 * 1024 * 1024 * 1024, // 5GB
    maxVideoCount: 10,
    maxVideoSizeMB: 500,
    dailyChatLimit: 3,
    monthlyProcessingMinutes: 60,
    features: {
      chat: true,
      upload: true,
      analytics: false,
      api: false,
      team: false,
    },
    monthlyPriceUSD: 0,
  },
  BASIC: {
    tier: 'BASIC',
    storageLimitGB: 25,
    storageLimitBytes: 25 * 1024 * 1024 * 1024, // 25GB
    maxVideoCount: 50,
    maxVideoSizeMB: 500,
    dailyChatLimit: 100,
    monthlyProcessingMinutes: 300,
    features: {
      chat: true,
      upload: true,
      analytics: true,
      api: false,
      team: false,
    },
    monthlyPriceUSD: 29,
  },
  PRO: {
    tier: 'PRO',
    storageLimitGB: 100,
    storageLimitBytes: 100 * 1024 * 1024 * 1024, // 100GB
    maxVideoCount: 200,
    maxVideoSizeMB: 500,
    dailyChatLimit: 500,
    monthlyProcessingMinutes: 1000,
    features: {
      chat: true,
      upload: true,
      analytics: true,
      api: true,
      team: false,
    },
    monthlyPriceUSD: 79,
  },
  ENTERPRISE: {
    tier: 'ENTERPRISE',
    storageLimitGB: 500,
    storageLimitBytes: 500 * 1024 * 1024 * 1024, // 500GB
    maxVideoCount: null, // unlimited
    maxVideoSizeMB: 500,
    dailyChatLimit: null, // unlimited
    monthlyProcessingMinutes: null, // unlimited
    features: {
      chat: true,
      upload: true,
      analytics: true,
      api: true,
      team: true,
    },
    monthlyPriceUSD: 299,
  },
};

// ============================================================================
// STORAGE USAGE TYPES
// ============================================================================

export interface StorageUsage {
  creatorId: string;
  tier: MembershipTier;
  bytesUsed: number;
  bytesLimit: number;
  percentageUsed: number;
  videoCount: number;
  maxVideos: number | null;
  canUpload: boolean;
  canUploadSize: (sizeBytes: number) => boolean;
}

export interface StorageCheckResult {
  allowed: boolean;
  reason?: string;
  usage?: StorageUsage;
}

// ============================================================================
// STORAGE LIMIT FUNCTIONS
// ============================================================================

/**
 * Get storage limits for a specific tier
 */
export function getTierLimits(tier: MembershipTier): TierLimits {
  return STORAGE_TIERS[tier];
}

/**
 * Get creator's current storage usage
 */
export async function getStorageUsage(creatorId: string): Promise<StorageUsage> {
  const supabase = getSupabaseAdmin();

  // Get creator's storage record
  const { data: storage, error } = await supabase
    .from('creator_storage')
    .select('*')
    .eq('creator_id', creatorId)
    .single();

  if (error && error.code !== 'PGRST116') {
    logError('Failed to get storage usage', error, { creatorId });
    throw new Error('Failed to fetch storage usage');
  }

  // If no storage record exists, create one with FREE tier
  if (!storage) {
    const freeTier = getTierLimits('FREE');
    const { data: newStorage, error: insertError } = await supabase
      .from('creator_storage')
      .insert({
        creator_id: creatorId,
        tier: 'FREE',
        bytes_used: 0,
        bytes_limit: freeTier.storageLimitBytes,
        video_count: 0,
        max_videos: freeTier.maxVideoCount,
      })
      .select()
      .single();

    if (insertError || !newStorage) {
      logError('Failed to create storage record', insertError, { creatorId });
      throw new Error('Failed to initialize storage');
    }

    return {
      creatorId,
      tier: 'FREE',
      bytesUsed: 0,
      bytesLimit: freeTier.storageLimitBytes,
      percentageUsed: 0,
      videoCount: 0,
      maxVideos: freeTier.maxVideoCount,
      canUpload: true,
      canUploadSize: (sizeBytes: number) => sizeBytes <= freeTier.storageLimitBytes,
    };
  }

  const tier = storage.tier as MembershipTier;
  const tierLimits = getTierLimits(tier);
  const percentageUsed = (storage.bytes_used / storage.bytes_limit) * 100;

  return {
    creatorId,
    tier,
    bytesUsed: storage.bytes_used,
    bytesLimit: storage.bytes_limit,
    percentageUsed: Math.round(percentageUsed * 100) / 100,
    videoCount: storage.video_count,
    maxVideos: storage.max_videos,
    canUpload: storage.max_videos === null || storage.video_count < storage.max_videos,
    canUploadSize: (sizeBytes: number) => storage.bytes_used + sizeBytes <= storage.bytes_limit,
  };
}

/**
 * Check if creator can upload a file of given size
 */
export async function checkStorageLimit(
  creatorId: string,
  fileSizeBytes: number
): Promise<StorageCheckResult> {
  const supabase = getSupabaseAdmin();

  // Use the database function for atomic check
  const { data, error } = await supabase.rpc('check_storage_limit', {
    p_creator_id: creatorId,
    p_file_size_bytes: fileSizeBytes,
  });

  if (error) {
    logError('Storage limit check failed', error, { creatorId, fileSizeBytes });
    return {
      allowed: false,
      reason: 'Failed to check storage limits. Please try again.',
    };
  }

  if (!data) {
    const usage = await getStorageUsage(creatorId);

    // Check video count limit
    if (usage.maxVideos !== null && usage.videoCount >= usage.maxVideos) {
      return {
        allowed: false,
        reason: `Video limit reached. Your ${usage.tier} plan allows ${usage.maxVideos} videos. Upgrade to upload more.`,
        usage,
      };
    }

    // Check storage size limit
    if (!usage.canUploadSize(fileSizeBytes)) {
      const fileSizeGB = (fileSizeBytes / (1024 * 1024 * 1024)).toFixed(2);
      const remainingGB = ((usage.bytesLimit - usage.bytesUsed) / (1024 * 1024 * 1024)).toFixed(2);
      return {
        allowed: false,
        reason: `Insufficient storage. File size: ${fileSizeGB}GB, Available: ${remainingGB}GB. Upgrade your plan for more storage.`,
        usage,
      };
    }
  }

  const usage = await getStorageUsage(creatorId);
  return {
    allowed: data === true,
    usage,
  };
}

/**
 * Update storage usage after successful upload
 */
export async function updateStorageUsage(
  creatorId: string,
  bytesDelta: number,
  videoCountDelta: number = 1
): Promise<StorageUsage> {
  const supabase = getSupabaseAdmin();

  // Use the database function for atomic update
  const { data, error } = await supabase.rpc('update_storage_usage', {
    p_creator_id: creatorId,
    p_bytes_delta: bytesDelta,
    p_video_count_delta: videoCountDelta,
  });

  if (error) {
    logError('Failed to update storage usage', error, { creatorId, bytesDelta });
    throw new Error('Failed to update storage usage');
  }

  logInfo('Storage usage updated', {
    creatorId,
    bytesDelta,
    videoCountDelta,
    newUsage: data,
  });

  // Return updated usage
  return await getStorageUsage(creatorId);
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get storage usage summary for display
 */
export async function getStorageUsageSummary(creatorId: string): Promise<{
  used: string;
  limit: string;
  percentage: number;
  videosUsed: number;
  videosLimit: string;
  tier: MembershipTier;
  canUpload: boolean;
}> {
  const usage = await getStorageUsage(creatorId);

  return {
    used: formatBytes(usage.bytesUsed),
    limit: formatBytes(usage.bytesLimit),
    percentage: usage.percentageUsed,
    videosUsed: usage.videoCount,
    videosLimit: usage.maxVideos === null ? 'Unlimited' : String(usage.maxVideos),
    tier: usage.tier,
    canUpload: usage.canUpload,
  };
}

/**
 * Validate if tier is valid
 */
export function isValidTier(tier: string): tier is MembershipTier {
  return ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'].includes(tier);
}
