/**
 * Cost Tracking Service
 *
 * Core service for tracking API usage and calculating costs
 * Provides real-time cost tracking, limit enforcement, and usage aggregation
 */

import { createClient } from '@/lib/supabase/server';
import { cache } from '@/lib/infrastructure/cache/redis-client';
import { CacheTTL } from '@/lib/infrastructure/cache/cache-keys';
import { logInfo, logError, logWarning } from '@/lib/infrastructure/monitoring/logger';
import {
  OPENAI_PRICING,
  ANTHROPIC_PRICING,
  AWS_PRICING,
  PLAN_LIMITS,
  calculateOpenAICost,
  calculateAnthropicCost,
  calculateS3Cost,
  calculateTranscriptionCost,
  calculateEmbeddingCost,
  estimateTokens,
  formatCost,
  type OpenAIModel,
  type AnthropicModel,
  type PlanTier,
  type TokenUsage,
  type CostBreakdown,
} from './pricing-config';
import {
  APIUsageLog,
  UsageSummary,
  CostLimit,
  CostAlert,
  UsageLog,
  CostCheckResult,
  UsageStats,
  DailyUsagePoint,
  ServiceBreakdown,
  TrackingContext,
  CostLimitExceededError,
  UsageTrackingError,
  USAGE_TRACKING_CONSTANTS,
} from './types';
import { randomUUID } from 'crypto';

// ============================================================================
// CORE SERVICE
// ============================================================================

export class CostTracker {
  private static instance: CostTracker;

  private constructor() {}

  public static getInstance(): CostTracker {
    if (!CostTracker.instance) {
      CostTracker.instance = new CostTracker();
    }
    return CostTracker.instance;
  }

  /**
   * Track API usage and log to database
   */
  async trackUsage(log: UsageLog): Promise<void> {
    const supabase = createClient();
    const requestId = log.request_id || randomUUID();

    try {
      // Add request ID if not provided
      const logData: APIUsageLog = {
        ...log,
        request_id: requestId,
        created_at: new Date().toISOString(),
      };

      // Insert usage log
      const { error } = await supabase
        .from('api_usage_logs')
        .insert(logData);

      if (error) {
        throw new UsageTrackingError('Failed to insert usage log', error);
      }

      // Invalidate cache for user's usage summary
      if (log.user_id) {
        await this.invalidateUserCache(log.user_id);
      }
      if (log.creator_id) {
        await this.invalidateCreatorCache(log.creator_id);
      }

      logInfo('Usage tracked successfully', {
        request_id: requestId,
        provider: log.provider,
        service: log.service,
        cost: log.cost_usd,
      });
    } catch (error) {
      logError('Failed to track usage', error as Error, {
        request_id: requestId,
        provider: log.provider,
        service: log.service,
      });
      // Don't throw - we don't want to fail the request if tracking fails
    }
  }

  /**
   * Check if user is within cost limits
   */
  async checkCostLimit(
    userId: string | undefined,
    creatorId: string | undefined,
    estimatedCost: number
  ): Promise<CostCheckResult> {
    const supabase = createClient();

    try {
      // Get user's cost limits
      let query = supabase
        .from('cost_limits')
        .select('*')
        .single();

      if (userId) {
        query = query.eq('user_id', userId);
      } else if (creatorId) {
        query = query.eq('creator_id', creatorId);
      } else {
        // No user or creator, allow by default
        return this.createDefaultCostCheckResult(estimatedCost);
      }

      const { data: limit, error } = await query;

      if (error || !limit) {
        // No limits set, use default free tier
        return this.createFreeTierCostCheckResult(estimatedCost);
      }

      const typedLimit = limit as CostLimit;
      return this.calculateCostCheckResult(typedLimit, estimatedCost);
    } catch (error) {
      logError('Failed to check cost limit', error as Error);
      // On error, be permissive but log warning
      return {
        allowed: true,
        daily_remaining: 0,
        monthly_remaining: 0,
        daily_percentage: 0,
        monthly_percentage: 0,
        estimated_cost: estimatedCost,
        warnings: ['Failed to check cost limits'],
      };
    }
  }

