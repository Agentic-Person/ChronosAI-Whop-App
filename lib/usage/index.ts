/**
 * Usage Tracking Module
 *
 * Central export for all usage tracking functionality
 */

// Export cost tracker singleton and class
export { CostTracker, costTracker } from './cost-tracker';

// Export pricing configuration and utilities
export {
  OPENAI_PRICING,
  ANTHROPIC_PRICING,
  AWS_PRICING,
  SUPABASE_PRICING,
  PLAN_LIMITS,
  calculateOpenAICost,
  calculateAnthropicCost,
  calculateS3Cost,
  calculateTranscriptionCost,
  calculateEmbeddingCost,
  estimateTokens,
  formatCost,
  getCostPerUnit,
  projectMonthlyCost,
  isWithinBudget,
  getBudgetStatus,
  formatPercentage,
  calculateSavings,
  type OpenAIModel,
  type AnthropicModel,
  type PlanTier,
  type TokenUsage,
  type CostBreakdown,
} from './pricing-config';

// Export types
export {
  // Database types
  type APIUsageLog,
  type UsageSummary,
  type CostLimit,
  type CostAlert,

  // Service types
  type UsageLog,
  type CostCheckResult,
  type UsageStats,
  type DailyUsagePoint,
  type ServiceBreakdown,

  // API response types
  type UsageDashboardData,
  type UsageExportData,

  // Context types
  type TrackingContext,

  // Optimization types
  type CostOptimizationSuggestion,
  type UsageTrend,

  // Error types
  CostLimitExceededError,
  UsageTrackingError,

  // Constants
  USAGE_TRACKING_CONSTANTS,

  // Utility types
  type Provider,
  type Service,
  type PeriodType,
  type AlertType,
  type ProviderCosts,
  type ServiceCosts,
} from './types';

// Helper functions for common operations

/**
 * Quick check if user can make an API call
 */
export async function canMakeAPICall(
  userId?: string,
  creatorId?: string,
  estimatedCost: number = 0.001
): Promise<boolean> {
  const result = await costTracker.checkCostLimit(userId, creatorId, estimatedCost);
  return result.allowed;
}

/**
 * Get formatted cost summary for display
 */
export async function getFormattedCostSummary(
  userId?: string,
  creatorId?: string
): Promise<{
  daily: string;
  monthly: string;
  percentage: string;
  status: 'good' | 'warning' | 'critical' | 'exceeded';
}> {
  const stats = await costTracker.getUsageStats(userId, creatorId);
  const budgetStatus = getBudgetStatus(stats.daily_spent, stats.daily_limit);

  return {
    daily: formatCost(stats.daily_spent),
    monthly: formatCost(stats.monthly_spent),
    percentage: formatPercentage(budgetStatus.percentage),
    status: budgetStatus.status,
  };
}

/**
 * Track a generic API call
 */
export async function trackAPICall(
  endpoint: string,
  provider: Provider,
  service: Service,
  cost: number,
  context?: TrackingContext
): Promise<void> {
  await costTracker.trackUsage({
    user_id: context?.user_id,
    creator_id: context?.creator_id,
    student_id: context?.student_id,
    endpoint,
    method: 'POST',
    provider,
    service,
    cost_usd: cost,
    metadata: context,
    status_code: 200,
  });
}

/**
 * Get cost optimization recommendations
 */
export async function getCostOptimizations(
  userId?: string,
  creatorId?: string
): Promise<CostOptimizationSuggestion[]> {
  const stats = await costTracker.getUsageStats(userId, creatorId);
  const recommendations: CostOptimizationSuggestion[] = [];

  // Check if chat costs are too high
  if (stats.cost_by_service.chat > stats.total_cost * 0.5) {
    recommendations.push({
      id: 'use-haiku',
      title: 'Switch to Claude Haiku for simple queries',
      description: 'Claude Haiku is 90% cheaper than Sonnet for basic questions',
      potential_savings: stats.cost_by_service.chat * 0.8,
      implementation_effort: 'low',
      impact: 'high',
      category: 'model',
    });
  }

  // Check if embeddings can be cached
  if (stats.cost_by_service.embeddings > stats.total_cost * 0.2) {
    recommendations.push({
      id: 'cache-embeddings',
      title: 'Cache frequently used embeddings',
      description: 'Avoid regenerating embeddings for the same content',
      potential_savings: stats.cost_by_service.embeddings * 0.5,
      implementation_effort: 'medium',
      impact: 'medium',
      category: 'caching',
    });
  }

  // Check error rate
  if (stats.error_rate > 5) {
    recommendations.push({
      id: 'reduce-errors',
      title: 'Fix high error rate',
      description: `${stats.error_rate.toFixed(1)}% of API calls are failing and wasting money`,
      potential_savings: stats.total_cost * (stats.error_rate / 100),
      implementation_effort: 'medium',
      impact: 'high',
      category: 'architecture',
    });
  }

  // Batch processing suggestion
  if (stats.total_api_calls > 1000) {
    recommendations.push({
      id: 'batch-processing',
      title: 'Implement batch processing',
      description: 'Process multiple items in single API calls to reduce overhead',
      potential_savings: stats.total_cost * 0.1,
      implementation_effort: 'high',
      impact: 'medium',
      category: 'batching',
    });
  }

  return recommendations;
}

/**
 * Export usage data for a date range
 */
export async function exportUsageData(
  userId?: string,
  creatorId?: string,
  startDate?: Date,
  endDate?: Date,
  format: 'json' | 'csv' = 'json'
): Promise<string | UsageExportData> {
  const summary = await costTracker.getUsageSummary(userId, creatorId, startDate, endDate);
  const dailyUsage = await costTracker.getDailyUsage(userId, creatorId);
  const breakdown = await costTracker.getCostBreakdown(userId, creatorId, startDate, endDate);

  const exportData: UsageExportData = {
    period: {
      start: startDate?.toISOString() || new Date().toISOString(),
      end: endDate?.toISOString() || new Date().toISOString(),
    },
    summary: await costTracker.getUsageStats(userId, creatorId),
    details: [], // Would need to fetch from api_usage_logs
    breakdown_by_day: dailyUsage,
    breakdown_by_service: breakdown,
  };

  if (format === 'csv') {
    return convertToCSV(exportData);
  }

  return exportData;
}

/**
 * Convert export data to CSV format
 */
function convertToCSV(data: UsageExportData): string {
  const headers = ['Date', 'Cost (USD)', 'API Calls', 'Service'];
  const rows: string[][] = [];

  // Add daily breakdown
  data.breakdown_by_day.forEach(day => {
    rows.push([
      day.date,
      day.cost.toFixed(4),
      day.calls.toString(),
      'All Services',
    ]);
  });

  // Add service breakdown
  data.breakdown_by_service.forEach(service => {
    rows.push([
      'Total',
      service.cost.toFixed(4),
      service.calls.toString(),
      service.service,
    ]);
  });

  // Convert to CSV string
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  return csvContent;
}