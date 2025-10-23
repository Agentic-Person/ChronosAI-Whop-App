/**
 * RAG Database Helper Functions
 * Multi-tenant video learning platform operations
 */

import { supabaseAdmin } from '@/lib/utils/supabase-client';
import {
  Creator,
  Video,
  VideoChunk,
  ChatSession,
  ChatMessage,
  Enrollment,
  TokenTransaction,
  ChunkSearchResult,
  CreatorStats,
  StudentEnrollmentInfo,
  ProcessingStatus,
  MessageRole,
  EnrollmentStatus,
  RewardReason,
} from '@/types/rag';

// ============================================================================
// Creator Operations
// ============================================================================

/**
 * Get creator by Whop company ID
 */
export async function getCreatorByWhopId(whopCompanyId: string): Promise<Creator | null> {
  const { data, error } = await supabaseAdmin
    .from('creators')
    .select('*')
    .eq('whop_company_id', whopCompanyId)
    .single();

  if (error) {
    console.error('Error fetching creator by Whop ID:', error);
    return null;
  }

  return data as Creator;
}

/**
 * Get creator by handle
 */
export async function getCreatorByHandle(handle: string): Promise<Creator | null> {
  const { data, error } = await supabaseAdmin
    .from('creators')
    .select('*')
    .eq('handle', handle)
    .single();

  if (error) {
    console.error('Error fetching creator by handle:', error);
    return null;
  }

  return data as Creator;
}

/**
 * Create a new creator
 */
export async function createCreator(
  whopCompanyId: string,
  whopUserId: string,
  companyName: string,
  handle: string
): Promise<Creator> {
  const { data, error } = await supabaseAdmin
    .from('creators')
    .insert({
      whop_company_id: whopCompanyId,
      whop_user_id: whopUserId,
      company_name: companyName,
      handle,
      subscription_tier: 'starter',
      settings: {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create creator: ${error.message}`);
  }

  return data as Creator;
}

/**
 * Update creator handle
 */
export async function updateCreatorHandle(creatorId: string, handle: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('creators')
    .update({ handle })
    .eq('id', creatorId);

  if (error) {
    throw new Error(`Failed to update creator handle: ${error.message}`);
  }
}

/**
 * Get creator statistics
 */
export async function getCreatorStats(creatorId: string): Promise<CreatorStats> {
  const { data, error } = await supabaseAdmin.rpc('get_creator_stats', {
    p_creator_id: creatorId,
  });

  if (error) {
    throw new Error(`Failed to get creator stats: ${error.message}`);
  }

  return data[0] as CreatorStats;
}

// ============================================================================
// Video Operations
// ============================================================================

/**
 * Get all videos for a creator
 */
export async function getCreatorVideos(creatorId: string): Promise<Video[]> {
  const { data, error } = await supabaseAdmin
    .from('videos')
    .select('*')
    .eq('creator_id', creatorId)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch creator videos: ${error.message}`);
  }

  return data as Video[];
}

/**
 * Get video by ID
 */
export async function getVideoById(videoId: string): Promise<Video | null> {
  const { data, error } = await supabaseAdmin
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .single();

  if (error) {
    console.error('Error fetching video by ID:', error);
    return null;
  }

  return data as Video;
}

/**
 * Create a new video
 */
export async function createVideo(
  video: Omit<Video, 'id' | 'created_at' | 'updated_at'>
): Promise<Video> {
  const { data, error } = await supabaseAdmin
    .from('videos')
    .insert(video)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create video: ${error.message}`);
  }

  return data as Video;
}

/**
 * Update video processing status
 */
export async function updateVideoStatus(
  videoId: string,
  status: ProcessingStatus,
  transcript?: string
): Promise<void> {
  const updateData: any = { processing_status: status };
  if (transcript) {
    updateData.transcript = transcript;
    updateData.transcript_processed = true;
  }

  const { error } = await supabaseAdmin
    .from('videos')
    .update(updateData)
    .eq('id', videoId);

  if (error) {
    throw new Error(`Failed to update video status: ${error.message}`);
  }
}

/**
 * Update video metadata
 */
export async function updateVideoMetadata(
  videoId: string,
  metadata: Partial<Pick<Video, 'title' | 'description' | 'category' | 'tags' | 'difficulty_level'>>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('videos')
    .update(metadata)
    .eq('id', videoId);

  if (error) {
    throw new Error(`Failed to update video metadata: ${error.message}`);
  }
}

/**
 * Delete video and all associated chunks
 */
export async function deleteVideo(videoId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('videos')
    .delete()
    .eq('id', videoId);

  if (error) {
    throw new Error(`Failed to delete video: ${error.message}`);
  }
}

// ============================================================================
// Video Chunk Operations
// ============================================================================

/**
 * Insert a video chunk with embedding
 */
export async function insertChunk(
  chunk: Omit<VideoChunk, 'id' | 'created_at'>
): Promise<VideoChunk> {
  const { data, error } = await supabaseAdmin
    .from('video_chunks')
    .insert(chunk)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert chunk: ${error.message}`);
  }

  return data as VideoChunk;
}

