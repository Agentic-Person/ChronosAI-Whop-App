/**
 * Chat Service
 * Handles database operations for chat sessions and messages
 */

import { supabaseAdmin } from '@/lib/utils/supabase-client';
import { ChatSession, ChatMessage, VideoReference } from '@/types/database';
import { DatabaseError, RecordNotFoundError } from '@/lib/infrastructure/errors';
import { logDatabaseQuery, logError } from '@/lib/infrastructure/monitoring/logger';

export class ChatService {
  /**
   * Create a new chat session
   */
  async createSession(
    studentId: string,
    creatorId: string,
    contextType: 'general' | 'project-specific' | 'quiz-help' = 'general',
    title?: string
  ): Promise<ChatSession> {
    try {
      logDatabaseQuery('create_chat_session', { studentId, creatorId, contextType });

      const { data, error } = await supabaseAdmin
        .from('chat_sessions')
        .insert({
          student_id: studentId,
          creator_id: creatorId,
          title: title || 'New Conversation',
          context_type: contextType,
        })
        .select()
        .single();

      if (error) {
        throw new DatabaseError(`Failed to create chat session: ${error.message}`);
      }

      return data;
    } catch (error) {
      logError('Failed to create chat session', { error, studentId, creatorId });
      throw error;
    }
  }

  /**
   * Get or create a session for a student
   * Returns the most recent session or creates a new one
   */
  async getOrCreateSession(
    studentId: string,
    creatorId: string,
    contextType?: 'general' | 'project-specific' | 'quiz-help'
  ): Promise<ChatSession> {
    try {
      // Try to get the most recent session
      const { data: sessions, error } = await supabaseAdmin
        .from('chat_sessions')
        .select('*')
        .eq('student_id', studentId)
        .eq('creator_id', creatorId)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) {
        throw new DatabaseError(`Failed to fetch chat sessions: ${error.message}`);
      }

      if (sessions && sessions.length > 0) {
        return sessions[0];
      }

      // Create new session if none exists
      return this.createSession(studentId, creatorId, contextType || 'general');
    } catch (error) {
      logError('Failed to get or create session', { error, studentId, creatorId });
      throw error;
    }
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<ChatSession> {
    try {
      const { data, error } = await supabaseAdmin
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new RecordNotFoundError('Chat session not found');
        }
        throw new DatabaseError(`Failed to fetch chat session: ${error.message}`);
      }

