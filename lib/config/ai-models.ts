/**
 * AI Model Configuration
 *
 * Centralized configuration for AI model selection across the application.
 * Uses environment variables for easy deployment-specific customization.
 *
 * Usage:
 * ```typescript
 * import { getClaudeModel, CLAUDE_MODEL } from '@/lib/config/ai-models';
 *
 * const response = await anthropic.messages.create({
 *   model: getClaudeModel(),
 *   // ... other params
 * });
 * ```
 */

// ============================================================================
// AVAILABLE CLAUDE MODELS
// ============================================================================

export const CLAUDE_MODELS = {
  // Claude 3.5 Models (Latest)
  SONNET_3_5: 'claude-3-5-sonnet-20241022',
  HAIKU_3_5: 'claude-3-5-haiku-20241022',

  // Claude 3 Models
  OPUS_3: 'claude-3-opus-20240229',
  SONNET_3: 'claude-3-sonnet-20240229',
  HAIKU_3: 'claude-3-haiku-20240307',
} as const;

export type ClaudeModel = typeof CLAUDE_MODELS[keyof typeof CLAUDE_MODELS];

// ============================================================================
// MODEL CHARACTERISTICS
// ============================================================================

export const MODEL_INFO = {
  [CLAUDE_MODELS.SONNET_3_5]: {
    name: 'Claude 3.5 Sonnet',
    description: 'Best balance of intelligence, speed, and cost',
    inputCost: 0.003,  // per 1K tokens
    outputCost: 0.015,  // per 1K tokens
    contextWindow: 200000,
    useCase: 'General purpose, complex reasoning',
  },
  [CLAUDE_MODELS.HAIKU_3_5]: {
    name: 'Claude 3.5 Haiku',
    description: 'Fastest and most cost-effective for most tasks',
    inputCost: 0.00025,  // per 1K tokens
    outputCost: 0.00125,  // per 1K tokens
    contextWindow: 200000,
    useCase: 'High-volume tasks, quick responses',
  },
  [CLAUDE_MODELS.OPUS_3]: {
    name: 'Claude 3 Opus',
    description: 'Most intelligent, best for complex tasks',
    inputCost: 0.015,  // per 1K tokens
    outputCost: 0.075,  // per 1K tokens
    contextWindow: 200000,
    useCase: 'Complex analysis, deep reasoning',
  },
  [CLAUDE_MODELS.SONNET_3]: {
    name: 'Claude 3 Sonnet',
    description: 'Previous generation balanced model',
    inputCost: 0.003,  // per 1K tokens
    outputCost: 0.015,  // per 1K tokens
    contextWindow: 200000,
    useCase: 'Fallback option',
  },
  [CLAUDE_MODELS.HAIKU_3]: {
    name: 'Claude 3 Haiku',
    description: 'Previous generation fast model',
    inputCost: 0.00025,  // per 1K tokens
    outputCost: 0.00125,  // per 1K tokens
    contextWindow: 200000,
    useCase: 'Legacy support',
  },
} as const;

// ============================================================================
// DEFAULT MODEL CONFIGURATION
// ============================================================================

/**
 * Default Claude model for the application
 * Can be overridden via ANTHROPIC_MODEL environment variable
 */
const DEFAULT_MODEL = CLAUDE_MODELS.HAIKU_3_5;

/**
 * Get the configured Claude model from environment or use default
 */
export function getClaudeModel(): ClaudeModel {
  const envModel = process.env.ANTHROPIC_MODEL;

  if (envModel) {
    // Validate that the environment model is a known model
    const isValidModel = Object.values(CLAUDE_MODELS).includes(envModel as ClaudeModel);

    if (!isValidModel) {
      console.warn(
        `[AI Config] Invalid ANTHROPIC_MODEL: "${envModel}". Falling back to default: ${DEFAULT_MODEL}`
      );
      return DEFAULT_MODEL;
    }

    return envModel as ClaudeModel;
  }

  return DEFAULT_MODEL;
}

/**
 * Get model information for display and logging
 */
export function getModelInfo(model?: ClaudeModel) {
  const targetModel = model || getClaudeModel();
  return MODEL_INFO[targetModel];
}

/**
 * Calculate estimated cost for a model call
 */
export function estimateModelCost(
  model: ClaudeModel,
  inputTokens: number,
  outputTokens: number
): number {
  const info = MODEL_INFO[model];
  const inputCost = (inputTokens / 1000) * info.inputCost;
  const outputCost = (outputTokens / 1000) * info.outputCost;
  return inputCost + outputCost;
}

/**
 * Compare cost between two models
 */
export function compareModelCosts(
  inputTokens: number,
  outputTokens: number
): Record<string, { cost: number; savings?: number; savingsPercent?: number }> {
  const results: any = {};
  const baseModel = CLAUDE_MODELS.HAIKU_3_5;
  const baseCost = estimateModelCost(baseModel, inputTokens, outputTokens);

  Object.entries(CLAUDE_MODELS).forEach(([key, model]) => {
    const cost = estimateModelCost(model, inputTokens, outputTokens);
    const savings = cost - baseCost;
    const savingsPercent = baseCost > 0 ? (savings / baseCost) * 100 : 0;

    results[model] = {
      cost,
      ...(model !== baseModel && { savings, savingsPercent }),
    };
  });

  return results;
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Main model constant - use this in your code
 * Automatically uses environment variable or default
 */
export const CLAUDE_MODEL = getClaudeModel();

/**
 * Log current model configuration (useful for debugging)
 */
if (process.env.NODE_ENV === 'development') {
  const modelInfo = getModelInfo();
  console.log(`[AI Config] Using Claude model: ${CLAUDE_MODEL}`);
  console.log(`[AI Config] Model info:`, modelInfo);
}
