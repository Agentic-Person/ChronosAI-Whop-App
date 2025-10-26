/**
 * Usage Tracking Type Definitions
 */

import { CostBreakdown } from './pricing-config';

// ============================================================================
// DATABASE TYPES
// ============================================================================

export interface APIUsageLog {
  id?: string;
  created_at?: string;
  request_id: string;
  user_id?: string;
  creator_id?: string;
  student_id?: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  provider: 'openai' | 'anthropic' | 'aws' | 'supabase';
  service: 'chat' | 'embeddings' | 'transcription' | 'storage' | 'vector-search';
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  duration_ms?: number;
  data_size_bytes?: number;
  cost_usd: number;
  cost_breakdown?: CostBreakdown[];
  status_code?: number;
  error_message?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

export interface UsageSummary {
  id?: string;
  created_at?: string;
  period_start: string;
  period_end: string;
  period_type: 'hour' | 'day' | 'week' | 'month';
  user_id?: string;
  creator_id?: string;
  total_api_calls: number;
  total_cost_usd: number;
  openai_cost_usd: number;
  anthropic_cost_usd: number;
  aws_cost_usd: number;
  chat_cost_usd: number;
  embedding_cost_usd: number;
  transcription_cost_usd: number;
  storage_cost_usd: number;
  chat_calls: number;
  embedding_calls: number;
  transcription_minutes: number;
  storage_gb: number;
  total_input_tokens: number;
  total_output_tokens: number;
  avg_response_time_ms: number | null;
  error_count: number;
}

export interface CostLimit {
  id?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  creator_id?: string;
  plan_tier: 'free' | 'basic' | 'pro' | 'enterprise';
  daily_limit: number;
  monthly_limit: number;
  daily_spent: number;
  monthly_spent: number;
  daily_reset_at: string;
  monthly_reset_at: string;
  warning_threshold: number;
  critical_threshold: number;
  enforce_hard_limit: boolean;
}

export interface CostAlert {
  id?: string;
  created_at?: string;
  user_id?: string;
  creator_id?: string;
  alert_type: 'warning' | 'critical' | 'limit_exceeded';
  threshold_percentage: number;
  current_spent: number;
  limit_amount: number;
  period: 'daily' | 'monthly';
  notified: boolean;
  notification_sent_at?: string;
  notification_method?: 'email' | 'in-app' | 'webhook';
  acknowledged: boolean;
  acknowledged_at?: string;
  acknowledged_by?: string;
}

// ============================================================================
// SERVICE TYPES
// ============================================================================

export interface UsageLog {
  request_id?: string;
  user_id?: string;
  creator_id?: string;
  student_id?: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  provider: 'openai' | 'anthropic' | 'aws' | 'supabase';
  service: 'chat' | 'embeddings' | 'transcription' | 'storage' | 'vector-search';
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  duration_ms?: number;
  data_size_bytes?: number;
  cost_usd: number;
  cost_breakdown?: CostBreakdown[];
  status_code?: number;
  error_message?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

export interface CostCheckResult {
  allowed: boolean;
  daily_remaining: number;
  monthly_remaining: number;
  daily_percentage: number;
  monthly_percentage: number;
  estimated_cost: number;
  warnings: string[];
}

export interface UsageStats {
  total_cost: number;
  daily_spent: number;
  monthly_spent: number;
  daily_limit: number;
  monthly_limit: number;
  total_api_calls: number;
  avg_response_time: number;
  error_rate: number;
  cost_by_provider: Record<string, number>;
  cost_by_service: Record<string, number>;
  top_endpoints: Array<{ endpoint: string; count: number; cost: number }>;
}

export interface DailyUsagePoint {
  date: string;
  cost: number;
  calls: number;
  errors?: number;
}

export interface ServiceBreakdown {
  service: string;
  cost: number;
  percentage: number;
  calls: number;
  avg_cost_per_call: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface UsageDashboardData {
  summary: UsageStats;
  dailyUsage: DailyUsagePoint[];
  breakdown: ServiceBreakdown[];
  alerts: CostAlert[];
  recommendations?: string[];
}

export interface UsageExportData {
  period: {
    start: string;
    end: string;
  };
  summary: UsageStats;
  details: APIUsageLog[];
  breakdown_by_day: DailyUsagePoint[];
  breakdown_by_service: ServiceBreakdown[];
}

// ============================================================================
// TRACKING CONTEXT
// ============================================================================

export interface TrackingContext {
  user_id?: string;
  creator_id?: string;
  student_id?: string;
  session_id?: string;
  video_id?: string;
  quiz_id?: string;
  project_id?: string;
  ip_address?: string;
  user_agent?: string;
}

// ============================================================================
// COST OPTIMIZATION
// ============================================================================

export interface CostOptimizationSuggestion {
  id: string;
  title: string;
  description: string;
  potential_savings: number;
  implementation_effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  category: 'model' | 'caching' | 'batching' | 'rate_limiting' | 'architecture';
}

export interface UsageTrend {
  period: 'daily' | 'weekly' | 'monthly';
  trend: 'increasing' | 'stable' | 'decreasing';
  change_percentage: number;
  projection_next_period: number;
  anomalies?: Array<{
    date: string;
    expected: number;
    actual: number;
    deviation_percentage: number;
  }>;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class CostLimitExceededError extends Error {
  public dailyRemaining: number;
  public monthlyRemaining: number;
  public estimatedCost: number;

  constructor(
    message: string,
    dailyRemaining: number,
    monthlyRemaining: number,
    estimatedCost: number
  ) {
    super(message);
    this.name = 'CostLimitExceededError';
    this.dailyRemaining = dailyRemaining;
    this.monthlyRemaining = monthlyRemaining;
    this.estimatedCost = estimatedCost;
  }
}

export class UsageTrackingError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'UsageTrackingError';
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const USAGE_TRACKING_CONSTANTS = {
  CACHE_TTL: {
    SUMMARY: 300, // 5 minutes
    DAILY: 3600, // 1 hour
    BREAKDOWN: 600, // 10 minutes
  },
  BATCH_SIZE: {
    LOGS: 100,
    SUMMARIES: 50,
  },
  LIMITS: {
    MAX_EXPORT_DAYS: 90,
    MAX_ALERT_HISTORY: 100,
  },
  THRESHOLDS: {
    DEFAULT_WARNING: 80,
    DEFAULT_CRITICAL: 95,
  },
} as const;

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type Provider = 'openai' | 'anthropic' | 'aws' | 'supabase';
export type Service = 'chat' | 'embeddings' | 'transcription' | 'storage' | 'vector-search';
export type PeriodType = 'hour' | 'day' | 'week' | 'month';
export type AlertType = 'warning' | 'critical' | 'limit_exceeded';

export type ProviderCosts = Partial<Record<Provider, number>>;
export type ServiceCosts = Partial<Record<Service, number>>;