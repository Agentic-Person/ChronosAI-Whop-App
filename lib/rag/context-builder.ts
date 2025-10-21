/**
 * Context Builder
 * Builds optimized context for Claude API from search results and conversation history
 */

import { ChatMessage } from '@/types/database';
import { SearchResult } from './vector-search';
import { formatTimestamp } from '@/lib/utils/helpers';

// Constants
const MAX_CONTEXT_TOKENS = 8000; // Conservative limit for Claude 3.5 Sonnet
const AVERAGE_CHARS_PER_TOKEN = 4; // Rough estimate
const MAX_CONTEXT_LENGTH = MAX_CONTEXT_TOKENS * AVERAGE_CHARS_PER_TOKEN;

export interface ContextOptions {
  includeHistory?: boolean;
  maxHistoryMessages?: number;
  maxChunks?: number;
}

export class ContextBuilder {
  /**
   * Build complete context for Claude from chunks and conversation history
   */
  build(
    chunks: SearchResult[],
    history: ChatMessage[] = [],
    options: ContextOptions = {}
  ): string {
    const {
      includeHistory = true,
      maxHistoryMessages = 5,
      maxChunks = 5,
    } = options;

    // Truncate chunks if needed
    const limitedChunks = chunks.slice(0, maxChunks);

    // Build knowledge base section
    const knowledgeBase = this.buildKnowledgeBase(limitedChunks);

    // Build conversation history section
    const conversationHistory = includeHistory
      ? this.buildConversationHistory(history, maxHistoryMessages)
      : '';

    // Combine all sections
    let context = knowledgeBase;

    if (conversationHistory) {
      context += '\n\n' + conversationHistory;
    }

    // Add instructions
    context += '\n\n' + this.buildInstructions();

    // Truncate if too long
    if (context.length > MAX_CONTEXT_LENGTH) {
      console.warn('Context exceeds token limit, truncating...');
      context = context.substring(0, MAX_CONTEXT_LENGTH);
    }

    return context.trim();
  }

  /**
   * Build knowledge base section from video chunks
   */
  private buildKnowledgeBase(chunks: SearchResult[]): string {
    if (chunks.length === 0) {
      return '# Knowledge Base\nNo relevant content found in the course videos.';
    }

    const formattedChunks = chunks
      .map((chunk, idx) => {
        const timestamp = chunk.start_timestamp
          ? formatTimestamp(chunk.start_timestamp)
          : '00:00';

        return `
## Source ${idx + 1}
**Video**: ${chunk.video_title}
**Timestamp**: ${timestamp}
**Relevance**: ${(chunk.similarity * 100).toFixed(1)}%

${chunk.chunk.chunk_text.trim()}
        `.trim();
      })
      .join('\n\n');

    return `# Knowledge Base\nThe following content is from the course videos:\n\n${formattedChunks}`;
  }

  /**
   * Build conversation history section
   */
  private buildConversationHistory(
    history: ChatMessage[],
    maxMessages: number
  ): string {
    if (history.length === 0) return '';

    // Get the most recent messages
    const recentHistory = history.slice(-maxMessages);

    const formatted = recentHistory
      .map((msg) => {
        const role = msg.role === 'user' ? 'Student' : 'Assistant';
        return `**${role}**: ${msg.content}`;
      })
      .join('\n\n');

    return `# Recent Conversation\n${formatted}`;
  }

  /**
   * Build instruction section for Claude
   */
  private buildInstructions(): string {
    return `# Instructions
You are an AI teaching assistant helping students understand video course content.

Your role:
1. Answer the student's question using ONLY the knowledge base provided above
2. ALWAYS cite specific videos with timestamps using this format: "📹 [Video Title] at [MM:SS]"
3. Be clear, concise, and encouraging
4. If the answer isn't in the knowledge base, say: "I don't have information about that in the course videos. Could you rephrase your question?"
5. Break down complex topics into digestible parts
6. Use examples from the videos when possible

IMPORTANT:
- Only answer based on the provided video content
- Never make up information not in the knowledge base
- Always provide video references to support your answer`;
  }

  /**
   * Extract video references from chunks for storage
   */
  extractVideoReferences(
    chunks: SearchResult[]
  ): Array<{
    video_id: string;
    title: string;
    timestamp: number;
    relevance_score: number;
  }> {
    // Group by video ID and keep the highest relevance chunk per video
    const videoMap = new Map<
      string,
      {
        video_id: string;
        title: string;
        timestamp: number;
        relevance_score: number;
      }
    >();

    chunks.forEach((chunk) => {
      const existing = videoMap.get(chunk.video_id);
      if (!existing || chunk.similarity > existing.relevance_score) {
        videoMap.set(chunk.video_id, {
          video_id: chunk.video_id,
          title: chunk.video_title,
          timestamp: chunk.start_timestamp || 0,
          relevance_score: chunk.similarity,
        });
      }
    });

    return Array.from(videoMap.values()).sort(
      (a, b) => b.relevance_score - a.relevance_score
    );
  }

  /**
   * Calculate estimated token count for context
   */
  estimateTokenCount(context: string): number {
    return Math.ceil(context.length / AVERAGE_CHARS_PER_TOKEN);
  }

  /**
   * Check if context is within token limits
   */
  isWithinLimits(context: string): boolean {
    return this.estimateTokenCount(context) <= MAX_CONTEXT_TOKENS;
  }

  /**
   * Build system prompt for different context types
   */
  buildSystemPrompt(contextType?: 'general' | 'project-specific' | 'quiz-help'): string {
    const basePrompt = `You are an AI learning assistant helping students understand video course content.

Your communication style:
- Clear and concise explanations
- Encouraging and supportive tone
- Use examples and analogies
- Break down complex topics
- Suggest next learning steps`;

    switch (contextType) {
      case 'project-specific':
        return `${basePrompt}

Context: The student is working on a project and needs implementation help.
- Provide practical, actionable advice
- Reference relevant code examples from videos
- Suggest debugging strategies
- Encourage hands-on experimentation`;

      case 'quiz-help':
        return `${basePrompt}

Context: The student is preparing for or struggling with a quiz.
- Help them understand concepts, don't just give answers
- Use Socratic questioning to guide learning
- Reference video content for review
- Reinforce key learning objectives`;

      default:
        return `${basePrompt}

Context: General learning assistance.
- Answer questions based on course content
- Suggest related topics to explore
- Encourage active learning
- Provide video references for deeper understanding`;
    }
  }
}

// Export singleton instance
export const contextBuilder = new ContextBuilder();
