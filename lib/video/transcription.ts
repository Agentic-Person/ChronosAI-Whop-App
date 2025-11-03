/**
 * Video Transcription Service
 *
 * Handles video transcription using OpenAI Whisper API:
 * - Audio extraction from video
 * - Audio splitting for large files
 * - Transcription with timestamps
 * - Transcript merging
 * - Database storage
 */

// CRITICAL: OpenAI shims must be imported before any OpenAI imports
import 'openai/shims/node';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { getSupabaseAdmin } from '@/lib/infrastructure/database/connection-pool';
import { logInfo, logError, logPerformance } from '@/lib/infrastructure/monitoring/logger';
import { PerformanceTimer } from '@/lib/infrastructure/monitoring/performance';
import { retryOpenAI } from '@/lib/utils/retry';
import {
  Transcript,
  TranscriptSegment,
  VideoTranscription,
  TranscriptionOptions,
  TranscriptionError,
  VIDEO_PROCESSING_CONSTANTS,
} from './types';
import { costTracker, calculateTranscriptionCost as calculateTranscriptionCostFromUsage } from '@/lib/usage';

// ============================================================================
// OPENAI CLIENT
// ============================================================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Download video file from URL to temporary location
 */
async function downloadVideo(videoUrl: string): Promise<string> {
  const tempDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const videoId = Date.now().toString();
  const tempPath = path.join(tempDir, `video-${videoId}.mp4`);

  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new TranscriptionError(`Failed to download video: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(tempPath, buffer);

  logInfo('Video downloaded', { videoUrl, tempPath, sizeBytes: buffer.length });

  return tempPath;
}

/**
 * Extract audio from video file using ffmpeg
 */
async function extractAudioFromVideo(videoPath: string): Promise<string> {
  // Import the audio extractor module
  const { extractAudioFromVideo: extractAudio, checkFFmpegAvailable } = await import('./audio-extractor');

  // Check if ffmpeg is available
  const ffmpegAvailable = await checkFFmpegAvailable();

  if (!ffmpegAvailable) {
    // Fallback: Try to use video directly if ffmpeg is not available
    logInfo('ffmpeg not available, attempting direct video transcription', { videoPath });
    return videoPath;
  }

  try {
    // Extract audio using ffmpeg
    const audioPath = await extractAudio(videoPath, {
      audioCodec: 'wav',
      sampleRate: 16000,
      channels: 1,
    });

    logInfo('Audio extraction completed successfully', { videoPath, audioPath });
    return audioPath;
  } catch (error: any) {
    logError('Audio extraction failed, falling back to direct video transcription', error);
    // Fallback to video if extraction fails
    return videoPath;
  }
}

/**
 * Get file size in bytes
 */
function getFileSize(filePath: string): number {
  const stats = fs.statSync(filePath);
  return stats.size;
}

/**
 * Split audio file into chunks if it exceeds Whisper API limit
 */
async function splitAudioFile(
  audioPath: string,
  maxSizeMB: number = 25
): Promise<string[]> {
  const fileSize = getFileSize(audioPath);
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (fileSize <= maxSizeBytes) {
    return [audioPath];
  }

  // Import the audio splitter
  const { splitAudioFile: splitAudio, cleanupAudioChunks } = await import('./audio-extractor');

  try {
    logInfo('Audio file exceeds size limit, splitting', { audioPath, fileSize, maxSizeMB });

    // Split the audio file
    const chunks = await splitAudio(audioPath, maxSizeMB);

    // Return array of chunk paths
    return chunks.map(chunk => chunk.path);
  } catch (error: any) {
    logError('Failed to split audio file', error);
    throw new TranscriptionError(
      `Audio file exceeds ${maxSizeMB}MB limit and could not be split: ${error.message}`,
      undefined,
      { fileSize, maxSizeBytes, error: error.message }
    );
  }
}

/**
 * Format timestamp as HH:MM:SS.mmm
 */
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms
    .toString()
    .padStart(3, '0')}`;
}

// ============================================================================
// TRANSCRIPTION
// ============================================================================

/**
 * Transcribe a single audio file using Whisper API
 */
async function transcribeSingleFile(
  filePath: string,
  options: TranscriptionOptions = {}
): Promise<Transcript> {
  const timer = new PerformanceTimer();
  timer.start('transcription');

  try {
    // Call Whisper API with retry logic for transient failures
    const response = await retryOpenAI(async () => {
      // Create a fresh read stream for each retry attempt
      const fileStream = fs.createReadStream(filePath);

      return await openai.audio.transcriptions.create({
        file: fileStream,
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
        language: options.language || 'en',
        prompt: options.prompt,
        temperature: options.temperature || 0,
      });
    });

    const duration = timer.end('transcription');

    logPerformance('whisper-transcription', duration, {
      filePath,
      language: options.language || 'en',
      segmentCount: response.segments?.length || 0,
    });

    // Convert response to our Transcript format
    const segments: TranscriptSegment[] = (response.segments || []).map((seg: any) => ({
      id: seg.id,
      start: seg.start,
      end: seg.end,
      text: seg.text,
      // Words are not always available in segment-level granularity
      words: seg.words?.map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        probability: w.probability,
      })),
    }));

    return {
      text: response.text,
      segments,
      language: response.language || options.language || 'en',
      duration: response.duration || 0,
    };
  } catch (error: any) {
    timer.end('transcription');
    logError('Whisper API error', error);
    throw new TranscriptionError(
      `Transcription failed: ${error.message}`,
      undefined,
      { filePath, error: error.message }
    );
  }
}

