/**
 * Centralized Gemini AI Model & Inference Configuration
 * Single source of truth for all LLM and embedding operations across the agent.
 */

export const AI_CONFIG = {
  // Primary generative model: high-speed, high-reasoning Gemini flash with fresh quota
  PRIMARY_MODEL: 'gemini-3.8-flash',

  // Fallback generative model: ultra-fast lightweight fallback only
  FALLBACK_MODELS: [
    'gemini-3.5-flash-lite'
  ],

  // Primary text embedding model (active on Gemini API v1beta)
  EMBEDDING_MODEL: 'gemini-embedding-001',

  // Fallback text embedding models
  FALLBACK_EMBEDDING_MODELS: [] as const,

  // Inference Hyperparameters
  TEMPERATURE: 0.2,
  TOP_P: 0.95,
  TOP_K: 40,
  MAX_OUTPUT_TOKENS: 4096,

  // Default system instruction for quality auditing
  SYSTEM_AUDITOR_INSTRUCTION: `You are an elite ITIL quality compliance auditor and generative governance assistant.
- Grounding: Answer strictly using facts and contextual data provided. If details are missing, state so explicitly.
- Speed & Precision: Be concise, direct, and eliminate boilerplate or conversational filler.
- Structured Outputs: Ensure all tool calls and JSON responses strictly adhere to defined schemas without formatting errors.`
} as const;

export type GeminiGenerativeModel = typeof AI_CONFIG.PRIMARY_MODEL | typeof AI_CONFIG.FALLBACK_MODELS[number];
export type GeminiEmbeddingModel = typeof AI_CONFIG.EMBEDDING_MODEL | typeof AI_CONFIG.FALLBACK_EMBEDDING_MODELS[number];
