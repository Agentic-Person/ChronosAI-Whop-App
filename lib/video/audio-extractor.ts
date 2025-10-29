/**
 * Audio Extraction Service
 *
 * Extracts audio from video files using ffmpeg
 * Handles large files by splitting them appropriately for Whisper API
 */

import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { logInfo, logError } from '@/lib/infrastructure/monitoring/logger';
import { TranscriptionError, VIDEO_PROCESSING_CONSTANTS } from './types';

const execFileAsync = promisify(execFile);

// ============================================================================
// TYPES
// ============================================================================

export interface AudioExtractionOptions {
  audioCodec?: 'wav' | 'mp3';
  sampleRate?: number;
  channels?: number;
}

export interface AudioChunk {
  path: string;
  index: number;
  durationSeconds: number;
  sizeBytes: number;
}

// ============================================================================
// AUDIO EXTRACTION
// ============================================================================

/**
 * Check if ffmpeg is available
 */
export async function checkFFmpegAvailable(): Promise<boolean> {
  try {
    await execFileAsync('ffmpeg', ['-version']);
    return true;
  } catch (error) {
    logError('ffmpeg not found in system PATH', error as Error);
    return false;
  }
}

/**
 * Get video duration using ffprobe
 */
async function getVideoDuration(videoPath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      videoPath
    ]);

    const duration = parseFloat(stdout.trim());
    if (isNaN(duration)) {
      throw new Error('Invalid duration value');
    }

    return duration;
  } catch (error) {
    throw new TranscriptionError(
      `Failed to get video duration: ${(error as Error).message}`,
      undefined,
      { videoPath }
    );
  }
}

/**
 * Extract audio from video file using ffmpeg
 */
export async function extractAudioFromVideo(
  videoPath: string,
  options: AudioExtractionOptions = {}
): Promise<string> {
  const {
    audioCodec = 'wav',
    sampleRate = 16000,
    channels = 1,
  } = options;

  // Check if ffmpeg is available
  const ffmpegAvailable = await checkFFmpegAvailable();
  if (!ffmpegAvailable) {
    logError('ffmpeg not available, cannot extract audio', new Error('ffmpeg not found'));
    throw new TranscriptionError(
      'ffmpeg is required for audio extraction but was not found in system PATH',
      undefined,
      { videoPath }
    );
  }

  const audioPath = videoPath.replace(/\.[^.]+$/, `.${audioCodec}`);

  try {
    logInfo('Extracting audio from video', { videoPath, audioPath, sampleRate, channels });

    // Extract audio using ffmpeg
    const ffmpegArgs = [
      '-i', videoPath,
      '-vn', // No video
      '-acodec', audioCodec === 'wav' ? 'pcm_s16le' : 'libmp3lame',
      '-ar', sampleRate.toString(),
      '-ac', channels.toString(),
      '-y', // Overwrite output file
      audioPath
    ];

    await execFileAsync('ffmpeg', ffmpegArgs);

    // Verify the output file exists
    if (!fs.existsSync(audioPath)) {
      throw new Error('Audio file was not created');
    }

    const stats = fs.statSync(audioPath);
    logInfo('Audio extraction complete', {
      audioPath,
      sizeBytes: stats.size,
      sizeMB: (stats.size / 1024 / 1024).toFixed(2)
    });

    return audioPath;
  } catch (error) {
    // Clean up partial files
    if (fs.existsSync(audioPath)) {
      try {
        fs.unlinkSync(audioPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    throw new TranscriptionError(
      `Audio extraction failed: ${(error as Error).message}`,
      undefined,
      { videoPath, audioPath, error: (error as Error).message }
    );
  }
}

/**
 * Split audio file into chunks for Whisper API (max 25MB)
 */
export async function splitAudioFile(
  audioPath: string,
  maxSizeMB: number = 25
): Promise<AudioChunk[]> {
  const fileSize = fs.statSync(audioPath).size;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // If file is small enough, return as single chunk
  if (fileSize <= maxSizeBytes) {
    const duration = await getAudioDuration(audioPath);
    return [{
      path: audioPath,
      index: 0,
      durationSeconds: duration,
      sizeBytes: fileSize,
    }];
  }

  logInfo('Audio file exceeds size limit, splitting into chunks', {
    audioPath,
    fileSize,
    maxSizeBytes
  });

  // Get total duration
  const totalDuration = await getAudioDuration(audioPath);

  // Calculate number of chunks needed
  const chunkCount = Math.ceil(fileSize / maxSizeBytes);
  const chunkDuration = totalDuration / chunkCount;

  const chunks: AudioChunk[] = [];
  const tempDir = path.dirname(audioPath);
  const baseName = path.basename(audioPath, path.extname(audioPath));
  const ext = path.extname(audioPath);

  for (let i = 0; i < chunkCount; i++) {
    const startTime = i * chunkDuration;
    const chunkPath = path.join(tempDir, `${baseName}_chunk${i}${ext}`);

    try {
      // Extract chunk using ffmpeg
      await execFileAsync('ffmpeg', [
        '-i', audioPath,
        '-ss', startTime.toString(),
        '-t', chunkDuration.toString(),
        '-acodec', 'copy',
        '-y',
        chunkPath
      ]);

      const chunkSize = fs.statSync(chunkPath).size;
      const chunkDur = await getAudioDuration(chunkPath);

      chunks.push({
        path: chunkPath,
        index: i,
        durationSeconds: chunkDur,
        sizeBytes: chunkSize,
      });

      logInfo('Created audio chunk', {
        index: i,
        path: chunkPath,
        durationSeconds: chunkDur,
        sizeMB: (chunkSize / 1024 / 1024).toFixed(2)
      });
    } catch (error) {
      // Clean up any created chunks
      for (const chunk of chunks) {
        if (fs.existsSync(chunk.path)) {
          try {
            fs.unlinkSync(chunk.path);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      }

      throw new TranscriptionError(
        `Failed to split audio file: ${(error as Error).message}`,
        undefined,
        { audioPath, chunkIndex: i }
      );
    }
  }

  return chunks;
}

/**
 * Get audio duration using ffprobe
 */
async function getAudioDuration(audioPath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      audioPath
    ]);

    const duration = parseFloat(stdout.trim());
    if (isNaN(duration)) {
      throw new Error('Invalid duration value');
    }

    return duration;
  } catch (error) {
    throw new TranscriptionError(
      `Failed to get audio duration: ${(error as Error).message}`,
      undefined,
      { audioPath }
    );
  }
}

/**
 * Clean up audio chunks
 */
export function cleanupAudioChunks(chunks: AudioChunk[]): void {
  for (const chunk of chunks) {
    if (fs.existsSync(chunk.path)) {
      try {
        fs.unlinkSync(chunk.path);
        logInfo('Cleaned up audio chunk', { path: chunk.path });
      } catch (error) {
        logError('Failed to clean up audio chunk', error as Error, { path: chunk.path });
      }
    }
  }
}

/**
 * Validate audio file
 */
export async function validateAudioFile(audioPath: string): Promise<boolean> {
  try {
    const duration = await getAudioDuration(audioPath);
    return duration > 0 && fs.existsSync(audioPath);
  } catch (error) {
    return false;
  }
}
