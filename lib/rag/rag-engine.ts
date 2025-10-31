/**
 * RAG Engine
 * Core Retrieval Augmented Generation engine for video-based learning
 * Integrates vector search, context building, and Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import { searchRelevantChunks, SearchResult } from './vector-search';
import { contextBuilder } from './context-builder';
import { chatService } from './chat-service';
import { VideoReference, ChatMessage } from '@/types/database';
import { logAIAPICall, logError, logInfo } from '@/lib/infrastructure/monitoring/logger';
import { AIAPIError } from '@/lib/infrastructure/errors';
import { getClaudeModel } from '@/lib/config/ai-models';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Constants
const MODEL = getClaudeModel();
const MAX_TOKENS = 4096;
const TEMPERATURE = 0.7;
const TOP_K_CHUNKS = 5;

export interface RAGContext {
  chunks: SearchResult[];
  total_chunks: number;
  avg_similarity: number;
}

export interface RAGResponse {
  answer: string;
  video_references: VideoReference[];
  context: RAGContext;
  confidence: number;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    model: string;
  };
}

export interface RAGOptions {
  creator_id: string;
  student_id?: string;
  context_type?: 'general' | 'project-specific' | 'quiz-help';
  conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  video_ids?: string[];
}

/**
 * Build context from search results for Claude (deprecated - use contextBuilder)
 * Kept for backward compatibility
 */
