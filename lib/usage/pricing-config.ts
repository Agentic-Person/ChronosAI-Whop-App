/**
 * API Pricing Configuration
 *
 * Centralized pricing for all external API services
 * Prices are in USD and should be updated when providers change pricing
 *
 * Last Updated: October 2024
 */

// ============================================================================
// OPENAI PRICING
// ============================================================================
export const OPENAI_PRICING = {
  // Chat Models
  'gpt-4-turbo': {
    input: 0.01 / 1000,      // $0.01 per 1K tokens
    output: 0.03 / 1000,     // $0.03 per 1K tokens
  },
  'gpt-4': {
    input: 0.03 / 1000,      // $0.03 per 1K tokens
    output: 0.06 / 1000,     // $0.06 per 1K tokens
  },
  'gpt-3.5-turbo': {
    input: 0.0005 / 1000,    // $0.0005 per 1K tokens
    output: 0.0015 / 1000,   // $0.0015 per 1K tokens
  },

  // Embedding Models
  'text-embedding-ada-002': {
    usage: 0.0001 / 1000,    // $0.0001 per 1K tokens
  },
  'text-embedding-3-small': {
    usage: 0.00002 / 1000,   // $0.00002 per 1K tokens
  },
  'text-embedding-3-large': {
    usage: 0.00013 / 1000,   // $0.00013 per 1K tokens
  },

  // Audio Models
  'whisper-1': {
    usage: 0.006 / 60,       // $0.006 per minute
  },
} as const;

// ============================================================================
// ANTHROPIC PRICING
// ============================================================================
export const ANTHROPIC_PRICING = {
  'claude-3-5-sonnet-20241022': {
    input: 0.003 / 1000,     // $3 per million tokens
    output: 0.015 / 1000,    // $15 per million tokens
  },
  'claude-3-opus-20240229': {
    input: 0.015 / 1000,     // $15 per million tokens
    output: 0.075 / 1000,    // $75 per million tokens
  },
  'claude-3-sonnet-20240229': {
    input: 0.003 / 1000,     // $3 per million tokens
    output: 0.015 / 1000,    // $15 per million tokens
  },
  'claude-3-haiku-20240307': {
    input: 0.00025 / 1000,   // $0.25 per million tokens
    output: 0.00125 / 1000,  // $1.25 per million tokens
  },
} as const;

// ============================================================================
// AWS PRICING
// ============================================================================
export const AWS_PRICING = {
  s3: {
    storage: {
      standard: 0.023 / (1024 ** 3),        // $0.023 per GB per month
      infrequent: 0.0125 / (1024 ** 3),     // $0.0125 per GB per month
      glacier: 0.004 / (1024 ** 3),         // $0.004 per GB per month
    },
    requests: {
      put: 0.005 / 1000,                    // $0.005 per 1,000 PUT requests
      get: 0.0004 / 1000,                   // $0.0004 per 1,000 GET requests
      list: 0.005 / 1000,                    // $0.005 per 1,000 LIST requests
    },
    transfer: {
      out: 0.09 / (1024 ** 3),              // $0.09 per GB (first 10TB/month)
      in: 0,                                 // Free inbound
    },
  },
  cloudfront: {
    transfer: {
      northAmerica: 0.085 / (1024 ** 3),    // $0.085 per GB
      europe: 0.085 / (1024 ** 3),          // $0.085 per GB
      asia: 0.140 / (1024 ** 3),            // $0.140 per GB
    },
    requests: {
      http: 0.0075 / 10000,                  // $0.0075 per 10,000 requests
      https: 0.01 / 10000,                   // $0.01 per 10,000 requests
    },
  },
} as const;

