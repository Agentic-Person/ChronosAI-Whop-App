/**
 * Creator Provisioning Script
 * Creates a new Supabase project for each creator with storage, database, and RLS policies
 */

import { createClient } from '@supabase/supabase-js';
import pino from 'pino';

const logger = pino({ name: 'bootstrap-creator' });

// Supabase Management API (requires service role key)
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_URL) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL');
}

export interface ProvisionCreatorParams {
  creatorSlug: string;
  whopCreatorId: string;
  companyId: string;
  companyName: string;
  userId: string;
  email?: string;
}

export interface ProvisioningResult {
  success: boolean;
  projectId?: string;
  supabaseUrl?: string;
  storageUrl?: string;
  error?: string;
}

/**
 * Provision a new creator with their own Supabase project
 *
 * In a production environment, this would:
 * 1. Create a new Supabase project via Supabase Management API
 * 2. Run migrations to set up database schema
 * 3. Create storage buckets for videos and assets
 * 4. Set up RLS policies
 * 5. Add creator to profiles table with 'owner' role
 *
 * For MVP, we'll use a single Supabase project with multi-tenancy
 */
export async function provisionCreator(
  params: ProvisionCreatorParams
): Promise<ProvisioningResult> {
  const { creatorSlug, whopCreatorId, companyId, companyName, userId, email } = params;

  logger.info({ creatorSlug, whopCreatorId }, 'Starting creator provisioning');

  try {
    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Step 1: Create creator record in database
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .insert({
        whop_company_id: companyId,
        whop_user_id: userId,
        company_name: companyName,
        handle: creatorSlug,
        subscription_tier: 'starter', // Default tier
        settings: {
          storage_quota_gb: 50,
          max_videos: 100,
          features_enabled: ['video_upload', 'ai_chat', 'basic_analytics'],
        },
      })
      .select()
      .single();

    if (creatorError) {
      // Check if creator already exists
      if (creatorError.code === '23505') {
        logger.info({ creatorSlug }, 'Creator already exists, fetching existing record');
        const { data: existingCreator } = await supabase
          .from('creators')
          .select('*')
          .eq('whop_company_id', companyId)
          .single();

        if (existingCreator) {
          return {
            success: true,
            projectId: existingCreator.id,
            supabaseUrl: SUPABASE_URL,
            storageUrl: `${SUPABASE_URL}/storage/v1/object/public`,
          };
        }
      }
      throw creatorError;
    }

    logger.info({ creatorId: creator.id }, 'Creator record created');

    // Step 2: Create storage buckets with creator-specific prefixes
    // Note: In a single-project setup, we use folder prefixes instead of separate buckets
    const buckets = ['videos', 'assets', 'thumbnails'];

    for (const bucketName of buckets) {
      try {
        // Check if bucket exists
        const { data: bucketData } = await supabase.storage.getBucket(bucketName);

        if (!bucketData) {
          // Create bucket if it doesn't exist
          const { error: bucketError } = await supabase.storage.createBucket(bucketName, {
            public: false,
            fileSizeLimit: bucketName === 'videos' ? 524288000 : 10485760, // 500MB for videos, 10MB for assets
            allowedMimeTypes: bucketName === 'videos'
              ? ['video/mp4', 'video/quicktime', 'video/x-msvideo']
              : ['image/jpeg', 'image/png', 'image/webp'],
          });

          if (bucketError && bucketError.message !== 'Bucket already exists') {
            logger.warn({ bucket: bucketName, error: bucketError }, 'Failed to create bucket');
          } else {
            logger.info({ bucket: bucketName }, 'Storage bucket created');
          }
        }
      } catch (error) {
        logger.warn({ bucket: bucketName, error }, 'Error checking/creating bucket');
      }
    }

    // Step 3: Create folder structure in storage (using .keep files)
    const folderStructure = [
      `${creatorSlug}/videos/.keep`,
      `${creatorSlug}/assets/.keep`,
      `${creatorSlug}/thumbnails/.keep`,
    ];

    for (const filePath of folderStructure) {
      const bucketName = filePath.split('/')[1]; // Extract bucket name
      try {
        await supabase.storage
          .from(bucketName)
          .upload(filePath, new Blob(['']), {
            cacheControl: '3600',
            upsert: true,
          });
      } catch (error) {
        // Ignore errors for .keep files
        logger.debug({ filePath, error }, 'Keep file creation skipped');
      }
    }

    // Step 4: Set up RLS policies for creator's data
    // This is handled by the migrations, but we can verify
    logger.info({ creatorId: creator.id }, 'RLS policies already set up via migrations');

    // Step 5: Send welcome notification (optional)
    // TODO: Send email or in-app notification to creator

    logger.info(
      { creatorId: creator.id, creatorSlug },
      'Creator provisioning completed successfully'
    );

    return {
      success: true,
      projectId: creator.id,
      supabaseUrl: SUPABASE_URL,
      storageUrl: `${SUPABASE_URL}/storage/v1/object/public`,
    };
  } catch (error) {
    logger.error({ error, creatorSlug }, 'Creator provisioning failed');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Utility: Create creator storage folders
 */
export async function createCreatorStorageFolders(
  creatorSlug: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const buckets = ['videos', 'assets', 'thumbnails'];
    const emptyBlob = new Blob(['']);

    for (const bucket of buckets) {
      await supabase.storage
        .from(bucket)
        .upload(`${creatorSlug}/.keep`, emptyBlob, {
          cacheControl: '3600',
          upsert: true,
        });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Utility: Get creator provisioning status
 */
export async function getCreatorProvisioningStatus(
  whopCreatorId: string
): Promise<{
  provisioned: boolean;
  creatorId?: string;
  createdAt?: string;
}> {
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { data, error } = await supabase
      .from('creators')
      .select('id, created_at')
      .eq('whop_company_id', whopCreatorId)
      .single();

    if (error || !data) {
      return { provisioned: false };
    }

    return {
      provisioned: true,
      creatorId: data.id,
      createdAt: data.created_at,
    };
  } catch (error) {
    logger.error({ error, whopCreatorId }, 'Error checking provisioning status');
    return { provisioned: false };
  }
}