/**
 * Batch insert video chunks
 */
export async function insertChunks(
  chunks: Omit<VideoChunk, 'id' | 'created_at'>[]
): Promise<VideoChunk[]> {
  const { data, error } = await supabaseAdmin
    .from('video_chunks')
    .insert(chunks)
    .select();

  if (error) {
    throw new Error(`Failed to insert chunks: ${error.message}`);
  }

  return data as VideoChunk[];
}

/**
 * Get chunks for a video
 */
export async function getVideoChunks(videoId: string): Promise<VideoChunk[]> {
  const { data, error } = await supabaseAdmin
    .from('video_chunks')
    .select('*')
    .eq('video_id', videoId)
    .order('chunk_index', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch video chunks: ${error.message}`);
  }

  return data as VideoChunk[];
}

/**
 * Delete all chunks for a video
 */
export async function deleteVideoChunks(videoId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('video_chunks')
    .delete()
    .eq('video_id', videoId);

  if (error) {
    throw new Error(`Failed to delete video chunks: ${error.message}`);
  }
}

/**
 * Search chunks using vector similarity
 */
export async function searchChunks(
  queryEmbedding: number[],
  creatorId: string,
  matchCount: number = 5,
  matchThreshold: number = 0.7
): Promise<ChunkSearchResult[]> {
  const { data, error } = await supabaseAdmin.rpc('match_chunks', {
    query_embedding: queryEmbedding,
    filter_creator_id: creatorId,
    match_count: matchCount,
    match_threshold: matchThreshold,
  });

  if (error) {
    throw new Error(`Failed to search chunks: ${error.message}`);
  }

  return data as ChunkSearchResult[];
}

// ============================================================================
// Chat Operations
// ============================================================================

/**
 * Create a new chat session
 */
export async function createChatSession(
  studentId: string,
  creatorId: string,
  title: string = 'New Conversation',
  contextType?: string
): Promise<ChatSession> {
  const { data, error } = await supabaseAdmin
    .from('chat_sessions')
    .insert({
      student_id: studentId,
      creator_id: creatorId,
      title,
      context_type: contextType,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create chat session: ${error.message}`);
  }

  return data as ChatSession;
}

/**
 * Get chat session by ID
 */
export async function getChatSession(sessionId: string): Promise<ChatSession | null> {
  const { data, error } = await supabaseAdmin
    .from('chat_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) {
    console.error('Error fetching chat session:', error);
    return null;
  }

  return data as ChatSession;
}

/**
 * Get chat sessions for a student
 */
export async function getStudentChatSessions(
  studentId: string,
  creatorId?: string
): Promise<ChatSession[]> {
  let query = supabaseAdmin
    .from('chat_sessions')
    .select('*')
    .eq('student_id', studentId);

  if (creatorId) {
    query = query.eq('creator_id', creatorId);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch student chat sessions: ${error.message}`);
  }

  return data as ChatSession[];
}

/**
 * Add a message to a chat session
 */
export async function addChatMessage(
  message: Omit<ChatMessage, 'id' | 'created_at'>
): Promise<ChatMessage> {
  const { data, error } = await supabaseAdmin
    .from('chat_messages')
    .insert(message)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add chat message: ${error.message}`);
  }

  // Update session's updated_at timestamp
  await supabaseAdmin
    .from('chat_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', message.session_id);

  return data as ChatMessage;
}

/**
 * Get messages for a chat session
 */