function buildContext(chunks: SearchResult[]): string {
  if (chunks.length === 0) {
    return 'No relevant video content found for this query.';
  }

  let context = 'Relevant video content:\n\n';

  chunks.forEach((result, index) => {
    const timestamp = result.start_timestamp
      ? ` [${formatTimestamp(result.start_timestamp)}]`
      : '';

    context += `${index + 1}. From video "${result.video_title}"${timestamp}:\n`;
    context += `   ${result.chunk.chunk_text}\n`;
    context += `   (Relevance: ${(result.similarity * 100).toFixed(1)}%)\n\n`;
  });

  return context;
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Build system prompt for Claude
 */
function buildSystemPrompt(contextType?: string): string {
  const basePrompt = `You are an AI learning assistant helping students understand video course content. Your role is to:

1. Answer questions based on the provided video content
2. Reference specific videos and timestamps when relevant
3. Explain concepts clearly and concisely
4. Suggest related topics the student might find helpful
5. Encourage hands-on practice and experimentation

Guidelines:
- Always cite the video sources when answering
- If the content doesn't contain the answer, say so honestly
- Break down complex topics into digestible parts
- Use examples and analogies to clarify concepts
- Be encouraging and supportive of the learning journey`;

  if (contextType === 'project-specific') {
    return basePrompt + `\n\nContext: The student is working on a project and needs help with implementation.`;
  }

  if (contextType === 'quiz-help') {
    return basePrompt + `\n\nContext: The student is preparing for or struggling with a quiz. Help them understand the concepts, but don't just give answers.`;
  }

  return basePrompt;
}

/**
 * Extract video references from search results
 */
function extractVideoReferences(chunks: SearchResult[]): VideoReference[] {
  // Group chunks by video and select the most relevant one per video
  const videoMap = new Map<string, SearchResult>();

  chunks.forEach((chunk) => {
    const existing = videoMap.get(chunk.video_id);
    if (!existing || chunk.similarity > existing.similarity) {
      videoMap.set(chunk.video_id, chunk);
    }
  });

  // Convert to VideoReference array
  return Array.from(videoMap.values()).map((result) => ({
    video_id: result.video_id,
    title: result.video_title,
    timestamp: result.start_timestamp || 0,
    relevance_score: result.similarity,
  }));
}

/**
 * Calculate confidence score based on search results
 */
function calculateConfidence(chunks: SearchResult[]): number {
  if (chunks.length === 0) return 0;

  // Calculate average similarity
  const avgSimilarity = chunks.reduce((sum, chunk) => sum + chunk.similarity, 0) / chunks.length;

  // Consider number of results
  const countFactor = Math.min(chunks.length / TOP_K_CHUNKS, 1);

  // Combined confidence score
  return avgSimilarity * 0.7 + countFactor * 0.3;
}

/**
 * Main RAG query function
 */
export async function queryRAG(
  question: string,
  options: RAGOptions
): Promise<RAGResponse> {
  try {
    // Validate input
    if (!question || question.trim().length === 0) {
      throw new Error('Question cannot be empty');
    }

    if (!options.creator_id) {
      throw new Error('Creator ID is required');
    }

    // Step 1: Search for relevant chunks
    const searchResults = await searchRelevantChunks(question, {
      creator_id: options.creator_id,
      match_count: TOP_K_CHUNKS,
      video_ids: options.video_ids,
    });

    // Step 2: Build context using contextBuilder
    const conversationHistory: ChatMessage[] = (options.conversation_history || []).map((msg, idx) => ({
      id: `temp-${idx}`,
      session_id: 'temp',
      role: msg.role,
      content: msg.content,
      created_at: new Date().toISOString(),
    }));

    const context = contextBuilder.build(searchResults, conversationHistory, {
      includeHistory: conversationHistory.length > 0,
      maxHistoryMessages: 5,
      maxChunks: TOP_K_CHUNKS,
    });

    // Step 3: Build system prompt
    const systemPrompt = contextBuilder.buildSystemPrompt(options.context_type);

    // Step 4: Build conversation messages
    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: `${context}\n\n# Student Question\n${question}`,
      },
    ];

    logInfo('Calling Claude API', {
      model: MODEL,
      chunksFound: searchResults.length,
      contextLength: context.length,
      estimatedTokens: contextBuilder.estimateTokenCount(context)
    });

    // Step 5: Query Claude
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system: systemPrompt,
      messages,
    });

    logAIAPICall('claude_api', {
      model: MODEL,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
    });

    // Step 5: Extract answer from response
    const answer = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as Anthropic.TextBlock).text)
      .join('\n');

    // Step 6: Build response
    const videoReferences = contextBuilder.extractVideoReferences(searchResults);
    const confidence = calculateConfidence(searchResults);

    const ragResponse: RAGResponse = {
      answer,
      video_references: videoReferences,
      context: {
        chunks: searchResults,
        total_chunks: searchResults.length,
        avg_similarity: searchResults.length > 0
          ? searchResults.reduce((sum, chunk) => sum + chunk.similarity, 0) / searchResults.length
          : 0,
      },
      confidence,
      usage: {
        input_tokens: response.usage?.input_tokens || 0,
        output_tokens: response.usage?.output_tokens || 0,
        model: MODEL,
      },
    };

    return ragResponse;
  } catch (error) {
    console.error('Error in RAG query:', error);
    throw new Error(`RAG query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Query RAG with streaming support (for future use)
 */
export async function queryRAGStream(
  question: string,
  options: RAGOptions,
  onChunk: (chunk: string) => void
): Promise<RAGResponse> {
  try {
    // Search for relevant chunks (same as non-streaming)
    const searchResults = await searchRelevantChunks(question, {
      creator_id: options.creator_id,
      match_count: TOP_K_CHUNKS,
      video_ids: options.video_ids,
    });

    const context = buildContext(searchResults);

    const messages: Anthropic.MessageParam[] = [];

    if (options.conversation_history && options.conversation_history.length > 0) {
      options.conversation_history.forEach((msg) => {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      });
    }

    messages.push({
      role: 'user',
      content: `${context}\n\nQuestion: ${question}`,
    });

    // Create streaming request
    const stream = await anthropic.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system: buildSystemPrompt(options.context_type),
      messages,
    });

    let fullAnswer = '';

    // Process stream
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const chunk = event.delta.text;
        fullAnswer += chunk;
        onChunk(chunk);
      }
    }

    // Build final response
    const videoReferences = extractVideoReferences(searchResults);
    const confidence = calculateConfidence(searchResults);

    return {
      answer: fullAnswer,
      video_references: videoReferences,
      context: {
        chunks: searchResults,
        total_chunks: searchResults.length,
        avg_similarity: searchResults.length > 0
          ? searchResults.reduce((sum, chunk) => sum + chunk.similarity, 0) / searchResults.length
          : 0,
      },
      confidence,
    };
  } catch (error) {
    console.error('Error in RAG streaming query:', error);
    throw new Error(`RAG streaming query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Suggest follow-up questions based on context
 */
export function suggestFollowUpQuestions(
  ragResponse: RAGResponse,
  questionAsked: string
): string[] {
  const suggestions: string[] = [];

  // Extract topics from video references
  const topics = new Set<string>();
  ragResponse.context.chunks.forEach((chunk) => {
    if (chunk.chunk.topic_tags) {
      chunk.chunk.topic_tags.forEach((tag) => topics.add(tag));
    }
  });

  // Generate suggestions based on confidence
  if (ragResponse.confidence < 0.5) {
    suggestions.push('Could you rephrase your question to be more specific?');
    suggestions.push('What specific aspect would you like to know more about?');
  } else {
    // Generate topic-based suggestions
    topics.forEach((topic) => {
      suggestions.push(`Can you explain more about ${topic}?`);
    });

    // Add general follow-ups
    suggestions.push('Can you show me an example?');
    suggestions.push('What are the common mistakes to avoid?');
    suggestions.push('How can I practice this concept?');
  }

  return suggestions.slice(0, 3); // Return max 3 suggestions
}

/**
 * Complete chat interaction with session management
 * This is the main entry point for the chat API
 */
export async function chatWithSession(
  question: string,
  studentId: string,
  creatorId: string,
  sessionId?: string,
  contextType?: 'general' | 'project-specific' | 'quiz-help'
): Promise<{
  session_id: string;
  message_id: string;
  answer: string;
  video_references: VideoReference[];
  confidence: number;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    model: string;
  };
}> {
  try {
    logInfo('Starting chat interaction', { studentId, creatorId, sessionId });

    // Step 1: Get or create session
    const session = sessionId
      ? await chatService.getSession(sessionId)
      : await chatService.getOrCreateSession(studentId, creatorId, contextType);

    // Step 2: Save user message
    await chatService.saveMessage(session.id, 'user', question);

    // Step 3: Get conversation history
    const history = await chatService.getConversationContext(session.id, 5);

    // Step 4: Query RAG engine
    const ragResponse = await queryRAG(question, {
      creator_id: creatorId,
      student_id: studentId,
      context_type: session.context_type as any,
      conversation_history: history,
    });

    // Step 5: Save assistant message
    const assistantMessage = await chatService.saveMessage(
      session.id,
      'assistant',
      ragResponse.answer,
      ragResponse.video_references
    );

    logInfo('Chat interaction completed', {
      sessionId: session.id,
      messageId: assistantMessage.id,
      confidence: ragResponse.confidence,
    });

    return {
      session_id: session.id,
      message_id: assistantMessage.id,
      answer: ragResponse.answer,
      video_references: ragResponse.video_references,
      confidence: ragResponse.confidence,
      usage: ragResponse.usage,
    };
  } catch (error) {
    logError('Chat interaction failed', { error, studentId, creatorId, question });
    throw new AIAPIError(`Failed to process chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