// ============================================================================
// SUPABASE PRICING (for reference, most operations within free tier)
// ============================================================================
export const SUPABASE_PRICING = {
  database: {
    storage: 0.125 / (1024 ** 3),           // $0.125 per GB per month
    transfer: 0.09 / (1024 ** 3),           // $0.09 per GB
  },
  vector: {
    // pgvector operations are CPU-based, hard to calculate exact cost
    // Estimate based on database compute time
    search: 0.00001,                        // $0.00001 per search (estimate)
  },
  storage: {
    storage: 0.021 / (1024 ** 3),           // $0.021 per GB per month
    transfer: 0.09 / (1024 ** 3),           // $0.09 per GB
  },
} as const;

// ============================================================================
// PLAN LIMITS
// ============================================================================
export const PLAN_LIMITS = {
  free: {
    daily: 0.50,
    monthly: 5.00,
    features: {
      maxVideos: 3,
      maxStudents: 10,
      maxChatMessages: 50,
      maxTranscriptionMinutes: 30,
    },
  },
  basic: {
    daily: 5.00,
    monthly: 50.00,
    features: {
      maxVideos: 50,
      maxStudents: 100,
      maxChatMessages: 1000,
      maxTranscriptionMinutes: 300,
    },
  },
  pro: {
    daily: 20.00,
    monthly: 200.00,
    features: {
      maxVideos: 500,
      maxStudents: 1000,
      maxChatMessages: 10000,
      maxTranscriptionMinutes: 3000,
    },
  },
  enterprise: {
    daily: 100.00,
    monthly: 1000.00,
    features: {
      maxVideos: -1, // Unlimited
      maxStudents: -1,
      maxChatMessages: -1,
      maxTranscriptionMinutes: -1,
    },
  },
} as const;

// ============================================================================
// HELPER TYPES
// ============================================================================
export type OpenAIModel = keyof typeof OPENAI_PRICING;
export type AnthropicModel = keyof typeof ANTHROPIC_PRICING;
export type PlanTier = keyof typeof PLAN_LIMITS;

export interface TokenUsage {
  input: number;
  output: number;
}

export interface CostBreakdown {
  provider: 'openai' | 'anthropic' | 'aws' | 'supabase';
  service: string;
  model?: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

// ============================================================================
// COST CALCULATION UTILITIES
// ============================================================================

/**
 * Calculate cost for OpenAI models
 */
export function calculateOpenAICost(
  model: OpenAIModel,
  usage: TokenUsage | number
): number {
  const pricing = OPENAI_PRICING[model];

  if ('input' in pricing && 'output' in pricing && typeof usage === 'object') {
    // Chat model with separate input/output pricing
    return (usage.input * pricing.input) + (usage.output * pricing.output);
  } else if ('usage' in pricing && typeof usage === 'number') {
    // Embedding or audio model with single pricing
    return usage * pricing.usage;
  }

  throw new Error(`Invalid usage type for model ${model}`);
}

/**
 * Calculate cost for Anthropic models
 */
export function calculateAnthropicCost(
  model: AnthropicModel,
  usage: TokenUsage
): number {
  const pricing = ANTHROPIC_PRICING[model];
  return (usage.input * pricing.input) + (usage.output * pricing.output);
}

/**
 * Calculate cost for AWS S3 storage
 */
export function calculateS3Cost(
  sizeBytes: number,
  storageClass: 'standard' | 'infrequent' | 'glacier' = 'standard',
  durationDays: number = 30
): number {
  const sizeGB = sizeBytes / (1024 ** 3);
  const monthlyRate = AWS_PRICING.s3.storage[storageClass];
  const dailyRate = monthlyRate / 30;
  return sizeGB * dailyRate * durationDays;
}

/**
 * Calculate cost for video transcription
 */
export function calculateTranscriptionCost(durationSeconds: number): number {
  const durationMinutes = durationSeconds / 60;
  return durationMinutes * OPENAI_PRICING['whisper-1'].usage;
}

/**
 * Calculate cost for embeddings
 */
export function calculateEmbeddingCost(
  tokenCount: number,
  model: 'text-embedding-ada-002' | 'text-embedding-3-small' | 'text-embedding-3-large' = 'text-embedding-ada-002'
): number {
  return tokenCount * OPENAI_PRICING[model].usage;
}

/**
 * Estimate tokens from text (rough approximation)
 * More accurate counting should use tiktoken library
 */
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  } else if (cost < 1) {
    return `$${cost.toFixed(3)}`;
  } else {
    return `$${cost.toFixed(2)}`;
  }
}

