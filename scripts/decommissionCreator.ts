/**
 * Creator Decommissioning Script
 * Removes or archives a creator's Supabase resources when they cancel or uninstall
 */

import { createClient } from '@supabase/supabase-js';
import pino from 'pino';

const logger = pino({ name: 'decommission-creator' });

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_URL) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL');
}

export interface DecommissionCreatorParams {
  creatorSlug: string;
  whopCreatorId: string;
  hardDelete?: boolean; // If true, permanently delete. If false, archive/soft delete
}

export interface DecommissionResult {
  success: boolean;
  resourcesRemoved: string[];
  error?: string;
}

/**
 * Decommission a creator's resources
 *
 * Options:
 * 1. Soft delete: Mark creator as inactive, keep data for 30 days
 * 2. Hard delete: Permanently remove all data (videos, chunks, storage)
 *
 * Default behavior is soft delete for data retention and potential recovery
 */
export async function decommissionCreator(
  params: DecommissionCreatorParams
): Promise<DecommissionResult> {
  const { creatorSlug, whopCreatorId, hardDelete = false } = params;

  logger.info(
    { creatorSlug, whopCreatorId, hardDelete },
    'Starting creator decommissioning'
  );

  const resourcesRemoved: string[] = [];

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Step 1: Find creator record
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('id')
      .eq('whop_company_id', whopCreatorId)
      .single();

    if (creatorError || !creator) {
      logger.warn({ whopCreatorId }, 'Creator not found, nothing to decommission');
      return {
        success: true,
        resourcesRemoved: ['creator_not_found'],
      };
    }

    const creatorId = creator.id;

    if (hardDelete) {
      // HARD DELETE: Permanently remove all data
      logger.warn({ creatorId }, 'Performing HARD DELETE of creator resources');

      // Step 2: Delete all video chunks
      const { error: chunksError } = await supabase
        .from('video_chunks')
        .delete()
        .eq('creator_id', creatorId);

      if (!chunksError) {
        resourcesRemoved.push('video_chunks');
        logger.info({ creatorId }, 'Video chunks deleted');
      }

      // Step 3: Delete all videos
      const { error: videosError } = await supabase
        .from('videos')
        .delete()
        .eq('creator_id', creatorId);

      if (!videosError) {
        resourcesRemoved.push('videos');
        logger.info({ creatorId }, 'Videos deleted');
      }

      // Step 4: Delete chat sessions and messages
      const { error: chatError } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('creator_id', creatorId);

      if (!chatError) {
        resourcesRemoved.push('chat_sessions');
        logger.info({ creatorId }, 'Chat sessions deleted');
      }

      // Step 5: Delete enrollments
      const { error: enrollmentsError } = await supabase
        .from('enrollments')
        .delete()
        .eq('creator_id', creatorId);

      if (!enrollmentsError) {
        resourcesRemoved.push('enrollments');
        logger.info({ creatorId }, 'Enrollments deleted');
      }

      // Step 6: Delete storage files
      await deleteCreatorStorageFiles(creatorSlug);
      resourcesRemoved.push('storage_files');

      // Step 7: Delete creator record
      const { error: deleteCreatorError } = await supabase
        .from('creators')
        .delete()
        .eq('id', creatorId);

      if (!deleteCreatorError) {
        resourcesRemoved.push('creator_record');
        logger.info({ creatorId }, 'Creator record deleted');
      }
    } else {
      // SOFT DELETE: Archive creator and mark as inactive
      logger.info({ creatorId }, 'Performing SOFT DELETE (archiving) of creator');

      // Mark creator as inactive
      const { error: updateError } = await supabase
        .from('creators')
        .update({
          subscription_tier: 'cancelled',
          settings: {
            ...creator.settings,
            cancelled_at: new Date().toISOString(),
            deletion_scheduled: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          },
        })
        .eq('id', creatorId);

      if (!updateError) {
        resourcesRemoved.push('creator_archived');
        logger.info({ creatorId }, 'Creator marked as cancelled');
      }

      // Mark all enrollments as inactive
      await supabase
        .from('enrollments')
        .update({ status: 'inactive' })
        .eq('creator_id', creatorId);

      resourcesRemoved.push('enrollments_deactivated');
    }

    logger.info(
      { creatorId, resourcesRemoved, hardDelete },
      'Creator decommissioning completed'
    );

    return {
      success: true,
      resourcesRemoved,
    };
  } catch (error) {
    logger.error({ error, creatorSlug }, 'Creator decommissioning failed');
    return {
      success: false,
      resourcesRemoved,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Delete all storage files for a creator
 */
async function deleteCreatorStorageFiles(creatorSlug: string): Promise<void> {
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const buckets = ['videos', 'assets', 'thumbnails'];

    for (const bucket of buckets) {
      // List all files in creator's folder
      const { data: files, error: listError } = await supabase.storage
        .from(bucket)
        .list(creatorSlug, {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (listError || !files || files.length === 0) {
        logger.debug({ bucket, creatorSlug }, 'No files to delete or error listing');
        continue;
      }

      // Delete all files
      const filePaths = files.map((file) => `${creatorSlug}/${file.name}`);
      const { error: deleteError } = await supabase.storage
        .from(bucket)
        .remove(filePaths);

      if (deleteError) {
        logger.warn({ bucket, error: deleteError }, 'Error deleting storage files');
      } else {
        logger.info(
          { bucket, filesDeleted: filePaths.length },
          'Storage files deleted'
        );
      }
    }
  } catch (error) {
    logger.error({ error, creatorSlug }, 'Error deleting storage files');
  }
}

/**
 * Utility: Permanently delete archived creators past retention period
 * Run this as a scheduled job (e.g., daily cron)
 */
export async function purgeExpiredCreators(): Promise<{
  success: boolean;
  purged: number;
  error?: string;
}> {
  try {
    logger.info('Starting purge of expired creators');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Find creators with deletion_scheduled in the past
    const { data: expiredCreators, error: fetchError } = await supabase
      .from('creators')
      .select('id, handle, whop_company_id, settings')
      .eq('subscription_tier', 'cancelled')
      .lt('settings->deletion_scheduled', new Date().toISOString());

    if (fetchError || !expiredCreators || expiredCreators.length === 0) {
      logger.info('No expired creators to purge');
      return { success: true, purged: 0 };
    }

    logger.info({ count: expiredCreators.length }, 'Found expired creators to purge');

    let purgedCount = 0;

    for (const creator of expiredCreators) {
      const result = await decommissionCreator({
        creatorSlug: creator.handle,
        whopCreatorId: creator.whop_company_id,
        hardDelete: true,
      });

      if (result.success) {
        purgedCount++;
      }
    }

    logger.info({ purgedCount }, 'Expired creators purged successfully');

    return { success: true, purged: purgedCount };
  } catch (error) {
    logger.error({ error }, 'Error purging expired creators');
    return {
      success: false,
      purged: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Utility: Restore a soft-deleted creator (within retention period)
 */
export async function restoreCreator(
  whopCreatorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { error: updateError } = await supabase
      .from('creators')
      .update({
        subscription_tier: 'starter',
        settings: {
          restored_at: new Date().toISOString(),
        },
      })
      .eq('whop_company_id', whopCreatorId)
      .eq('subscription_tier', 'cancelled');

    if (updateError) {
      throw updateError;
    }

    // Reactivate enrollments
    await supabase
      .from('enrollments')
      .update({ status: 'active' })
      .eq('creator_id', whopCreatorId);

    logger.info({ whopCreatorId }, 'Creator restored successfully');

    return { success: true };
  } catch (error) {
    logger.error({ error, whopCreatorId }, 'Error restoring creator');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
