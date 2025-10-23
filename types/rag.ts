/**
 * RAG (Retrieval-Augmented Generation) Type Definitions
 * Multi-tenant video learning platform with vector search
 */

// ============================================================================
// Core Entity Types
// ============================================================================

export interface Creator {
  id: string;
  whop_company_id: string;
  whop_user_id: string;
  company_name: string;
  handle: string | null;
  subscription_tier: SubscriptionTier;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export enum SubscriptionTier {
  STARTER = 'starter',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

export interface Video {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  video_url: string;
  storage_path?: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  transcript?: string;
  transcript_processed: boolean;
  processing_status: ProcessingStatus;
  category?: string;
  tags?: string[];
  difficulty_level?: DifficultyLevel;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export enum ProcessingStatus {
  PENDING = 'pending',
  TRANSCRIBING = 'transcribing',
  CHUNKING = 'chunking',
  EMBEDDING = 'embedding',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

export interface VideoChunk {
  id: string;
  video_id: string;
  creator_id: string;
  chunk_text: string;
  chunk_index: number;
  start_timestamp?: number;
  end_timestamp?: number;
  embedding?: number[]; // 1536 dimensions for OpenAI ada-002
  topic_tags?: string[];
  created_at: string;
}

export interface ChatSession {
  id: string;
  student_id: string;
  creator_id: string;
  title: string;
  context_type?: ContextType;
  created_at: string;
  updated_at: string;
}

export enum ContextType {
  GENERAL = 'general',
  PROJECT_SPECIFIC = 'project-specific',
  QUIZ_HELP = 'quiz-help'
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  video_references?: VideoReference[];
  feedback?: FeedbackType;
  created_at: string;
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

export enum FeedbackType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative'
}

export interface VideoReference {
  video_id: string;
  title: string;
  timestamp: number; // seconds
  relevance_score: number;
}

export interface Enrollment {
  id: string;
  student_id: string;
  creator_id: string;
  enrolled_at: string;
  status: EnrollmentStatus;
  created_at: string;
}

export enum EnrollmentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

// ============================================================================
// CHRONOS Token System Types
// ============================================================================

export interface TokenWallet {
  id: string;
  student_id: string;
  solana_address: string;
  private_key_encrypted: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  total_redeemed: number;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface TokenTransaction {
  id: string;
  wallet_id: string;
  student_id: string;
  amount: number;
  type: TransactionType;
  source: string;
  source_id?: string;
  signature?: string; // Solana transaction signature
  metadata: Record<string, any>;
  created_at: string;
}

export enum TransactionType {
  EARN = 'earn',
  SPEND = 'spend',
  REDEEM = 'redeem'
}

export interface ChronosTransaction {
  id: string;
  student_id: string;
  creator_id?: string;
  amount: number;
  reason: RewardReason;
  metadata?: Record<string, any>;
  created_at: string;
}

export enum RewardReason {
  VIDEO_COMPLETION = 'video_completion',
  VIDEO_WATCH = 'video_watch',
  CHAT_MESSAGE = 'chat_message',
  QUIZ_COMPLETE = 'quiz_complete',
  ACHIEVEMENT_UNLOCK = 'achievement_unlock',
  DAILY_STREAK = 'daily_streak',
  MILESTONE = 'milestone',
  PROJECT_SUBMISSION = 'project_submission'
}

export interface RedemptionRequest {
  id: string;
  wallet_id: string;
  student_id: string;
  amount: number;
  redemption_type: RedemptionType;
  status: RedemptionStatus;
  payout_details: Record<string, any>;
  transaction_id?: string;
  admin_notes?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export enum RedemptionType {
  PAYPAL = 'paypal',
  GIFT_CARD = 'gift_card',
  PLATFORM_CREDIT = 'platform_credit'
}

export enum RedemptionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// ============================================================================
// RAG Search Types
// ============================================================================

export interface ChunkSearchResult {
  chunk_id: string;
  video_id: string;
  video_title: string;
  content: string;
  start_seconds: number;
  end_seconds: number;
  similarity: number;
}

export interface RAGSearchQuery {
  query: string;
  creator_id: string;
  match_count?: number;
  match_threshold?: number;
  video_ids?: string[];
}

export interface RAGSearchResponse {
  results: ChunkSearchResult[];
  total_matches: number;
  query_embedding?: number[];
}

export interface RAGChatRequest {
  session_id: string;
  message: string;
  creator_id: string;
  student_id: string;
  context_type?: ContextType;
}

export interface RAGChatResponse {
  message: ChatMessage;
  video_references: VideoReference[];
  chunks_used: ChunkSearchResult[];
}

// ============================================================================
// Video Processing Types
// ============================================================================

export interface VideoUploadRequest {
  creator_id: string;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  difficulty_level?: DifficultyLevel;
  file: File | Blob;
}

export interface VideoProcessingJob {
  video_id: string;
  creator_id: string;
  status: ProcessingStatus;
  current_step: ProcessingStep;
  progress_percentage: number;
  error?: string;
  started_at: string;
  completed_at?: string;
}

export enum ProcessingStep {
  UPLOADING = 'uploading',
  TRANSCRIBING = 'transcribing',
  CHUNKING = 'chunking',
  EMBEDDING = 'embedding',
  FINALIZING = 'finalizing'
}

export interface TranscriptionResult {
  video_id: string;
  transcript: string;
  duration_seconds: number;
  language?: string;
  confidence?: number;
}

export interface ChunkingResult {
  video_id: string;
  chunks: ChunkData[];
  total_chunks: number;
}

export interface ChunkData {
  chunk_text: string;
  chunk_index: number;
  start_timestamp: number;
  end_timestamp: number;
  topic_tags?: string[];
}

export interface EmbeddingResult {
  chunk_id: string;
  embedding: number[];
  dimensions: number;
}

// ============================================================================
// Analytics & Statistics Types
// ============================================================================

export interface CreatorStats {
  total_students: number;
  active_students: number;
  total_videos: number;
  processed_videos: number;
  total_chunks: number;
  total_chat_sessions: number;
}

export interface StudentEnrollmentInfo {
  enrollment_id: string;
  creator_id: string;
  creator_name: string;
  creator_handle: string;
  enrolled_at: string;
  status: EnrollmentStatus;
}

export interface VideoAnalytics {
  video_id: string;
  total_views: number;
  unique_viewers: number;
  avg_watch_time_seconds: number;
  completion_rate: number;
  chat_references: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateChatSessionRequest {
  student_id: string;
  creator_id: string;
  title?: string;
  context_type?: ContextType;
}

export interface CreateChatSessionResponse {
  session: ChatSession;
}

export interface GetChatHistoryRequest {
  session_id: string;
  limit?: number;
  offset?: number;
}

export interface GetChatHistoryResponse {
  messages: ChatMessage[];
  total_count: number;
  has_more: boolean;
}

export interface AwardTokensRequest {
  student_id: string;
  amount: number;
  reason: RewardReason;
  creator_id?: string;
  metadata?: Record<string, any>;
}

export interface AwardTokensResponse {
  transaction: TokenTransaction;
  new_balance: number;
}

export interface GetStudentBalanceRequest {
  student_id: string;
}

export interface GetStudentBalanceResponse {
  balance: number;
  total_earned: number;
  total_spent: number;
  total_redeemed: number;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, any>;
  status_code: number;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isProcessingStatus(value: string): value is ProcessingStatus {
  return Object.values(ProcessingStatus).includes(value as ProcessingStatus);
}

export function isMessageRole(value: string): value is MessageRole {
  return Object.values(MessageRole).includes(value as MessageRole);
}

export function isRewardReason(value: string): value is RewardReason {
  return Object.values(RewardReason).includes(value as RewardReason);
}

export function isEnrollmentStatus(value: string): value is EnrollmentStatus {
  return Object.values(EnrollmentStatus).includes(value as EnrollmentStatus);
}
