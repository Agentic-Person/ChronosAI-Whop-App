/**
 * Embedding Generator Service
 *
 * Generates vector embeddings for video chunks using OpenAI:
 * - Batch processing for efficiency
 * - Rate limiting and retry logic
 * - Cost tracking
 * - Caching support
 * - Database storage
 */

import 'openai/shims/node';
import OpenAI from 'openai';
import { getSupabaseAdmin } from '@/lib/infrastructure/database/connection-pool';
import { cache } from '@/lib/infrastructure/cache/redis-client';
import { CacheTTL } from '@/lib/infrastructure/cache/cache-keys';
import { logInfo, logError, logPerformance } from '@/lib/infrastructure/monitoring/logger';
import { PerformanceTimer } from '@/lib/infrastructure/monitoring/performance';
import { retryOpenAI } from '@/lib/utils/retry';
import {
  TextChunk,
  VideoChunk,
  EmbeddedChunk,
  EmbeddingOptions,
  EmbeddingResult,
  EmbeddingBatchResult,
  EmbeddingError,
  VIDEO_PROCESSING_CONSTANTS,
} from './types';
import crypto from 'crypto';

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
 * Split array into batches
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate cache key for embedding
 */
function getEmbeddingCacheKey(text: string, model: string): string {
  const hash = crypto.createHash('sha256').update(text).digest('hex');
  return `embedding:${model}:${hash}`;
}

/**
 * Estimate token count (rough approximation)
 */
