/**
 * Vector Search Service
 * Handles embedding generation and vector similarity search for RAG
 */

import { OpenAI } from 'openai';
import { supabase } from '@/lib/utils/supabase-client';
import { VideoChunk } from '@/types/database';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Constants
const EMBEDDING_MODEL = 'text-embedding-3-small';
const DEFAULT_SIMILARITY_THRESHOLD = 0.7;
const DEFAULT_MATCH_COUNT = 5;

export interface SearchResult {
  chunk: VideoChunk;
  similarity: number;
  video_id: string;
  video_title: string;
  video_url: string;
  start_timestamp?: number;
  end_timestamp?: number;
}

export interface VectorSearchOptions {
  creator_id: string; // REQUIRED for multi-tenant isolation
  match_count?: number;
  similarity_threshold?: number;
  video_ids?: string[]; // Optional filter by specific videos
}

/**
 * Generate embedding for a text query using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.trim(),
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No embedding generated');
    }

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Perform vector similarity search using pgvector
 */
export async function vectorSearch(
  query: string,
  options: VectorSearchOptions
): Promise<SearchResult[]> {
  try {
    const {
      creator_id,
      match_count = DEFAULT_MATCH_COUNT,
      similarity_threshold = DEFAULT_SIMILARITY_THRESHOLD,
      video_ids,
    } = options;

    // Validate creator_id is provided (multi-tenant security)
    if (!creator_id || creator_id.trim().length === 0) {
      throw new Error('creator_id is required for multi-tenant isolation');
    }

    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);

    // Build the RPC call for vector search
    // IMPORTANT: match_video_chunks ALWAYS filters by creator_id for security
    let rpcQuery = supabase.rpc('match_video_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: similarity_threshold,
      match_count: match_count,
      filter_creator_id: creator_id, // REQUIRED - enforces multi-tenant isolation
      filter_video_ids: video_ids || null,
    });

    const { data, error } = await rpcQuery;

    if (error) {
      console.error('Vector search error:', error);
      throw new Error(`Vector search failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Map results to SearchResult interface
    const results: SearchResult[] = data.map((result: any) => ({
      chunk: {
        id: result.chunk_id,
        video_id: result.video_id,
        chunk_text: result.chunk_text,
        chunk_index: result.chunk_index,
        start_timestamp: result.start_timestamp,
        end_timestamp: result.end_timestamp,
        embedding: result.embedding,
        topic_tags: result.topic_tags,
        created_at: result.created_at,
      },
      similarity: result.similarity,
      video_id: result.video_id,
      video_title: result.video_title,
      video_url: result.video_url,
      start_timestamp: result.start_timestamp,
      end_timestamp: result.end_timestamp,
    }));

    return results;
  } catch (error) {
    console.error('Error in vector search:', error);
    throw error;
  }
}

/**
 * Search for relevant video chunks with fallback strategies
 */
export async function searchRelevantChunks(
  query: string,
  options: VectorSearchOptions
): Promise<SearchResult[]> {
  try {
    // Primary search with default threshold
    let results = await vectorSearch(query, options);

    // If no results, try with lower threshold
    if (results.length === 0 && options.similarity_threshold === DEFAULT_SIMILARITY_THRESHOLD) {
      console.log('No results found, retrying with lower threshold');
      results = await vectorSearch(query, {
        ...options,
        similarity_threshold: 0.5,
      });
    }

    // Sort by similarity (highest first)
    results.sort((a, b) => b.similarity - a.similarity);

    return results;
  } catch (error) {
    console.error('Error searching relevant chunks:', error);
    throw error;
  }
}

/**
 * Get chunks for specific videos (for context building)
 * IMPORTANT: Always filters by creator_id for multi-tenant isolation
 */
export async function getVideoChunks(
  video_ids: string[],
  creator_id: string
): Promise<VideoChunk[]> {
  try {
    // Validate creator_id is provided (multi-tenant security)
    if (!creator_id || creator_id.trim().length === 0) {
      throw new Error('creator_id is required for multi-tenant isolation');
    }

    const { data, error } = await supabase
      .from('video_chunks')
      .select(`
        *,
        videos!inner(creator_id)
      `)
      .in('video_id', video_ids)
      .eq('videos.creator_id', creator_id) // Multi-tenant filter
      .order('chunk_index');

    if (error) {
      throw new Error(`Failed to fetch video chunks: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching video chunks:', error);
    throw error;
  }
}

/**
 * Validate embedding dimensions
 */
export function validateEmbedding(embedding: number[]): boolean {
  // text-embedding-3-small produces 1536 dimensions
  const EXPECTED_DIMENSIONS = 1536;
  return Array.isArray(embedding) && embedding.length === EXPECTED_DIMENSIONS;
}

/**
 * Calculate cosine similarity between two vectors (for testing/validation)
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}
