/**
 * Video Upload Handler
 *
 * Handles video file uploads to Supabase Storage with:
 * - Presigned URL generation
 * - File validation
 * - Storage limit enforcement
 * - Database record creation
 * - Multi-tenant isolation
 */

import { getSupabaseAdmin } from '@/lib/infrastructure/database/connection-pool';
import { logInfo, logError } from '@/lib/infrastructure/monitoring/logger';
import { inngest } from '@/lib/infrastructure/jobs/inngest-client';
import { checkStorageLimit, updateStorageUsage } from '@/lib/features/storage-limits';
import {
  UploadUrlRequest,
  UploadUrlResponse,
  CreateVideoData,
  Video,
  VideoValidationResult,
  VideoLimits,
  UploadError,
  VIDEO_PROCESSING_CONSTANTS,
} from './types';

// ============================================================================
// SUPABASE STORAGE CONFIGURATION
// ============================================================================

const STORAGE_BUCKET = 'videos';
const UPLOAD_URL_EXPIRATION = 15 * 60; // 15 minutes in seconds

// ============================================================================
// FILE VALIDATION
// ============================================================================

/**
 * Validates video file before upload
 */
export function validateVideoFile(
  filename: string,
  contentType: string,
  fileSize: number
): VideoValidationResult {
  const errors: string[] = [];

  // Check file size
  if (fileSize > VIDEO_PROCESSING_CONSTANTS.MAX_FILE_SIZE) {
    const maxGB = VIDEO_PROCESSING_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024 * 1024);
    errors.push(`File size exceeds maximum of ${maxGB}GB`);
  }

  if (fileSize === 0) {
    errors.push('File is empty');
  }

  // Check content type
  if (!VIDEO_PROCESSING_CONSTANTS.ALLOWED_MIME_TYPES.includes(contentType)) {
    errors.push(
      `Invalid file type. Allowed: ${VIDEO_PROCESSING_CONSTANTS.ALLOWED_MIME_TYPES.join(', ')}`
    );
  }

  // Check file extension
  const extension = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!extension || !VIDEO_PROCESSING_CONSTANTS.ALLOWED_EXTENSIONS.includes(extension)) {
    errors.push(
      `Invalid file extension. Allowed: ${VIDEO_PROCESSING_CONSTANTS.ALLOWED_EXTENSIONS.join(', ')}`
    );
  }

  // Check for dangerous characters in filename
  if (/[<>:"|?*\x00-\x1F]/.test(filename)) {
    errors.push('Filename contains invalid characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// STORAGE HELPERS
// ============================================================================

/**
 * Generate storage path for video file
 * Format: /videos/{creator_id}/{video_id}/original.{ext}
 */
function generateStoragePath(creatorId: string, videoId: string, filename: string): string {
  const extension = filename.toLowerCase().match(/\.[^.]+$/)?.[0] || '.mp4';
  return `${creatorId}/${videoId}/original${extension}`;
}

// ============================================================================
// SUPABASE STORAGE UPLOAD URL GENERATION
// ============================================================================

/**
 * Generate presigned URL for direct upload to Supabase Storage
 */
export async function generateUploadUrl(
  creatorId: string,
  request: UploadUrlRequest
): Promise<UploadUrlResponse> {
  const { filename, contentType, fileSize } = request;
  const supabase = getSupabaseAdmin();

  // Validate file
  const validation = validateVideoFile(filename, contentType, fileSize);
  if (!validation.valid) {
    throw new UploadError(`Invalid video file: ${validation.errors.join(', ')}`, {
      errors: validation.errors,
    });
  }

  // Check storage limits using the database function
  const storageCheck = await checkStorageLimit(creatorId, fileSize);
  if (!storageCheck.allowed) {
    throw new UploadError(storageCheck.reason || 'Storage limit exceeded', {
      creatorId,
      fileSize,
      usage: storageCheck.usage,
    });
  }

  // Generate unique video ID
  const videoId = crypto.randomUUID();

  // Generate storage path with creator isolation
  const storagePath = generateStoragePath(creatorId, videoId, filename);

  // Create presigned URL for upload using Supabase Storage
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (signedUrlError || !signedUrlData) {
    logError('Failed to create signed upload URL', signedUrlError, {
      creatorId,
      storagePath,
    });
    throw new UploadError('Failed to generate upload URL. Please try again.', {
      creatorId,
      error: signedUrlError?.message,
    });
  }

  // Get public URL for the video (will be accessible after upload)
  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  // Create placeholder video record
  await createVideoPlaceholder({
    creatorId,
    videoId,
    filename,
    storagePath,
    fileSize,
    mimeType: contentType,
    videoUrl: publicUrlData.publicUrl,
  });

  logInfo('Generated Supabase upload URL', {
    videoId,
    creatorId,
    filename,
    fileSize,
    storagePath,
  });

  return {
    uploadUrl: signedUrlData.signedUrl,
    videoId,
    storagePath,
    expiresIn: UPLOAD_URL_EXPIRATION,
  };
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Create placeholder video record (status: 'pending')
 */
async function createVideoPlaceholder(data: {
  creatorId: string;
  videoId: string;
  filename: string;
  storagePath: string;
  fileSize: number;
  mimeType: string;
  videoUrl: string;
}): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from('videos').insert({
    id: data.videoId,
    creator_id: data.creatorId,
    title: data.filename.replace(/\.[^.]+$/, ''), // Remove extension
    video_url: data.videoUrl,
    storage_path: data.storagePath,
    file_size_bytes: data.fileSize,
    mime_type: data.mimeType,
    processing_status: 'pending',
    processing_progress: 0,
    transcript_processed: false,
  });

  if (error) {
    logError('Failed to create video placeholder', error);
    throw new UploadError('Failed to create video record');
  }
}

/**
 * Confirm video upload and update storage usage
 */
export async function confirmVideoUpload(
  videoId: string,
  creatorId: string
): Promise<Video> {
  const supabase = getSupabaseAdmin();

  // Get video record
  const { data: video, error: fetchError } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .eq('creator_id', creatorId)
    .single();

  if (fetchError || !video) {
    logError('Failed to fetch video for confirmation', fetchError, { videoId, creatorId });
    throw new UploadError('Video not found');
  }

  // Update storage usage
  try {
    await updateStorageUsage(creatorId, video.file_size_bytes || 0, 1);
  } catch (error) {
    logError('Failed to update storage usage', error, { videoId, creatorId });
    // Don't fail the upload, just log the error
  }

  // Update video status to 'uploaded'
  const { data: updated, error: updateError } = await supabase
    .from('videos')
    .update({
      processing_status: 'uploaded',
      updated_at: new Date().toISOString(),
    })
    .eq('id', videoId)
    .select()
    .single();

  if (updateError || !updated) {
    logError('Failed to update video status', updateError, { videoId });
    throw new UploadError('Failed to confirm upload');
  }

  logInfo('Video upload confirmed', {
    videoId,
    creatorId,
    fileSize: video.file_size_bytes,
  });

  return updated;
}

/**
 * Initiate background processing for uploaded video
 */
export async function initiateProcessing(videoId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Get video details
  const { data: video, error } = await supabase
    .from('videos')
    .select('id, creator_id, video_url, duration_seconds')
    .eq('id', videoId)
    .single();

  if (error || !video) {
    throw new UploadError('Video not found', { videoId });
  }

  // Update status to 'processing'
  await supabase
    .from('videos')
    .update({
      processing_status: 'processing',
      processing_step: 'Queued for transcription',
      processing_progress: 5,
    })
    .eq('id', videoId);

  // Send event to Inngest
  await inngest.send({
    name: 'video/upload.completed',
    data: {
      videoId: video.id,
      creatorId: video.creator_id,
      videoUrl: video.video_url,
      duration: video.duration_seconds || 0,
    },
  });

  logInfo('Processing initiated', { videoId });
}

/**
 * Update video processing status
 */
export async function updateProcessingStatus(
  videoId: string,
  status: {
    processing_status?: string;
    processing_progress?: number;
    processing_step?: string;
    processing_error?: string;
  }
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('videos')
    .update({
      ...status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', videoId);

  if (error) {
    logError('Failed to update processing status', error, { videoId });
    throw new Error('Failed to update video status');
  }
}

/**
 * Get video by ID
 */
export async function getVideoById(videoId: string): Promise<Video | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    logError('Failed to get video', error, { videoId });
    throw new Error('Failed to fetch video');
  }

  return data;
}

/**
 * Get videos for creator with optional filters
 */
export async function getCreatorVideos(
  creatorId: string,
  filters: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ videos: Video[]; total: number }> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('videos')
    .select('*', { count: 'exact' })
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  if (filters.status) {
    query = query.eq('processing_status', filters.status);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    logError('Failed to get creator videos', error, { creatorId });
    throw new Error('Failed to fetch videos');
  }

  return {
    videos: data || [],
    total: count || 0,
  };
}
