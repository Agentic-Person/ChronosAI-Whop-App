/**
 * Video Chunking Service
 *
 * Intelligently chunks video transcripts for optimal RAG search:
 * - Semantic chunking with natural breaks
 * - Timestamp preservation
 * - Configurable overlap
 * - Database storage
 */

import { getSupabaseAdmin } from '@/lib/infrastructure/database/connection-pool';
import { logInfo, logError } from '@/lib/infrastructure/monitoring/logger';
import {
  Transcript,
  TranscriptSegment,
  ChunkOptions,
  TextChunk,
  VideoChunk,
  ChunkTimestamps,
  ChunkingError,
  VIDEO_PROCESSING_CONSTANTS,
} from './types';

// ============================================================================
// CHUNKING ALGORITHM
// ============================================================================

/**
 * Intelligent chunker that creates semantic chunks with natural breaks
 */
export class IntelligentChunker {
  private readonly targetWords: number;
  private readonly minWords: number;
  private readonly maxWords: number;
  private readonly overlapWords: number;

  constructor(options: ChunkOptions = {}) {
    this.targetWords = options.targetWords || VIDEO_PROCESSING_CONSTANTS.DEFAULT_CHUNK_SIZE;
    this.minWords = options.minWords || VIDEO_PROCESSING_CONSTANTS.MIN_CHUNK_SIZE;
    this.maxWords = options.maxWords || VIDEO_PROCESSING_CONSTANTS.MAX_CHUNK_SIZE;
    this.overlapWords = options.overlapWords || VIDEO_PROCESSING_CONSTANTS.DEFAULT_OVERLAP;

    // Validate options
    if (this.minWords > this.targetWords || this.targetWords > this.maxWords) {
      throw new ChunkingError('Invalid chunk size configuration', undefined, {
        minWords: this.minWords,
        targetWords: this.targetWords,
        maxWords: this.maxWords,
      });
    }

    if (this.overlapWords >= this.minWords) {
      throw new ChunkingError('Overlap cannot exceed minimum chunk size');
    }
  }

  /**
   * Chunk transcript into semantic segments
   */
  chunk(transcript: Transcript): TextChunk[] {
    const chunks: TextChunk[] = [];
    let currentWords: string[] = [];
    let currentSegments: TranscriptSegment[] = [];

    for (const segment of transcript.segments) {
      const segmentWords = this.splitIntoWords(segment.text);
      currentWords.push(...segmentWords);
      currentSegments.push(segment);

      // Check if we've reached target size OR exceeded max size
      if (currentWords.length >= this.targetWords || currentWords.length >= this.maxWords) {
        // Try to find a natural break
        const breakPoint = this.findNaturalBreak(currentWords);

        if (breakPoint > 0) {
          // Create chunk with current segments
          const chunk = this.createChunk(
            currentWords.slice(0, breakPoint),
            currentSegments,
            chunks.length
          );
          chunks.push(chunk);

          // Keep overlap for next chunk
          const overlapStart = Math.max(0, breakPoint - this.overlapWords);
          currentWords = currentWords.slice(overlapStart);

          // Keep only segments needed for overlap
          currentSegments = this.trimProcessedSegments(currentSegments, overlapStart);
        }
      }
    }

    // Add remaining words as final chunk (enforce maxWords if needed)
    if (currentWords.length > 0) {
      // If remaining words exceed maxWords, truncate to maxWords
      const finalWords = currentWords.length > this.maxWords
        ? currentWords.slice(0, this.maxWords)
        : currentWords;

      const chunk = this.createChunk(
        finalWords,
        currentSegments,
        chunks.length
      );
      chunks.push(chunk);
    }

    logInfo('Chunking completed', {
      totalChunks: chunks.length,
      avgWordsPerChunk: Math.round(
        chunks.reduce((sum, c) => sum + c.wordCount, 0) / chunks.length
      ),
    });

    return chunks;
  }

  /**
   * Split text into words
   */
  private splitIntoWords(text: string): string[] {
    return text.trim().split(/\s+/).filter(Boolean);
  }

  /**
   * Find natural break point (sentence ending)
   */
  private findNaturalBreak(words: string[]): number {
    // Enforce maxWords hard limit
    const effectiveLength = Math.min(words.length, this.maxWords);

    // Look for sentence endings in last portion of chunk
    const searchStart = Math.max(this.minWords, effectiveLength - 100);

    for (let i = effectiveLength - 1; i >= searchStart; i--) {
      const word = words[i];
      // Check for sentence-ending punctuation
      if (/[.!?;]$/.test(word)) {
        return i + 1;
      }
    }

    // No natural break found, use target size (but not exceeding maxWords)
    return Math.min(this.targetWords, effectiveLength);
  }