  /**
   * Get usage summary for a user or creator
   */
  async getUsageSummary(
    userId?: string,
    creatorId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<UsageSummary | null> {
    const supabase = createClient();
    const cacheKey = this.getUsageSummaryCacheKey(userId, creatorId);

    // Check cache first (only for current period)
    if (!startDate && !endDate) {
      const cached = await cache.get<UsageSummary>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      // Default to current month if no dates provided
      const start = startDate || this.getMonthStart();
      const end = endDate || new Date();

      // Try to get from pre-aggregated summaries first
      const summary = await this.getAggregatedSummary(userId, creatorId, start, end);
      if (summary) {
        // Cache for current period
        if (!startDate && !endDate) {
          await cache.set(cacheKey, summary, USAGE_TRACKING_CONSTANTS.CACHE_TTL.SUMMARY);
        }
        return summary;
      }

      // Fallback to calculating from raw logs
      return await this.calculateSummaryFromLogs(userId, creatorId, start, end);
    } catch (error) {
      logError('Failed to get usage summary', error as Error);
      return null;
    }
  }

  /**
   * Get daily usage for charts
   */
  async getDailyUsage(
    userId?: string,
    creatorId?: string,
    days: number = 30
  ): Promise<DailyUsagePoint[]> {
    const supabase = createClient();
    const cacheKey = `usage:daily:${userId || creatorId}:${days}`;

    // Check cache
    const cached = await cache.get<DailyUsagePoint[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Query aggregated summaries for better performance
      let query = supabase
        .from('usage_summaries')
        .select('period_start, total_cost_usd, total_api_calls, error_count')
        .eq('period_type', 'day')
        .gte('period_start', startDate.toISOString())
        .order('period_start', { ascending: true });

      if (userId) {
        query = query.eq('user_id', userId);
      } else if (creatorId) {
        query = query.eq('creator_id', creatorId);
      } else {
        return [];
      }

      const { data: summaries, error } = await query;

      if (error) {
        throw error;
      }

      const dailyData = (summaries || []).map(summary => ({
        date: new Date(summary.period_start).toISOString().split('T')[0],
        cost: summary.total_cost_usd || 0,
        calls: summary.total_api_calls || 0,
        errors: summary.error_count || 0,
      }));

      // Fill in missing days with zeros
      const filledData = this.fillMissingDays(dailyData, days);

      // Cache for 1 hour
      await cache.set(cacheKey, filledData, USAGE_TRACKING_CONSTANTS.CACHE_TTL.DAILY);

      return filledData;
    } catch (error) {
      logError('Failed to get daily usage', error as Error);
      return [];
    }
  }

  /**
   * Get cost breakdown by service
   */
  async getCostBreakdown(
    userId?: string,
    creatorId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ServiceBreakdown[]> {
    const summary = await this.getUsageSummary(userId, creatorId, startDate, endDate);

    if (!summary) {
      return [];
    }

    const breakdown = [
      {
        service: 'Chat AI',
        cost: summary.chat_cost_usd,
        calls: summary.chat_calls
      },
      {
        service: 'Embeddings',
        cost: summary.embedding_cost_usd,
        calls: summary.embedding_calls
      },
      {
        service: 'Transcription',
        cost: summary.transcription_cost_usd,
        calls: Math.round(summary.transcription_minutes / 5) // Estimate calls from minutes
      },
      {
        service: 'Storage',
        cost: summary.storage_cost_usd,
        calls: 0 // Storage doesn't have discrete calls
      },
    ];

    const total = summary.total_cost_usd || 1; // Avoid division by zero

    return breakdown
      .filter(item => item.cost > 0)
      .map(item => ({
        service: item.service,
        cost: item.cost,
        percentage: (item.cost / total) * 100,
        calls: item.calls,
        avg_cost_per_call: item.calls > 0 ? item.cost / item.calls : 0,
      }))
      .sort((a, b) => b.cost - a.cost);
  }

  /**
   * Estimate cost before making API call
   */
  estimateCost(
    provider: 'openai' | 'anthropic' | 'aws',
    service: string,
    model?: string,
    usage?: TokenUsage | number
  ): number {
    try {
      if (provider === 'openai' && model) {
        if (service === 'chat' && typeof usage === 'object') {
          return calculateOpenAICost(model as OpenAIModel, usage);
        } else if (service === 'embeddings' && typeof usage === 'number') {
          return calculateEmbeddingCost(usage, model as any);
        } else if (service === 'transcription' && typeof usage === 'number') {
          return calculateTranscriptionCost(usage);
        }
      } else if (provider === 'anthropic' && model && typeof usage === 'object') {
        return calculateAnthropicCost(model as AnthropicModel, usage);
      } else if (provider === 'aws' && service === 'storage' && typeof usage === 'number') {
        return calculateS3Cost(usage);
      }

      return 0;
    } catch (error) {
      logWarning('Failed to estimate cost', { provider, service, model, error });
      return 0;
    }
  }

  /**
   * Track chat API usage
   */
  async trackChatUsage(
    userId: string,
    creatorId: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    durationMs: number,
    context?: TrackingContext
  ): Promise<void> {
    const cost = this.estimateCost(
      'anthropic',
      'chat',
      model,
      { input: inputTokens, output: outputTokens }
    );

    await this.trackUsage({
      user_id: userId,
      creator_id: creatorId,
      student_id: context?.student_id,
      endpoint: '/api/chat',
      method: 'POST',
      provider: 'anthropic',
      service: 'chat',
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      duration_ms: durationMs,
      cost_usd: cost,
      cost_breakdown: [
        {
          provider: 'anthropic',
          service: 'chat',
          model,
          quantity: inputTokens + outputTokens,
          unit: 'tokens',
          unitCost: cost / (inputTokens + outputTokens),
          totalCost: cost,
        },
      ],
      status_code: 200,
      metadata: {
        session_id: context?.session_id,
        video_id: context?.video_id,
        ...context,
      },
      ip_address: context?.ip_address,
      user_agent: context?.user_agent,
    });
  }

  /**
   * Track embedding generation usage
   */
  async trackEmbeddingUsage(
    creatorId: string,
    tokenCount: number,
    model: string = 'text-embedding-ada-002',
    context?: TrackingContext
  ): Promise<void> {
    const cost = calculateEmbeddingCost(tokenCount, model as any);

    await this.trackUsage({
      creator_id: creatorId,
      endpoint: '/api/video/embeddings',
      method: 'POST',
      provider: 'openai',
      service: 'embeddings',
      model,
      input_tokens: tokenCount,
      cost_usd: cost,
      cost_breakdown: [
        {
          provider: 'openai',
          service: 'embeddings',
          model,
          quantity: tokenCount,
          unit: 'tokens',
          unitCost: cost / tokenCount,
          totalCost: cost,
        },
      ],
      status_code: 200,
      metadata: {
        video_id: context?.video_id,
        ...context,
      },
    });
  }

  /**
   * Track transcription usage
   */
  async trackTranscriptionUsage(
    creatorId: string,
    durationSeconds: number,
    context?: TrackingContext
  ): Promise<void> {
    const cost = calculateTranscriptionCost(durationSeconds);

    await this.trackUsage({
      creator_id: creatorId,
      endpoint: '/api/video/transcribe',
      method: 'POST',
      provider: 'openai',
      service: 'transcription',
      model: 'whisper-1',
      cost_usd: cost,
      cost_breakdown: [
        {
          provider: 'openai',
          service: 'transcription',
          model: 'whisper-1',
          quantity: durationSeconds / 60,
          unit: 'minutes',
          unitCost: OPENAI_PRICING['whisper-1'].usage,
          totalCost: cost,
        },
      ],
      status_code: 200,
      metadata: {
        duration_seconds: durationSeconds,
        video_id: context?.video_id,
        ...context,
      },
    });
  }

  /**
   * Get alerts for a user
   */
  async getAlerts(
    userId?: string,
    creatorId?: string,
    unacknowledgedOnly: boolean = true
  ): Promise<CostAlert[]> {
    const supabase = createClient();

    try {
      let query = supabase
        .from('cost_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(USAGE_TRACKING_CONSTANTS.LIMITS.MAX_ALERT_HISTORY);

      if (userId) {
        query = query.eq('user_id', userId);
      } else if (creatorId) {
        query = query.eq('creator_id', creatorId);
      }

      if (unacknowledgedOnly) {
        query = query.eq('acknowledged', false);
      }

      const { data: alerts, error } = await query;

      if (error) {
        throw error;
      }

      return alerts || [];
    } catch (error) {
      logError('Failed to get alerts', error as Error);
      return [];
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('cost_alerts')
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: userId,
        })
        .eq('id', alertId);

      if (error) {
        throw error;
      }

      logInfo('Alert acknowledged', { alertId, userId });
    } catch (error) {
      logError('Failed to acknowledge alert', error as Error);
      throw new UsageTrackingError('Failed to acknowledge alert', error as Error);
    }
  }

  /**
   * Get usage stats for dashboard
   */
  async getUsageStats(
    userId?: string,
    creatorId?: string
  ): Promise<UsageStats> {
    const summary = await this.getUsageSummary(userId, creatorId);
    const limits = await this.getCostLimits(userId, creatorId);

    if (!summary) {
      return this.getEmptyUsageStats();
    }

    const errorRate = summary.total_api_calls > 0
      ? (summary.error_count / summary.total_api_calls) * 100
      : 0;

    return {
      total_cost: summary.total_cost_usd,
      daily_spent: limits?.daily_spent || 0,
      monthly_spent: limits?.monthly_spent || summary.total_cost_usd,
      daily_limit: limits?.daily_limit || PLAN_LIMITS.free.daily,
      monthly_limit: limits?.monthly_limit || PLAN_LIMITS.free.monthly,
      total_api_calls: summary.total_api_calls,
      avg_response_time: summary.avg_response_time_ms || 0,
      error_rate,
      cost_by_provider: {
        openai: summary.openai_cost_usd,
        anthropic: summary.anthropic_cost_usd,
        aws: summary.aws_cost_usd,
      },
      cost_by_service: {
        chat: summary.chat_cost_usd,
        embeddings: summary.embedding_cost_usd,
        transcription: summary.transcription_cost_usd,
        storage: summary.storage_cost_usd,
      },
      top_endpoints: [], // TODO: Implement top endpoints
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async invalidateUserCache(userId: string): Promise<void> {
    await cache.del(`usage:summary:${userId}`);
    await cache.del(`usage:daily:${userId}:7`);
    await cache.del(`usage:daily:${userId}:30`);
    await cache.del(`usage:daily:${userId}:90`);
  }

  private async invalidateCreatorCache(creatorId: string): Promise<void> {
    await cache.del(`usage:summary:creator:${creatorId}`);
    await cache.del(`usage:daily:${creatorId}:7`);
    await cache.del(`usage:daily:${creatorId}:30`);
    await cache.del(`usage:daily:${creatorId}:90`);
  }

  private getUsageSummaryCacheKey(userId?: string, creatorId?: string): string {
    return userId
      ? `usage:summary:${userId}`
      : `usage:summary:creator:${creatorId}`;
  }

  private getMonthStart(): Date {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private createDefaultCostCheckResult(estimatedCost: number): CostCheckResult {
    return {
      allowed: true,
      daily_remaining: Infinity,
      monthly_remaining: Infinity,
      daily_percentage: 0,
      monthly_percentage: 0,
      estimated_cost: estimatedCost,
      warnings: [],
    };
  }

  private createFreeTierCostCheckResult(estimatedCost: number): CostCheckResult {
    const defaultLimit = PLAN_LIMITS.free;
    return {
      allowed: estimatedCost <= defaultLimit.daily,
      daily_remaining: defaultLimit.daily - estimatedCost,
      monthly_remaining: defaultLimit.monthly - estimatedCost,
      daily_percentage: (estimatedCost / defaultLimit.daily) * 100,
      monthly_percentage: (estimatedCost / defaultLimit.monthly) * 100,
      estimated_cost: estimatedCost,
      warnings: estimatedCost > defaultLimit.daily
        ? ['Estimated cost exceeds free tier daily limit']
        : [],
    };
  }

  private calculateCostCheckResult(
    limit: CostLimit,
    estimatedCost: number
  ): CostCheckResult {
    const dailyRemaining = limit.daily_limit - limit.daily_spent;
    const monthlyRemaining = limit.monthly_limit - limit.monthly_spent;

    const dailyPercentage = ((limit.daily_spent + estimatedCost) / limit.daily_limit) * 100;
    const monthlyPercentage = ((limit.monthly_spent + estimatedCost) / limit.monthly_limit) * 100;

    const warnings: string[] = [];

    if (dailyPercentage >= limit.critical_threshold) {
      warnings.push(`Critical: Daily usage at ${dailyPercentage.toFixed(1)}%`);
    } else if (dailyPercentage >= limit.warning_threshold) {
      warnings.push(`Warning: Daily usage at ${dailyPercentage.toFixed(1)}%`);
    }

    if (monthlyPercentage >= limit.critical_threshold) {
      warnings.push(`Critical: Monthly usage at ${monthlyPercentage.toFixed(1)}%`);
    } else if (monthlyPercentage >= limit.warning_threshold) {
      warnings.push(`Warning: Monthly usage at ${monthlyPercentage.toFixed(1)}%`);
    }

    const allowed = limit.enforce_hard_limit
      ? (dailyRemaining >= estimatedCost && monthlyRemaining >= estimatedCost)
      : true;

    return {
      allowed,
      daily_remaining: Math.max(0, dailyRemaining - estimatedCost),
      monthly_remaining: Math.max(0, monthlyRemaining - estimatedCost),
      daily_percentage: Math.min(100, dailyPercentage),
      monthly_percentage: Math.min(100, monthlyPercentage),
      estimated_cost: estimatedCost,
      warnings,
    };
  }

  private async getCostLimits(
    userId?: string,
    creatorId?: string
  ): Promise<CostLimit | null> {
    const supabase = createClient();

    try {
      let query = supabase
        .from('cost_limits')
        .select('*')
        .single();

      if (userId) {
        query = query.eq('user_id', userId);
      } else if (creatorId) {
        query = query.eq('creator_id', creatorId);
      } else {
        return null;
      }

      const { data, error } = await query;
      return error ? null : data as CostLimit;
    } catch (error) {
      return null;
    }
  }

  private async getAggregatedSummary(
    userId?: string,
    creatorId?: string,
    start: Date,
    end: Date
  ): Promise<UsageSummary | null> {
    // TODO: Implement fetching from pre-aggregated summaries
    return null;
  }

  private async calculateSummaryFromLogs(
    userId?: string,
    creatorId?: string,
    start: Date,
    end: Date
  ): Promise<UsageSummary> {
    const supabase = createClient();

    let query = supabase
      .from('api_usage_logs')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (creatorId) {
      query = query.eq('creator_id', creatorId);
    }

    const { data: logs, error } = await query;

    if (error || !logs || logs.length === 0) {
      return this.getEmptySummary(start, end);
    }

    return this.aggregateLogs(logs as APIUsageLog[], start, end);
  }

  private aggregateLogs(logs: APIUsageLog[], start: Date, end: Date): UsageSummary {
    const summary: UsageSummary = this.getEmptySummary(start, end);

    let totalResponseTime = 0;
    let responseTimeCount = 0;

    for (const log of logs) {
      summary.total_api_calls++;
      summary.total_cost_usd += log.cost_usd || 0;

      // By provider
      if (log.provider === 'openai') {
        summary.openai_cost_usd += log.cost_usd || 0;
      } else if (log.provider === 'anthropic') {
        summary.anthropic_cost_usd += log.cost_usd || 0;
      } else if (log.provider === 'aws') {
        summary.aws_cost_usd += log.cost_usd || 0;
      }

      // By service
      if (log.service === 'chat') {
        summary.chat_cost_usd += log.cost_usd || 0;
        summary.chat_calls++;
      } else if (log.service === 'embeddings') {
        summary.embedding_cost_usd += log.cost_usd || 0;
        summary.embedding_calls++;
      } else if (log.service === 'transcription') {
        summary.transcription_cost_usd += log.cost_usd || 0;
        if (log.cost_usd) {
          summary.transcription_minutes += log.cost_usd / OPENAI_PRICING['whisper-1'].usage;
        }
      } else if (log.service === 'storage') {
        summary.storage_cost_usd += log.cost_usd || 0;
        if (log.data_size_bytes) {
          summary.storage_gb += log.data_size_bytes / (1024 ** 3);
        }
      }

      // Token usage
      summary.total_input_tokens += log.input_tokens || 0;
      summary.total_output_tokens += log.output_tokens || 0;

      // Response time
      if (log.duration_ms) {
        totalResponseTime += log.duration_ms;
        responseTimeCount++;
      }

      // Error count
      if (log.status_code && log.status_code >= 400) {
        summary.error_count++;
      }
    }

    // Calculate average response time
    if (responseTimeCount > 0) {
      summary.avg_response_time_ms = Math.round(totalResponseTime / responseTimeCount);
    }

    return summary;
  }

  private getEmptySummary(start: Date, end: Date): UsageSummary {
    return {
      period_start: start.toISOString(),
      period_end: end.toISOString(),
      period_type: 'month',
      total_api_calls: 0,
      total_cost_usd: 0,
      openai_cost_usd: 0,
      anthropic_cost_usd: 0,
      aws_cost_usd: 0,
      chat_cost_usd: 0,
      embedding_cost_usd: 0,
      transcription_cost_usd: 0,
      storage_cost_usd: 0,
      chat_calls: 0,
      embedding_calls: 0,
      transcription_minutes: 0,
      storage_gb: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      avg_response_time_ms: 0,
      error_count: 0,
    };
  }

  private getEmptyUsageStats(): UsageStats {
    return {
      total_cost: 0,
      daily_spent: 0,
      monthly_spent: 0,
      daily_limit: PLAN_LIMITS.free.daily,
      monthly_limit: PLAN_LIMITS.free.monthly,
      total_api_calls: 0,
      avg_response_time: 0,
      error_rate: 0,
      cost_by_provider: {},
      cost_by_service: {},
      top_endpoints: [],
    };
  }

  private fillMissingDays(data: DailyUsagePoint[], days: number): DailyUsagePoint[] {
    const filled: DailyUsagePoint[] = [];
    const dataMap = new Map(data.map(d => [d.date, d]));

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      filled.push(dataMap.get(dateStr) || {
        date: dateStr,
        cost: 0,
        calls: 0,
        errors: 0,
      });
    }

    return filled;
  }
}

// Export singleton instance
export const costTracker = CostTracker.getInstance();