/**
 * Merge multiple transcripts into one
 */
function mergeTranscripts(transcripts: Transcript[]): Transcript {
  if (transcripts.length === 0) {
    throw new TranscriptionError('No transcripts to merge');
  }

  if (transcripts.length === 1) {
    return transcripts[0];
  }

  let totalDuration = 0;
  const allSegments: TranscriptSegment[] = [];
  const allText: string[] = [];

  for (const transcript of transcripts) {
    // Adjust segment timestamps by adding previous duration
    const adjustedSegments = transcript.segments.map((seg) => ({
      ...seg,
      id: allSegments.length + seg.id,
      start: seg.start + totalDuration,
      end: seg.end + totalDuration,
      words: seg.words?.map((w) => ({
        ...w,
        start: w.start + totalDuration,
        end: w.end + totalDuration,
      })),
    }));

    allSegments.push(...adjustedSegments);
    allText.push(transcript.text);
    totalDuration += transcript.duration;
  }

  return {
    text: allText.join(' '),
    segments: allSegments,
    language: transcripts[0].language,
    duration: totalDuration,
  };
}

/**
 * Main transcription function - handles full pipeline
 */
export async function transcribeVideo(
  videoUrl: string,
  options: TranscriptionOptions = {}
): Promise<Transcript> {
  const timer = new PerformanceTimer();
  timer.start('full-transcription');

  let videoPath: string | null = null;
  let audioPath: string | null = null;

  try {
    // Step 1: Download video
    logInfo('Starting transcription', { videoUrl });
    videoPath = await downloadVideo(videoUrl);

    // Step 2: Extract audio (or use video directly)
    audioPath = await extractAudioFromVideo(videoPath);

    // Step 3: Split if necessary
    const audioChunks = await splitAudioFile(audioPath);

    // Step 4: Transcribe each chunk
    const transcripts: Transcript[] = [];
    for (const chunk of audioChunks) {
      const transcript = await transcribeSingleFile(chunk, options);
      transcripts.push(transcript);
    }

    // Step 5: Merge if multiple chunks
    const finalTranscript = mergeTranscripts(transcripts);

    const totalDuration = timer.end('full-transcription');
    logInfo('Transcription completed', {
      videoUrl,
      duration: totalDuration,
      wordCount: finalTranscript.text.split(/\s+/).length,
      segmentCount: finalTranscript.segments.length,
    });

    return finalTranscript;
  } catch (error: any) {
    timer.end('full-transcription');
    logError('Transcription failed', error, { videoUrl });
    throw error;
  } finally {
    // Clean up temporary files
    if (videoPath && fs.existsSync(videoPath)) {
      try {
        fs.unlinkSync(videoPath);
      } catch (e) {
        logError('Failed to clean up video file', e as Error);
      }
    }

    if (audioPath && audioPath !== videoPath && fs.existsSync(audioPath)) {
      try {
        fs.unlinkSync(audioPath);
      } catch (e) {
        logError('Failed to clean up audio file', e as Error);
      }
    }
  }
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Store transcription in database
 */
export async function storeTranscription(
  videoId: string,
  transcript: Transcript
): Promise<VideoTranscription> {
  const supabase = getSupabaseAdmin();

  const wordCount = transcript.text.split(/\s+/).length;

  const { data, error } = await supabase
    .from('video_transcriptions')
    .insert({
      video_id: videoId,
      transcript_text: transcript.text,
      segments: transcript.segments,
      language: transcript.language,
      word_count: wordCount,
      duration_seconds: Math.floor(transcript.duration),
      whisper_model: 'whisper-1',
    })
    .select()
    .single();

  if (error) {
    logError('Failed to store transcription', error, { videoId });
    throw new TranscriptionError('Failed to save transcription', videoId);
  }

  // Update video record
  await supabase
    .from('videos')
    .update({
      transcript: transcript.text,
      transcribed_at: new Date().toISOString(),
      duration_seconds: Math.floor(transcript.duration),
    })
    .eq('id', videoId);

  logInfo('Transcription stored', { videoId, wordCount, segmentCount: transcript.segments.length });

  return data;
}

/**
 * Get transcription from database
 */
export async function getTranscription(videoId: string): Promise<VideoTranscription | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('video_transcriptions')
    .select('*')
    .eq('video_id', videoId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    logError('Failed to get transcription', error, { videoId });
    throw new Error('Failed to fetch transcription');
  }

  return data;
}