      return data;
    } catch (error) {
      logError('Failed to get session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Save a message to the database
   */
  async saveMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    videoReferences?: VideoReference[]
  ): Promise<ChatMessage> {
    try {
      logDatabaseQuery('save_chat_message', { sessionId, role, contentLength: content.length });

      const { data, error } = await supabaseAdmin
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          role,
          content,
          video_references: videoReferences || null,
        })
        .select()
        .single();

      if (error) {
        throw new DatabaseError(`Failed to save message: ${error.message}`);
      }

      // Update session's updated_at timestamp
      await this.updateSessionTimestamp(sessionId);

      return data;
    } catch (error) {
      logError('Failed to save message', { error, sessionId, role });
      throw error;
    }
  }

  /**
   * Get conversation history for a session
   */
  async getHistory(sessionId: string, limit: number = 10): Promise<ChatMessage[]> {
    try {
      logDatabaseQuery('get_chat_history', { sessionId, limit });

      const { data, error } = await supabaseAdmin
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        throw new DatabaseError(`Failed to fetch chat history: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logError('Failed to get chat history', { error, sessionId });
      throw error;
    }
  }

  /**
   * Get recent conversation context (last N messages)
   * Returns formatted conversation for RAG context
   */
  async getConversationContext(
    sessionId: string,
    messageCount: number = 5
  ): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    try {
      const messages = await this.getHistory(sessionId, messageCount);

      return messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));
    } catch (error) {
      logError('Failed to get conversation context', { error, sessionId });
      throw error;
    }
  }

  /**
   * Update message feedback
   */
  async updateFeedback(
    messageId: string,
    feedback: 'positive' | 'negative'
  ): Promise<void> {
    try {
      logDatabaseQuery('update_message_feedback', { messageId, feedback });

      const { error } = await supabaseAdmin
        .from('chat_messages')
        .update({ feedback })
        .eq('id', messageId);

      if (error) {
        throw new DatabaseError(`Failed to update feedback: ${error.message}`);
      }
    } catch (error) {
      logError('Failed to update feedback', { error, messageId, feedback });
      throw error;
    }
  }

  /**
   * Get all sessions for a student
   */
  async getStudentSessions(
    studentId: string,
    limit: number = 20
  ): Promise<ChatSession[]> {
    try {
      logDatabaseQuery('get_student_sessions', { studentId, limit });

      const { data, error } = await supabaseAdmin
        .from('chat_sessions')
        .select('*')
        .eq('student_id', studentId)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new DatabaseError(`Failed to fetch student sessions: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logError('Failed to get student sessions', { error, studentId });
      throw error;
    }
  }

  /**
   * Update session title
   */
  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('chat_sessions')
        .update({ title })
        .eq('id', sessionId);

      if (error) {
        throw new DatabaseError(`Failed to update session title: ${error.message}`);
      }
    } catch (error) {
      logError('Failed to update session title', { error, sessionId, title });
      throw error;
    }
  }

  /**
   * Delete a session and all its messages
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      logDatabaseQuery('delete_chat_session', { sessionId });

      // Messages will be cascade deleted due to foreign key constraint
      const { error } = await supabaseAdmin
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        throw new DatabaseError(`Failed to delete session: ${error.message}`);
      }
    } catch (error) {
      logError('Failed to delete session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Get message count for a session
   */
  async getMessageCount(sessionId: string): Promise<number> {
    try {
      const { count, error } = await supabaseAdmin
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId);

      if (error) {
        throw new DatabaseError(`Failed to count messages: ${error.message}`);
      }

      return count || 0;
    } catch (error) {
      logError('Failed to get message count', { error, sessionId });
      throw error;
    }
  }

  /**
   * Get feedback statistics for a creator (analytics)
   */
  async getFeedbackStats(creatorId: string): Promise<{
    total_messages: number;
    positive_feedback: number;
    negative_feedback: number;
    feedback_rate: number;
  }> {
    try {
      // Get total messages
      const { count: totalCount } = await supabaseAdmin
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'assistant')
        .in('session_id',
          supabaseAdmin
            .from('chat_sessions')
            .select('id')
            .eq('creator_id', creatorId)
        );

      // Get positive feedback count
      const { count: positiveCount } = await supabaseAdmin
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('feedback', 'positive')
        .in('session_id',
          supabaseAdmin
            .from('chat_sessions')
            .select('id')
            .eq('creator_id', creatorId)
        );

      // Get negative feedback count
      const { count: negativeCount } = await supabaseAdmin
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('feedback', 'negative')
        .in('session_id',
          supabaseAdmin
            .from('chat_sessions')
            .select('id')
            .eq('creator_id', creatorId)
        );

      const total = totalCount || 0;
      const positive = positiveCount || 0;
      const negative = negativeCount || 0;
      const feedbackRate = total > 0 ? ((positive + negative) / total) * 100 : 0;

      return {
        total_messages: total,
        positive_feedback: positive,
        negative_feedback: negative,
        feedback_rate: Math.round(feedbackRate * 10) / 10,
      };
    } catch (error) {
      logError('Failed to get feedback stats', { error, creatorId });
      throw error;
    }
  }

  /**
   * Update session timestamp (called when new message added)
   */
  private async updateSessionTimestamp(sessionId: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) {
        // Log but don't throw - this is not critical
        logError('Failed to update session timestamp', { error, sessionId });
      }
    } catch (error) {
      // Silently fail - timestamp update is not critical
      logError('Failed to update session timestamp', { error, sessionId });
    }
  }
}

// Export singleton instance
export const chatService = new ChatService();
