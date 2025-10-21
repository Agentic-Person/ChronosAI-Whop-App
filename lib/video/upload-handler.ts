/**
 * Video Upload Handler
 *
 * Handles video file uploads to S3/R2 with:
 * - Presigned URL generation
 * - File validation
 * - Plan limit enforcement
 * - Database record creation
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getSupabaseAdmin } from '@/lib/infrastructure/database/connection-pool';
import { logInfo, logError } from '@/lib/infrastructure/monitoring/logger';
import { inngest } from '@/lib/infrastructure/jobs/inngest-client';
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
// S3 CLIENT CONFIGURATION
// ============================================================================

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET!;
const UPLOAD_URL_EXPIRATION = 15 * 60; // 15 minutes

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
// PLAN LIMITS
// ============================================================================

/**
 * Get video upload limits based on plan tier
 */
export async function getVideoLimits(creatorId: string): Promise<VideoLimits> {
  const supabase = getSupabaseAdmin();

  // Get creator's plan tier
  const { data: creator, error } = await supabase
    .from('creators')
    .select('subscription_tier')
    .eq('id', creatorId)
    .single();

  if (error || !creator) {
    throw new UploadError('Failed to fetch creator plan', { creatorId });
  }

  // Plan-based limits
  const limits: Record<string, VideoLimits> = {
    basic: {
      maxFileSize: VIDEO_PROCESSING_CONSTANTS.MAX_FILE_SIZE,
      maxDuration: 4 * 60 * 60, // 4 hours
      maxVideos: 50,
      allowedFormats: VIDEO_PROCESSING_CONSTANTS.ALLOWED_MIME_TYPES,
    },
    pro: {
      maxFileSize: VIDEO_PROCESSING_CONSTANTS.MAX_FILE_SIZE,
      maxDuration: 8 * 60 * 60, // 8 hours
      maxVideos: 500,
      allowedFormats: VIDEO_PROCESSING_CONSTANTS.ALLOWED_MIME_TYPES,
    },
    enterprise: {
      maxFileSize: VIDEO_PROCESSING_CONSTANTS.MAX_FILE_SIZE,
      maxDuration: Infinity,
      maxVideos: Infinity,
      allowedFormats: VIDEO_PROCESSING_CONSTANTS.ALLOWED_MIME_TYPES,
    },
  };

  return limits[creator.subscription_tier] || limits.basic;
}

/**
 * Check if creator can upload more videos
 */
export async function validateVideoLimits(creatorId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  // Get current video count
  const { data, error } = await supabase.rpc('get_creator_video_count', {
    p_creator_id: creatorId,
  });

  if (error) {
    logError('Failed to get video count', error, { creatorId });
    throw new UploadError('Failed to check video limits', { creatorId });
  }

  const currentCount = data || 0;
  const limits = await getVideoLimits(creatorId);

  if (currentCount >= limits.maxVideos) {
    logInfo('Video limit reached', { creatorId, currentCount, limit: limits.maxVideos });
    return false;
  }

  return true;
}

// ============================================================================
// S3 UPLOAD URL GENERATION
// ============================================================================

/**
 * Generate S3 key for video file
 */
function generateS3Key(creatorId: string, filename: string): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `videos/${creatorId}/${timestamp}-${sanitizedFilename}`;
}

/**
 * Generate presigned URL for direct upload to S3
 */
export async function generateUploadUrl(
  creatorId: string,
  request: UploadUrlRequest
): Promise<UploadUrlResponse> {
  const { filename, contentType, fileSize } = request;

  // Validate file
  const validation = validateVideoFile(filename, contentType, fileSize);
  if (!validation.valid) {
    throw new UploadError(`Invalid video file: ${validation.errors.join(', ')}`, {
      errors: validation.errors,
    });
  }

  // Check plan limits
  const canUpload = await validateVideoLimits(creatorId);
  if (!canUpload) {
    throw new UploadError('Video upload limit reached. Upgrade your plan to upload more.', {
      creatorId,
    });
  }

  // Generate S3 key
  const s3Key = generateS3Key(creatorId, filename);

  // Create presigned URL
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    ContentType: contentType,
    ContentLength: fileSize,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: UPLOAD_URL_EXPIRATION,
  });

  // Create placeholder video record
  const videoId = await createVideoPlaceholder({
    creatorId,
    filename,
    s3Key,
    fileSize,
    mimeType: contentType,
  });

  logInfo('Generated upload URL', {
    videoId,
    creatorId,
    filename,
    fileSize,
    s3Key,
  });

  return {
    uploadUrl,
    videoId,
    s3Key,
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
  filename: string;
  s3Key: string;
  fileSize: number;
  mimeType: string;
}): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { data: video, error } = await supabase
    .from('videos')
    .insert({
      creator_id: data.creatorId,
      title: data.filename.replace(/\.[^.]+$/, ''), // Remove extension
      video_url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${data.s3Key}`,
      s3_key: data.s3Key,
      file_size_bytes: data.fileSize,
      mime_type: data.mimeType,
      processing_status: 'pending',
      processing_progress: 0,
      transcript_processed: false,
    })
    .select('id')
    .single();

  if (error || !video) {
    logError('Failed to create video placeholder', error);
    throw new UploadError('Failed to create video record');
  }

  return video.id;
}

/**
 * Create complete video record after successful upload
 */
export async function createVideoRecord(data: CreateVideoData): Promise<Video> {
  const supabase = getSupabaseAdmin();

  // Check if placeholder exists with this s3Key
  const { data: existing } = await supabase
    .from('videos')
    .select('id')
    .eq('s3_key', data.s3Key)
    .single();

  let video;

  if (existing) {
    // Update existing placeholder
    const { data: updated, error } = await supabase
      .from('videos')
      .update({
        title: data.title,
        description: data.description,
        duration_seconds: data.durationSeconds,
        category: data.category,
        tags: data.tags,
        difficulty_level: data.difficultyLevel,
        processing_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      logError('Failed to update video record', error);
      throw new UploadError('Failed to update video record');
    }

    video = updated;
  } else {
    // Create new record
    const { data: created, error } = await supabase
      .from('videos')
      .insert({
        creator_id: data.creatorId,
        title: data.title,
        description: data.description,
        video_url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${data.s3Key}`,
        s3_key: data.s3Key,
        file_size_bytes: data.fileSize,
        mime_type: data.mimeType,
        duration_seconds: data.durationSeconds,
        category: data.category,
        tags: data.tags,
        difficulty_level: data.difficultyLevel,
        processing_status: 'pending',
        processing_progress: 0,
        transcript_processed: false,
      })
      .select()
      .single();

    if (error) {
      logError('Failed to create video record', error);
      throw new UploadError('Failed to create video record');
    }

    video = created;
  }

  logInfo('Video record created', {
    videoId: video.id,
    creatorId: data.creatorId,
    title: data.title,
  });

  return video;
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