/**
 * Calculate transcription cost
 */
export function calculateTranscriptionCost(durationSeconds: number): number {
  const minutes = durationSeconds / 60;
  return minutes * VIDEO_PROCESSING_CONSTANTS.COST_PER_MINUTE_TRANSCRIPTION;
}

/**
 * Track transcription cost in database using new costTracker service
 */
export async function trackTranscriptionCost(
  videoId: string,
  durationSeconds: number,
  userId?: string,
  creatorId?: string
): Promise<void> {
  const cost = calculateTranscriptionCost(durationSeconds);

  await costTracker.trackUsage({
    user_id: userId,
    creator_id: creatorId,
    endpoint: '/api/video/process',
    method: 'POST',
    provider: 'openai',
    service: 'transcription',
    cost_usd: cost,
    metadata: {
      video_id: videoId,
      duration_seconds: durationSeconds,
      model: 'whisper-1',
    },
    status_code: 200,
  });

  logInfo('Transcription cost tracked', { videoId, cost, durationSeconds, userId, creatorId });
}

/**
 * Convert transcript to SRT format (for subtitles)
 */
export function transcriptToSRT(transcript: Transcript): string {
  const lines: string[] = [];

  transcript.segments.forEach((segment, index) => {
    const startTime = formatTimestamp(segment.start).replace('.', ',');
    const endTime = formatTimestamp(segment.end).replace('.', ',');

    lines.push(`${index + 1}`);
    lines.push(`${startTime} --> ${endTime}`);
    lines.push(segment.text.trim());
    lines.push(''); // Empty line between segments
  });

  return lines.join('\n');
}

/**
 * Convert transcript to VTT format (WebVTT)
 */
export function transcriptToVTT(transcript: Transcript): string {
  const lines: string[] = ['WEBVTT', ''];

  transcript.segments.forEach((segment) => {
    const startTime = formatTimestamp(segment.start);
    const endTime = formatTimestamp(segment.end);

    lines.push(`${startTime} --> ${endTime}`);
    lines.push(segment.text.trim());
    lines.push(''); // Empty line between segments
  });

  return lines.join('\n');
}
