/**
 * Type Definitions for Video Processing Module
 *
 * Comprehensive types for the complete video processing pipeline:
 * - Upload handling
 * - Transcription
 * - Chunking
 * - Embedding generation
 * - Job processing
 */

// ============================================================================
// VIDEO UPLOAD TYPES
// ============================================================================

export interface UploadUrlRequest {
  filename: string;
  contentType: string;
  fileSize: number;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  videoId: string;
  storagePath: string;
  expiresIn: number; // seconds
}

export interface CreateVideoData {
  creatorId: string;
  title: string;
  description?: string;
  storagePath: string;
  fileSize: number;
  mimeType: string;
  durationSeconds?: number;
  category?: string;
  tags?: string[];
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
}

export interface Video {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  transcript?: string;
  transcript_processed: boolean;
  category?: string;
  tags?: string[];
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  order_index: number;
  processing_status: ProcessingStatus;
  processing_progress: number;
  processing_step?: string;
  processing_error?: string;
  audio_extracted_at?: string;
  transcribed_at?: string;
  chunked_at?: string;
  embedded_at?: string;
  storage_path?: string;
  file_size_bytes?: number;
  mime_type?: string;
  created_at: string;
  updated_at: string;
}

export type ProcessingStatus =
  | 'pending'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'failed';

// ============================================================================
// TRANSCRIPTION TYPES
// ============================================================================

export interface TranscriptSegment {
  id: number;
  start: number; // seconds
  end: number;   // seconds
  text: string;
  words?: TranscriptWord[];
}

export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  probability?: number;
}

export interface Transcript {
  text: string;
  segments: TranscriptSegment[];
  language: string;
  duration: number;
}

export interface VideoTranscription {
  id: string;
  video_id: string;
  transcript_text: string;
  segments: TranscriptSegment[];
  language: string;
  word_count: number;
  confidence_score?: number;
  duration_seconds: number;
  whisper_model: string;
  created_at: string;
  updated_at: string;
}

export interface TranscriptionOptions {
  language?: string; // ISO 639-1 code (e.g., 'en', 'es')
  prompt?: string;   // Optional context for Whisper
  temperature?: number; // 0-1, controls randomness
}

// ============================================================================
// CHUNKING TYPES
// ============================================================================

export interface ChunkOptions {
  targetWords?: number;    // Target chunk size (default: 750)
  minWords?: number;       // Minimum chunk size (default: 500)
  maxWords?: number;       // Maximum chunk size (default: 1000)
  overlapWords?: number;   // Overlap between chunks (default: 100)
}

export interface TextChunk {
  text: string;
  index: number;
  startTimestamp: number; // seconds
  endTimestamp: number;   // seconds
  wordCount: number;
}

