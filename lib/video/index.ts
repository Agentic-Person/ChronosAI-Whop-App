/**
 * Video Processing Module - Public API
 *
 * Central export for all video processing functionality.
 * Use this as the main entry point for video operations.
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  // Upload types
  UploadUrlRequest,
  UploadUrlResponse,
  CreateVideoData,
  Video,
  ProcessingStatus,

  // Transcription types
  TranscriptSegment,
  TranscriptWord,
  Transcript,
  VideoTranscription,
  TranscriptionOptions,

  // Chunking types
  ChunkOptions,
  TextChunk,
  VideoChunk,
  ChunkTimestamps,

  // Embedding types
  EmbeddingOptions,
  EmbeddedChunk,
  EmbeddingResult,
  EmbeddingBatchResult,

  // Job types
  JobType,
  JobStatus,
  VideoProcessingJob,
  ProcessingProgress,

  // Cost tracking
  OperationType,
  CostProvider,
  ProcessingCost,
  CostEstimate,

  // List/filter types
  VideoListFilters,
  VideoListParams,
  VideoListResponse,

  // Validation
  VideoValidationResult,
  VideoLimits,
} from './types';

// Error classes
export {
  VideoProcessingError,
  TranscriptionError,
  ChunkingError,
  EmbeddingError,
  UploadError,
} from './types';

// Constants
export { VIDEO_PROCESSING_CONSTANTS } from './types';

// ============================================================================
// UPLOAD HANDLER
// ============================================================================

export {
  validateVideoFile,
  generateUploadUrl,
  confirmVideoUpload,
  initiateProcessing,
  updateProcessingStatus,
  getVideoById,
  getCreatorVideos,
} from './upload-handler';

// ============================================================================
// TRANSCRIPTION SERVICE
// ============================================================================

export {
  transcribeVideo,
  storeTranscription,
  getTranscription,
  calculateTranscriptionCost,
  trackTranscriptionCost,
  formatTimestamp,
  transcriptToSRT,
  transcriptToVTT,
} from './transcription';

// ============================================================================
// CHUNKING ALGORITHM
// ============================================================================

export {
  IntelligentChunker,
  chunkTranscript,
  validateChunk,
  validateChunks,
  storeChunks,
  getVideoChunks,
  deleteVideoChunks,
  getChunkByIndex,
  getChunksInRange,
  getChunkStatistics,
  findSentenceBoundaries,
  mapTimestampsToChunk,
} from './chunking';

// ============================================================================
// EMBEDDING GENERATOR
// ============================================================================

export {
  generateEmbeddings,
  estimateCost,
  storeEmbeddings,
  trackEmbeddingCost,
  verifyEmbeddings,
  regenerateEmbeddings,
  batchGenerateEmbeddings,
  getEmbeddingStatistics,
} from './embedding-generator';

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Upload and Process Video
 *
 * ```typescript
 * import { generateUploadUrl, createVideoRecord, initiateProcessing } from '@/lib/video';
 *
 * // 1. Generate upload URL
 * const { uploadUrl, videoId, storagePath } = await generateUploadUrl(creatorId, {
 *   filename: 'my-video.mp4',
 *   contentType: 'video/mp4',
 *   fileSize: 104857600,
 * });
 *
 * // 2. Upload to Supabase Storage (client-side)
 * await fetch(uploadUrl, {
 *   method: 'PUT',
 *   body: videoFile,
 *   headers: { 'Content-Type': 'video/mp4' },
 * });
 *
 * // 3. Confirm upload
 * const video = await confirmVideoUpload(videoId, creatorId);
 *
 * // 4. Initiate processing
 * await initiateProcessing(video.id);
 * ```
 */

/**
 * Example 2: Manual Processing Pipeline
 *
 * ```typescript
 * import {
 *   transcribeVideo,
 *   storeTranscription,
 *   chunkTranscript,
 *   storeChunks,
 *   generateEmbeddings,
 *   storeEmbeddings,
 * } from '@/lib/video';
 *
 * // 1. Transcribe
 * const transcript = await transcribeVideo(videoUrl);
 * await storeTranscription(videoId, transcript);
 *
 * // 2. Chunk
 * const chunks = chunkTranscript(transcript, {
 *   targetWords: 750,
 *   overlapWords: 100,
 * });
 * await storeChunks(videoId, chunks);
 *
 * // 3. Generate embeddings
 * const result = await generateEmbeddings(chunks);
 * await storeEmbeddings(videoId, result.embeddings);
 *
 * console.log(`Cost: $${result.estimatedCost}`);
 * ```
 */

/**
 * Example 3: Query Video Chunks
 *
 * ```typescript
 * import { getVideoChunks, getChunksInRange } from '@/lib/video';
 *
 * // Get all chunks
 * const chunks = await getVideoChunks(videoId);
 *
 * // Get chunks in time range (30-60 seconds)
 * const rangeChunks = await getChunksInRange(videoId, 30, 60);
 * ```
 */

/**
 * Example 4: Cost Estimation
 *
 * ```typescript
 * import { calculateTranscriptionCost, estimateCost } from '@/lib/video';
 *
 * // Estimate transcription cost (1 hour video)
 * const transcriptionCost = calculateTranscriptionCost(3600);
 * console.log(`Transcription: $${transcriptionCost}`);
 *
 * // Estimate embedding cost
 * const embeddingCost = estimateCost(chunks);
 * console.log(`Embeddings: $${embeddingCost}`);
 *
 * const total = transcriptionCost + embeddingCost;
 * console.log(`Total: $${total}`);
 * ```
 */

/**
 * Example 5: React Component Integration
 *
 * ```typescript
 * import { VideoUploader, ProcessingStatus, VideoList } from '@/components/video';
 *
 * function CreatorDashboard() {
 *   const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
 *
 *   return (
 *     <div>
 *       <VideoUploader onUploadComplete={setUploadedVideoId} />
 *
 *       {uploadedVideoId && (
 *         <ProcessingStatus videoId={uploadedVideoId} />
 *       )}
 *
 *       <VideoList creatorId={creatorId} />
 *     </div>
 *   );
 * }
 * ```
 */
