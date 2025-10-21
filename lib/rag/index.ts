/**
 * RAG Module Exports
 * Central export point for all RAG functionality
 */

// Vector Search
export {
  generateEmbedding,
  vectorSearch,
  searchRelevantChunks,
  getVideoChunks,
  validateEmbedding,
  cosineSimilarity,
  type SearchResult,
  type VectorSearchOptions,
} from './vector-search';

// Context Builder
export {
  ContextBuilder,
  contextBuilder,
  type ContextOptions,
} from './context-builder';

// Chat Service
export {
  ChatService,
  chatService,
} from './chat-service';

// RAG Engine
export {
  queryRAG,
  queryRAGStream,
  chatWithSession,
  suggestFollowUpQuestions,
  type RAGContext,
  type RAGResponse,
  type RAGOptions,
} from './rag-engine';