/**
 * Get cost per unit for display
 */
export function getCostPerUnit(
  provider: 'openai' | 'anthropic' | 'aws',
  service: string,
  model?: string
): { cost: number; unit: string } {
  if (provider === 'openai' && model) {
    const pricing = OPENAI_PRICING[model as OpenAIModel];
    if ('input' in pricing) {
      return { cost: pricing.input * 1000, unit: '1K input tokens' };
    } else if ('usage' in pricing) {
      if (model === 'whisper-1') {
        return { cost: pricing.usage * 60, unit: 'minute' };
      } else {
        return { cost: pricing.usage * 1000, unit: '1K tokens' };
      }
    }
  } else if (provider === 'anthropic' && model) {
    const pricing = ANTHROPIC_PRICING[model as AnthropicModel];
    return { cost: pricing.input * 1000, unit: '1K input tokens' };
  } else if (provider === 'aws' && service === 'storage') {
    return { cost: AWS_PRICING.s3.storage.standard * (1024 ** 3), unit: 'GB/month' };
  }

  return { cost: 0, unit: 'unknown' };
}

/**
 * Get projected monthly cost based on daily usage
 */
export function projectMonthlyCost(dailyCost: number): number {
  return dailyCost * 30;
}

/**
 * Check if within budget percentage
 */
export function isWithinBudget(
  spent: number,
  limit: number,
  thresholdPercent: number = 80
): boolean {
  return (spent / limit * 100) <= thresholdPercent;
}

/**
 * Get budget status with color coding
 */
export function getBudgetStatus(
  spent: number,
  limit: number
): {
  status: 'good' | 'warning' | 'critical' | 'exceeded';
  percentage: number;
  color: string;
} {
  const percentage = (spent / limit) * 100;

  if (percentage >= 100) {
    return { status: 'exceeded', percentage, color: 'red' };
  } else if (percentage >= 95) {
    return { status: 'critical', percentage, color: 'red' };
  } else if (percentage >= 80) {
    return { status: 'warning', percentage, color: 'yellow' };
  } else {
    return { status: 'good', percentage, color: 'green' };
  }
}

/**
 * Format percentage with appropriate precision
 */
export function formatPercentage(value: number): string {
  if (value < 1) {
    return `${value.toFixed(2)}%`;
  } else if (value < 10) {
    return `${value.toFixed(1)}%`;
  } else {
    return `${Math.round(value)}%`;
  }
}

/**
 * Calculate cost savings between models
 */
export function calculateSavings(
  currentModel: string,
  alternativeModel: string,
  usage: TokenUsage
): {
  currentCost: number;
  alternativeCost: number;
  savings: number;
  savingsPercent: number;
} {
  let currentCost = 0;
  let alternativeCost = 0;

  // Calculate current model cost
  if (currentModel in OPENAI_PRICING) {
    currentCost = calculateOpenAICost(currentModel as OpenAIModel, usage);
  } else if (currentModel in ANTHROPIC_PRICING) {
    currentCost = calculateAnthropicCost(currentModel as AnthropicModel, usage);
  }

  // Calculate alternative model cost
  if (alternativeModel in OPENAI_PRICING) {
    alternativeCost = calculateOpenAICost(alternativeModel as OpenAIModel, usage);
  } else if (alternativeModel in ANTHROPIC_PRICING) {
    alternativeCost = calculateAnthropicCost(alternativeModel as AnthropicModel, usage);
  }

  const savings = currentCost - alternativeCost;
  const savingsPercent = currentCost > 0 ? (savings / currentCost) * 100 : 0;

  return {
    currentCost,
    alternativeCost,
    savings,
    savingsPercent,
  };
}