export async function getChatMessages(
  sessionId: string,
  limit?: number
): Promise<ChatMessage[]> {
  let query = supabaseAdmin
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch chat messages: ${error.message}`);
  }

  return data as ChatMessage[];
}

/**
 * Update message feedback
 */
export async function updateMessageFeedback(
  messageId: string,
  feedback: 'positive' | 'negative'
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('chat_messages')
    .update({ feedback })
    .eq('id', messageId);

  if (error) {
    throw new Error(`Failed to update message feedback: ${error.message}`);
  }
}

/**
 * Delete chat session and all messages
 */
export async function deleteChatSession(sessionId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    throw new Error(`Failed to delete chat session: ${error.message}`);
  }
}

// ============================================================================
// Enrollment Operations
// ============================================================================

/**
 * Enroll a student with a creator
 */
export async function enrollStudent(
  studentId: string,
  creatorId: string
): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc('enroll_student', {
    p_student_id: studentId,
    p_creator_id: creatorId,
  });

  if (error) {
    throw new Error(`Failed to enroll student: ${error.message}`);
  }

  return data as string; // Returns enrollment ID
}

/**
 * Unenroll a student from a creator
 */
export async function unenrollStudent(
  studentId: string,
  creatorId: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('unenroll_student', {
    p_student_id: studentId,
    p_creator_id: creatorId,
  });

  if (error) {
    throw new Error(`Failed to unenroll student: ${error.message}`);
  }

  return data as boolean;
}

/**
 * Get student enrollments
 */
export async function getStudentEnrollments(
  studentId: string
): Promise<StudentEnrollmentInfo[]> {
  const { data, error } = await supabaseAdmin.rpc('get_student_enrollments', {
    p_student_id: studentId,
  });

  if (error) {
    throw new Error(`Failed to fetch student enrollments: ${error.message}`);
  }

  return data as StudentEnrollmentInfo[];
}

/**
 * Check if student is enrolled with creator
 */
export async function isStudentEnrolled(
  studentId: string,
  creatorId: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .select('id')
    .eq('student_id', studentId)
    .eq('creator_id', creatorId)
    .eq('status', 'active')
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" error
    console.error('Error checking enrollment:', error);
  }

  return !!data;
}

/**
 * Get all enrolled students for a creator
 */
export async function getCreatorStudents(
  creatorId: string,
  status: EnrollmentStatus = 'active'
): Promise<Enrollment[]> {
  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .select('*')
    .eq('creator_id', creatorId)
    .eq('status', status)
    .order('enrolled_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch creator students: ${error.message}`);
  }

  return data as Enrollment[];
}

// ============================================================================
// CHRONOS Token Operations
// ============================================================================

/**
 * Award CHRONOS tokens to a student
 */
export async function awardTokens(
  studentId: string,
  amount: number,
  reason: RewardReason,
  creatorId?: string,
  metadata?: Record<string, any>
): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc('award_tokens', {
    p_student_id: studentId,
    p_amount: amount,
    p_source: reason,
    p_source_id: creatorId || null,
    p_metadata: metadata || {},
  });

  if (error) {
    throw new Error(`Failed to award tokens: ${error.message}`);
  }

  return data as number; // Returns new balance
}

/**
 * Get student CHRONOS balance
 */
export async function getStudentChronosBalance(studentId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('token_wallets')
    .select('balance')
    .eq('student_id', studentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Wallet doesn't exist yet
      return 0;
    }
    throw new Error(`Failed to get student balance: ${error.message}`);
  }

  return data.balance || 0;
}

/**
 * Get student token transactions
 */
export async function getStudentTokenTransactions(
  studentId: string,
  limit: number = 50
): Promise<TokenTransaction[]> {
  const { data, error } = await supabaseAdmin
    .from('token_transactions')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch token transactions: ${error.message}`);
  }

  return data as TokenTransaction[];
}

/**
 * Get token wallet for student
 */
export async function getStudentWallet(studentId: string): Promise<any | null> {
  const { data, error } = await supabaseAdmin
    .from('token_wallets')
    .select('*')
    .eq('student_id', studentId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching student wallet:', error);
    return null;
  }

  return data;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a video is fully processed
 */
export async function isVideoProcessed(videoId: string): Promise<boolean> {
  const video = await getVideoById(videoId);
  return video?.processing_status === 'completed';
}

/**
 * Get total chunk count for a creator
 */
export async function getCreatorChunkCount(creatorId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('video_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', creatorId);

  if (error) {
    throw new Error(`Failed to get chunk count: ${error.message}`);
  }

  return count || 0;
}

/**
 * Get videos by processing status
 */
export async function getVideosByStatus(
  creatorId: string,
  status: ProcessingStatus
): Promise<Video[]> {
  const { data, error } = await supabaseAdmin
    .from('videos')
    .select('*')
    .eq('creator_id', creatorId)
    .eq('processing_status', status)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch videos by status: ${error.message}`);
  }

  return data as Video[];
}