  /**
   * Create chunk from words and segments
   */
  private createChunk(
    words: string[],
    segments: TranscriptSegment[],
    index: number
  ): TextChunk {
    const text = words.join(' ');
    const wordCount = words.length;

    // Use segment-based timestamps directly
    let startTimestamp: number;
    let endTimestamp: number;

    if (segments.length === 0) {
      // No segments available - use fallback
      startTimestamp = 0;
      endTimestamp = 0;
    } else {
      // Use first and last segment timestamps directly
      startTimestamp = segments[0].start;
      endTimestamp = segments[segments.length - 1].end;

      // Safety check: ensure end >= start
      if (endTimestamp < startTimestamp) {
        console.warn(`⚠️ Timestamp inversion in chunk ${index}: start=${startTimestamp}, end=${endTimestamp}`);
        endTimestamp = startTimestamp;
      }
    }

    return {
      text,
      index,
      startTimestamp,
      endTimestamp,
      wordCount,
    };
  }

  /**
   * Calculate chunk timestamps from segments
   */
  private calculateTimestamps(text: string, segments: TranscriptSegment[]): ChunkTimestamps {
    if (segments.length === 0) {
      return { start: 0, end: 0, segments: [] };
    }

    const start = segments[0].start;
    const end = segments[segments.length - 1].end;

    return {
      start,
      end,
      segments: segments.map((seg) => ({
        segmentId: seg.id,
        segmentStart: seg.start,
        segmentEnd: seg.end,
        text: seg.text,
      })),
    };
  }

  /**
   * Estimate duration of overlap in seconds
   */
  private estimateOverlapDuration(
    segments: TranscriptSegment[],
    overlapWords: number
  ): number {
    if (segments.length === 0) return 0;

    const totalWords = segments.reduce(
      (sum, seg) => sum + this.splitIntoWords(seg.text).length,
      0
    );
    const totalDuration = segments[segments.length - 1].end - segments[0].start;

    if (totalWords === 0) return 0;

    const avgSecondsPerWord = totalDuration / totalWords;
    return overlapWords * avgSecondsPerWord;
  }

  /**
   * Remove segments that have been fully processed
   */
  private trimProcessedSegments(
    segments: TranscriptSegment[],
    wordsKept: number
  ): TranscriptSegment[] {
    // This is a simplified version
    // In practice, you'd track which segments contain the overlap words
    if (wordsKept < 100) {
      return segments.slice(-2); // Keep last 2 segments
    }
    return segments;
  }
}

/**
 * Convenience function to chunk transcript
 */
