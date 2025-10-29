/**
 * Storage Cleanup Service
 *
 * Handles deletion of video files from Supabase Storage
 * Used when videos are deleted to free up storage space
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { logInfo, logError } from '@/lib/infrastructure/monitoring/logger';

// ============================================================================
// STORAGE DELETION
// ============================================================================

/**
 * Delete video file from Supabase Storage
 */
export async function deleteVideoFromStorage(storagePath: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();

    // Extract bucket and path from storage URL or path
    const bucket = 'videos'; // Default bucket name
    const filePath = storagePath.replace(/^\//, ''); // Remove leading slash

    logInfo('Deleting video from storage', { bucket, filePath });

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      logError('Failed to delete video from storage', error, { bucket, filePath });
      return false;
    }

    logInfo('Video deleted from storage successfully', { bucket, filePath });
    return true;
  } catch (error) {
    logError('Exception while deleting video from storage', error as Error, { storagePath });
    return false;
  }
}

/**
 * Delete multiple video files from storage
 */
export async function bulkDeleteVideosFromStorage(storagePaths: string[]): Promise<{
  successful: number;
  failed: number;
  errors: Array<{ path: string; error: string }>;
}> {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as Array<{ path: string; error: string }>,
  };

  const supabase = createAdminClient();
  const bucket = 'videos';

  // Clean paths
  const filePaths = storagePaths.map(path => path.replace(/^\//, ''));

  try {
    logInfo('Bulk deleting videos from storage', { count: filePaths.length });

    // Supabase allows batch deletion
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove(filePaths);

    if (error) {
      logError('Bulk delete failed', error);
      results.failed = filePaths.length;
      results.errors.push({
        path: 'bulk',
        error: error.message,
      });
      return results;
    }

    // Count successful deletions
    results.successful = data?.length || 0;
    results.failed = filePaths.length - results.successful;

    logInfo('Bulk delete completed', {
      total: filePaths.length,
      successful: results.successful,
      failed: results.failed,
    });

    return results;
  } catch (error) {
    logError('Exception during bulk delete', error as Error);
    results.failed = filePaths.length;
    results.errors.push({
      path: 'bulk',
      error: (error as Error).message,
    });
    return results;
  }
}

/**
 * Get storage path from video URL
 */
export function extractStoragePathFromUrl(videoUrl: string): string | null {
  try {
    // Handle different URL formats:
    // 1. Full Supabase URL: https://<project>.supabase.co/storage/v1/object/public/videos/path/to/file.mp4
    // 2. Relative path: /videos/path/to/file.mp4
    // 3. Storage path: videos/path/to/file.mp4

    if (!videoUrl) return null;

    // If it's a full URL
    if (videoUrl.startsWith('http')) {
      const url = new URL(videoUrl);
      const pathParts = url.pathname.split('/');

      // Find 'videos' bucket in path
      const videosIndex = pathParts.indexOf('videos');
      if (videosIndex === -1) return null;

      // Return everything after 'videos'
      return pathParts.slice(videosIndex + 1).join('/');
    }

    // If it starts with /videos/ or videos/
    if (videoUrl.includes('videos/')) {
      const parts = videoUrl.split('videos/');
      return parts[1] || null;
    }

    // Assume it's already a storage path
    return videoUrl;
  } catch (error) {
    logError('Failed to extract storage path from URL', error as Error, { videoUrl });
    return null;
  }
}

/**
 * Check if file exists in storage
 */
export async function checkFileExists(storagePath: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const bucket = 'videos';
    const filePath = storagePath.replace(/^\//, '');

    const { data, error } = await supabase.storage
      .from(bucket)
      .list(filePath.split('/').slice(0, -1).join('/'), {
        search: filePath.split('/').pop(),
      });

    return !error && data && data.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Get file size from storage
 */
export async function getStorageFileSize(storagePath: string): Promise<number | null> {
  try {
    const supabase = createAdminClient();
    const bucket = 'videos';
    const filePath = storagePath.replace(/^\//, '');

    const pathParts = filePath.split('/');
    const fileName = pathParts.pop();
    const directory = pathParts.join('/');

    const { data, error } = await supabase.storage
      .from(bucket)
      .list(directory, {
        search: fileName,
      });

    if (error || !data || data.length === 0) {
      return null;
    }

    const file = data.find(f => f.name === fileName);
    return file?.metadata?.size || null;
  } catch (error) {
    logError('Failed to get file size from storage', error as Error, { storagePath });
    return null;
  }
}