function estimateTokenCount(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

// ============================================================================
// EMBEDDING GENERATION
// ============================================================================

/**
 * Generate embedding for a single text
 */
async function generateSingleEmbedding(
  text: string,
  model: string = 'text-embedding-ada-002'
): Promise<number[]> {
  // Check cache first
  const cacheKey = getEmbeddingCacheKey(text, model);
  const cached = await cache.get<number[]>(cacheKey);

  if (cached) {
    logInfo('Embedding cache hit', { model, textLength: text.length });
    return cached;
  }

  // Generate embedding
  const response = await openai.embeddings.create({
    model,
    input: text,
  });

  const embedding = response.data[0].embedding;

  // Cache permanently (embeddings don't change)
  await cache.set(cacheKey, embedding, CacheTTL.PERMANENT);

  return embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 */
async function generateBatchEmbeddings(
  texts: string[],
  model: string = 'text-embedding-ada-002'
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const timer = new PerformanceTimer();
  timer.start('batch-embedding');

  try {
    // Check cache for each text
    const results: (number[] | null)[] = await Promise.all(
      texts.map(async (text) => {
        const cacheKey = getEmbeddingCacheKey(text, model);
        return await cache.get<number[]>(cacheKey);
      })
    );

    // Find which texts need embedding
    const uncachedIndices: number[] = [];
    const uncachedTexts: string[] = [];

    results.forEach((result, index) => {
      if (result === null) {
        uncachedIndices.push(index);
        uncachedTexts.push(texts[index]);
      }
    });

    logInfo('Embedding cache status', {
      total: texts.length,
      cached: texts.length - uncachedTexts.length,
      uncached: uncachedTexts.length,
    });

    // Generate embeddings for uncached texts with retry logic
    if (uncachedTexts.length > 0) {
      const response = await retryOpenAI(async () => {
        return await openai.embeddings.create({
          model,
          input: uncachedTexts,
        });
      });

      // Cache new embeddings
      await Promise.all(
        response.data.map(async (item, index) => {
          const text = uncachedTexts[index];
          const cacheKey = getEmbeddingCacheKey(text, model);
          await cache.set(cacheKey, item.embedding, CacheTTL.PERMANENT);
        })
      );

      // Insert new embeddings into results
      uncachedIndices.forEach((originalIndex, newIndex) => {
        results[originalIndex] = response.data[newIndex].embedding;
      });
    }

    const duration = timer.end('batch-embedding');
    logPerformance('batch-embedding', duration, {
      model,
      textCount: texts.length,
      uncachedCount: uncachedTexts.length,
    });

    return results as number[][];
  } catch (error: any) {
    timer.end('batch-embedding');
    logError('Batch embedding failed', error);
    throw new EmbeddingError(`Failed to generate embeddings: ${error.message}`);
  }
}

/**
 * Main embedding generation function with batching and rate limiting
 */
export async function generateEmbeddings(
  chunks: TextChunk[],
  options: EmbeddingOptions = {}
): Promise<EmbeddingBatchResult> {
  const model = options.model || 'text-embedding-ada-002';
  const batchSize = options.batchSize || VIDEO_PROCESSING_CONSTANTS.EMBEDDING_BATCH_SIZE;

  const timer = new PerformanceTimer();
  timer.start('full-embedding');

  try {
    const batches = chunkArray(chunks, batchSize);
    const allEmbeddings: EmbeddingResult[] = [];
    let totalTokens = 0;

    logInfo('Starting embedding generation', {
      totalChunks: chunks.length,
      batches: batches.length,
      batchSize,
      model,
    });

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const texts = batch.map((chunk) => chunk.text);

      logInfo(`Processing batch ${i + 1}/${batches.length}`, {
        batchSize: batch.length,
      });

      // Generate embeddings for batch
      const embeddings = await generateBatchEmbeddings(texts, model);

      // Create results
      batch.forEach((chunk, index) => {
        const tokens = estimateTokenCount(chunk.text);
        totalTokens += tokens;

        allEmbeddings.push({
          chunkIndex: chunk.index,
          embedding: embeddings[index],
          tokenCount: tokens,
        });
      });

      // Rate limiting: wait between batches (except last batch)
      if (i < batches.length - 1) {
        await sleep(1000); // 1 second between batches
      }
    }

    const estimatedCost = (totalTokens / 1000) * VIDEO_PROCESSING_CONSTANTS.COST_PER_1K_TOKENS_EMBEDDING;

    const duration = timer.end('full-embedding');
    logInfo('Embedding generation completed', {
      totalChunks: chunks.length,
      totalTokens,
      estimatedCost,
      duration,
    });

    return {
      embeddings: allEmbeddings,
      totalTokens,
      estimatedCost,
    };
  } catch (error: any) {
    timer.end('full-embedding');
    logError('Embedding generation failed', error);
    throw error;
  }
}

/**
 * Estimate cost before generating embeddings
 */
export function estimateCost(chunks: TextChunk[]): number {
  const totalTokens = chunks.reduce((sum, chunk) => {
    return sum + estimateTokenCount(chunk.text);
  }, 0);

  return (totalTokens / 1000) * VIDEO_PROCESSING_CONSTANTS.COST_PER_1K_TOKENS_EMBEDDING;
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Store embeddings in database
 */
export async function storeEmbeddings(
  videoId: string,
  results: EmbeddingResult[]
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Get existing chunks
  const { data: chunks, error: fetchError } = await supabase
    .from('video_chunks')
    .select('id, chunk_index')
    .eq('video_id', videoId)
    .order('chunk_index', { ascending: true });

  if (fetchError || !chunks) {
    throw new EmbeddingError('Failed to fetch chunks for embedding storage', videoId);
  }

  // Create a map of chunk_index -> chunk_id
  const chunkMap = new Map(chunks.map((c) => [c.chunk_index, c.id]));

  // Update each chunk with its embedding
  const updates = results.map((result) => {
    const chunkId = chunkMap.get(result.chunkIndex);
    if (!chunkId) {
      throw new EmbeddingError(`Chunk ${result.chunkIndex} not found`, videoId);
    }

    // Convert embedding array to pgvector format
    const embeddingString = `[${result.embedding.join(',')}]`;

    return supabase
      .from('video_chunks')
      .update({ embedding: embeddingString })
      .eq('id', chunkId);
  });

  // Execute all updates in parallel
  await Promise.all(updates);

  // Update video record
  await supabase
    .from('videos')
    .update({
      embedded_at: new Date().toISOString(),
    })
    .eq('id', videoId);

  logInfo('Embeddings stored', {
    videoId,
    embeddingCount: results.length,
  });
}

/**
 * Track embedding cost in database
 */
export async function trackEmbeddingCost(
  videoId: string,
  tokenCount: number,
  cost: number
): Promise<void> {
  const supabase = getSupabaseAdmin();

  await supabase.from('video_processing_costs').insert({
    video_id: videoId,
    operation_type: 'embedding',
    provider: 'openai',
    cost_usd: cost,
    tokens_used: tokenCount,
    metadata: {
      model: 'text-embedding-ada-002',
      dimensions: VIDEO_PROCESSING_CONSTANTS.EMBEDDING_DIMENSIONS,
    },
  });

  logInfo('Embedding cost tracked', { videoId, cost, tokenCount });
}

/**
 * Verify embeddings are stored correctly
 */
export async function verifyEmbeddings(videoId: string): Promise<{
  total: number;
  embedded: number;
  missing: number;
}> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('video_chunks')
    .select('id, embedding')
    .eq('video_id', videoId);

  if (error) {
    throw new Error('Failed to verify embeddings');
  }

  const total = data?.length || 0;
  const embedded = data?.filter((c) => c.embedding !== null).length || 0;
  const missing = total - embedded;

  return { total, embedded, missing };
}

/**
 * Regenerate embeddings for a video (useful if model changes)
 */
export async function regenerateEmbeddings(
  videoId: string,
  options: EmbeddingOptions = {}
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Get all chunks
  const { data: chunks, error } = await supabase
    .from('video_chunks')
    .select('id, chunk_text, chunk_index')
    .eq('video_id', videoId)
    .order('chunk_index', { ascending: true });

  if (error || !chunks) {
    throw new EmbeddingError('Failed to fetch chunks for regeneration', videoId);
  }

  // Convert to TextChunk format
  const textChunks: TextChunk[] = chunks.map((c) => ({
    text: c.chunk_text,
    index: c.chunk_index,
    startTimestamp: 0, // Not needed for embedding
    endTimestamp: 0,
    wordCount: c.chunk_text.split(/\s+/).length,
  }));

  // Generate embeddings
  const result = await generateEmbeddings(textChunks, options);

  // Store embeddings
  await storeEmbeddings(videoId, result.embeddings);

  // Track cost
  await trackEmbeddingCost(videoId, result.totalTokens, result.estimatedCost);

  logInfo('Embeddings regenerated', { videoId });
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Process multiple videos in sequence
 */
export async function batchGenerateEmbeddings(
  videoIds: string[],
  options: EmbeddingOptions = {}
): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];

  for (const videoId of videoIds) {
    try {
      await regenerateEmbeddings(videoId, options);
      success.push(videoId);
    } catch (error) {
      logError('Failed to generate embeddings for video', error as Error, { videoId });
      failed.push(videoId);
    }

    // Rate limiting between videos
    await sleep(2000);
  }

  return { success, failed };
}

/**
 * Get embedding statistics
 */
export async function getEmbeddingStatistics(): Promise<{
  totalVideos: number;
  totalChunks: number;
  embeddedChunks: number;
  pendingChunks: number;
}> {
  const supabase = getSupabaseAdmin();

  // Get total videos
  const { count: videoCount } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true });

  // Get chunk stats
  const { data: chunkStats } = await supabase.rpc('get_embedding_stats');

  return {
    totalVideos: videoCount || 0,
    totalChunks: chunkStats?.total || 0,
    embeddedChunks: chunkStats?.embedded || 0,
    pendingChunks: chunkStats?.pending || 0,
  };
}