export interface VideoChunk {
  id?: string;
  video_id: string;
  chunk_text: string;
  chunk_index: number;
  start_timestamp: number; // seconds
  end_timestamp: number;   // seconds
  embedding?: number[];     // 1536 dimensions for ada-002
  topic_tags?: string[];
  word_count: number;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface ChunkTimestamps {
  start: number;
  end: number;
  segments: Array<{
    segmentId: number;
    segmentStart: number;
    segmentEnd: number;
    text: string;
  }>;
}

// ============================================================================
// EMBEDDING TYPES
// ============================================================================

export interface EmbeddingOptions {
  model?: 'text-embedding-ada-002' | 'text-embedding-3-small' | 'text-embedding-3-large';
  batchSize?: number; // Chunks per API call (default: 100)
}

export interface EmbeddedChunk extends TextChunk {
  embedding: number[]; // 1536 floats for ada-002
}

export interface EmbeddingResult {
  chunkIndex: number;
  embedding: number[];
  tokenCount: number;
}

export interface EmbeddingBatchResult {
  embeddings: EmbeddingResult[];
  totalTokens: number;
  estimatedCost: number; // USD
}

// ============================================================================
// JOB PROCESSING TYPES
// ============================================================================

export type JobType =
  | 'transcribe'
  | 'chunk'
  | 'embed'
  | 'full-pipeline'
  | 'audio-extract';

export type JobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'retrying';

export interface VideoProcessingJob {
  id: string;
  video_id: string;
  job_type: JobType;
  status: JobStatus;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  error_stack?: string;
  metadata: Record<string, any>;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProcessingProgress {
  videoId: string;
  status: ProcessingStatus;
  progress: number; // 0-100
  currentStep: string;
  error?: string;
  estimatedTimeRemaining?: number; // seconds
}

// ============================================================================
// COST TRACKING TYPES
// ============================================================================

export type OperationType = 'transcription' | 'embedding' | 'storage';
export type CostProvider = 'openai' | 'aws-s3' | 'cloudflare-r2';

export interface ProcessingCost {
  id: string;
  video_id: string;
  operation_type: OperationType;
  provider: CostProvider;
  cost_usd: number;
  tokens_used?: number;
  api_calls: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface CostEstimate {
  transcription: number;
  embedding: number;
  storage: number;
  total: number;
}

// ============================================================================
// VIDEO LIST/FILTER TYPES
// ============================================================================

export interface VideoListFilters {
  creatorId?: string;
  status?: ProcessingStatus;
  category?: string;
  tags?: string[];
  search?: string;
}

export interface VideoListParams extends VideoListFilters {
  page?: number;
  limit?: number;
  orderBy?: 'created_at' | 'updated_at' | 'title' | 'duration_seconds';
  orderDirection?: 'asc' | 'desc';
}

export interface VideoListResponse {
  videos: Video[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class VideoProcessingError extends Error {
  constructor(
    message: string,
    public code: string,
    public videoId?: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'VideoProcessingError';
  }
}

export class TranscriptionError extends VideoProcessingError {
  constructor(message: string, videoId?: string, details?: Record<string, any>) {
    super(message, 'TRANSCRIPTION_ERROR', videoId, details);
    this.name = 'TranscriptionError';
  }
}

export class ChunkingError extends VideoProcessingError {
  constructor(message: string, videoId?: string, details?: Record<string, any>) {
    super(message, 'CHUNKING_ERROR', videoId, details);
    this.name = 'ChunkingError';
  }
}

export class EmbeddingError extends VideoProcessingError {
  constructor(message: string, videoId?: string, details?: Record<string, any>) {
    super(message, 'EMBEDDING_ERROR', videoId, details);
    this.name = 'EmbeddingError';
  }
}

export class UploadError extends VideoProcessingError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'UPLOAD_ERROR', undefined, details);
    this.name = 'UploadError';
  }
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface VideoValidationResult {
  valid: boolean;
  errors: string[];
}

export interface VideoLimits {
  maxFileSize: number;      // bytes
  maxDuration: number;      // seconds
  maxVideos: number;        // per creator
  allowedFormats: string[]; // MIME types
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const VIDEO_PROCESSING_CONSTANTS = {
  // File validation
  MAX_FILE_SIZE: 4 * 1024 * 1024 * 1024, // 4GB
  ALLOWED_MIME_TYPES: [
    'video/mp4',
    'video/quicktime', // MOV
    'video/mpeg',      // MPEG
    'video/webm',
  ],
  ALLOWED_EXTENSIONS: ['.mp4', '.mov', '.mpeg', '.mpg', '.webm'],

  // Chunking defaults
  DEFAULT_CHUNK_SIZE: 750,
  MIN_CHUNK_SIZE: 500,
  MAX_CHUNK_SIZE: 1000,
  DEFAULT_OVERLAP: 100,

  // Embedding
  EMBEDDING_DIMENSIONS: 1536, // ada-002
  EMBEDDING_BATCH_SIZE: 100,

  // Whisper API limits
  WHISPER_MAX_FILE_SIZE: 25 * 1024 * 1024, // 25MB

  // Processing timeouts
  TRANSCRIPTION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  EMBEDDING_TIMEOUT: 10 * 60 * 1000,     // 10 minutes
  UPLOAD_TIMEOUT: 60 * 60 * 1000,        // 1 hour

  // Cost estimates (USD)
  COST_PER_MINUTE_TRANSCRIPTION: 0.006,
  COST_PER_1K_TOKENS_EMBEDDING: 0.0001,
  COST_PER_GB_STORAGE: 0.023, // S3 standard
} as const;

// ============================================================================
// HELPER TYPE GUARDS
// ============================================================================

export function isValidProcessingStatus(status: string): status is ProcessingStatus {
  return ['pending', 'uploading', 'processing', 'completed', 'failed'].includes(status);
}

export function isValidJobType(type: string): type is JobType {
  return ['transcribe', 'chunk', 'embed', 'full-pipeline', 'audio-extract'].includes(type);
}

export function isValidJobStatus(status: string): status is JobStatus {
  return ['pending', 'running', 'completed', 'failed', 'retrying'].includes(status);
}