export function chunkTranscript(
  transcript: Transcript,
  options?: ChunkOptions
): TextChunk[] {
  const chunker = new IntelligentChunker(options);
  return chunker.chunk(transcript);
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate chunk quality
 */
export function validateChunk(chunk: TextChunk): boolean {
  // Check word count is within bounds
  if (
    chunk.wordCount < VIDEO_PROCESSING_CONSTANTS.MIN_CHUNK_SIZE ||
    chunk.wordCount > VIDEO_PROCESSING_CONSTANTS.MAX_CHUNK_SIZE
  ) {
    return false;
  }

  // Check text is not empty
  if (!chunk.text || chunk.text.trim().length === 0) {
    return false;
  }

  // Check timestamps are valid
  if (chunk.startTimestamp < 0 || chunk.endTimestamp < chunk.startTimestamp) {
    return false;
  }

  return true;
}

/**
 * Validate all chunks
 */
export function validateChunks(chunks: TextChunk[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  chunks.forEach((chunk, index) => {
    const isLastChunk = index === chunks.length - 1;

    // For last chunk, allow smaller word count but still validate other fields
    if (isLastChunk) {
      // Check text is not empty
      if (!chunk.text || chunk.text.trim().length === 0) {
        errors.push(`Chunk ${index} has no text`);
      }

      // Check timestamps are valid
      if (chunk.startTimestamp < 0 || chunk.endTimestamp < chunk.startTimestamp) {
        errors.push(`Chunk ${index} has invalid timestamps`);
      }

      // For last chunk, only check it doesn't exceed MAX size
      if (chunk.wordCount > VIDEO_PROCESSING_CONSTANTS.MAX_CHUNK_SIZE) {
        errors.push(`Chunk ${index} exceeds maximum size`);
      }
    } else {
      // For all other chunks, use full validation
      if (!validateChunk(chunk)) {
        errors.push(`Chunk ${index} failed validation`);
      }
    }

    // Check for timestamp overlap issues
    if (index > 0) {
      const prevChunk = chunks[index - 1];
      if (chunk.startTimestamp < prevChunk.startTimestamp) {
        errors.push(`Chunk ${index} has invalid timestamp order`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Store chunks in database
 */
export async function storeChunks(
  videoId: string,
  creatorId: string,
  chunks: TextChunk[]
): Promise<VideoChunk[]> {
  const supabase = getSupabaseAdmin();

  // Validate chunks before storing
  const validation = validateChunks(chunks);
  if (!validation.valid) {
    throw new ChunkingError('Invalid chunks', videoId, {
      errors: validation.errors,
    });
  }

  // Convert to database format
  const records = chunks.map((chunk) => ({
    video_id: videoId,
    // Note: creator_id not needed here, it's available via videos table FK
    chunk_text: chunk.text,
    chunk_index: chunk.index,
    start_timestamp: Math.floor(chunk.startTimestamp),
    end_timestamp: Math.floor(chunk.endTimestamp),
    word_count: chunk.wordCount,
    metadata: {
      created_by: 'intelligent-chunker',
      overlap_words: VIDEO_PROCESSING_CONSTANTS.DEFAULT_OVERLAP,
    },
  }));

  // Batch insert
  const { data, error } = await supabase.from('video_chunks').insert(records).select();

  if (error) {
    console.error('❌ DATABASE ERROR storing chunks:', error);
    console.error('Records being inserted:', JSON.stringify(records, null, 2));
    logError('Failed to store chunks', error, { videoId, chunkCount: chunks.length });
    throw new ChunkingError('Failed to save chunks', videoId);
  }

  // Update video record
  await supabase
    .from('videos')
    .update({
      chunked_at: new Date().toISOString(),
    })
    .eq('id', videoId);

  logInfo('Chunks stored', {
    videoId,
    chunkCount: chunks.length,
  });

  return data || [];
}

/**
 * Get chunks for a video
 */
export async function getVideoChunks(videoId: string): Promise<VideoChunk[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('video_chunks')
    .select('*')
    .eq('video_id', videoId)
    .order('chunk_index', { ascending: true });

  if (error) {
    logError('Failed to get chunks', error, { videoId });
    throw new Error('Failed to fetch chunks');
  }

  return data || [];
}

/**
 * Delete chunks for a video (for reprocessing)
 */
export async function deleteVideoChunks(videoId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from('video_chunks').delete().eq('video_id', videoId);

  if (error) {
    logError('Failed to delete chunks', error, { videoId });
    throw new Error('Failed to delete chunks');
  }

  logInfo('Chunks deleted', { videoId });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get chunk by index
 */
export async function getChunkByIndex(
  videoId: string,
  chunkIndex: number
): Promise<VideoChunk | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('video_chunks')
    .select('*')
    .eq('video_id', videoId)
    .eq('chunk_index', chunkIndex)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    logError('Failed to get chunk', error, { videoId, chunkIndex });
    throw new Error('Failed to fetch chunk');
  }

  return data;
}

/**
 * Get chunks in timestamp range
 */
export async function getChunksInRange(
  videoId: string,
  startTime: number,
  endTime: number
): Promise<VideoChunk[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('video_chunks')
    .select('*')
    .eq('video_id', videoId)
    .gte('start_timestamp', startTime)
    .lte('end_timestamp', endTime)
    .order('chunk_index', { ascending: true });

  if (error) {
    logError('Failed to get chunks in range', error, { videoId, startTime, endTime });
    throw new Error('Failed to fetch chunks');
  }

  return data || [];
}

/**
 * Get chunk statistics for a video
 */
export async function getChunkStatistics(videoId: string): Promise<{
  totalChunks: number;
  avgWordCount: number;
  minWordCount: number;
  maxWordCount: number;
  totalWords: number;
}> {
  const chunks = await getVideoChunks(videoId);

  if (chunks.length === 0) {
    return {
      totalChunks: 0,
      avgWordCount: 0,
      minWordCount: 0,
      maxWordCount: 0,
      totalWords: 0,
    };
  }

  const wordCounts = chunks.map((c) => c.word_count);
  const totalWords = wordCounts.reduce((sum, count) => sum + count, 0);

  return {
    totalChunks: chunks.length,
    avgWordCount: Math.round(totalWords / chunks.length),
    minWordCount: Math.min(...wordCounts),
    maxWordCount: Math.max(...wordCounts),
    totalWords,
  };
}

/**
 * Find sentence boundaries in text
 */
export function findSentenceBoundaries(text: string): number[] {
  const boundaries: number[] = [];
  const sentenceEndings = /[.!?;]/g;
  let match;

  while ((match = sentenceEndings.exec(text)) !== null) {
    boundaries.push(match.index + 1);
  }

  return boundaries;
}

/**
 * Map timestamps to chunk text
 */
export function mapTimestampsToChunk(
  chunkText: string,
  segments: TranscriptSegment[]
): ChunkTimestamps {
  // Find which segments contain the chunk text
  const relevantSegments = segments.filter((seg) => chunkText.includes(seg.text.trim()));

  if (relevantSegments.length === 0) {
    return { start: 0, end: 0, segments: [] };
  }

  return {
    start: relevantSegments[0].start,
    end: relevantSegments[relevantSegments.length - 1].end,
    segments: relevantSegments.map((seg) => ({
      segmentId: seg.id,
      segmentStart: seg.start,
      segmentEnd: seg.end,
      text: seg.text,
    })),
  };
}
