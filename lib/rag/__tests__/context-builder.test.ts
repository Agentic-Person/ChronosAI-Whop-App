/**
 * Context Builder Tests
 */

import { ContextBuilder } from '../context-builder';
import { SearchResult } from '../vector-search';
import { ChatMessage } from '@/types/database';

describe('ContextBuilder', () => {
  let contextBuilder: ContextBuilder;

  beforeEach(() => {
    contextBuilder = new ContextBuilder();
  });

  describe('build', () => {
    it('should build context from chunks and history', () => {
      const chunks: SearchResult[] = [
        {
          chunk: {
            id: '1',
            video_id: 'v1',
            chunk_text: 'React hooks allow you to use state in functional components.',
            chunk_index: 0,
            start_timestamp: 120,
            end_timestamp: 180,
            created_at: new Date().toISOString(),
          },
          similarity: 0.92,
          video_id: 'v1',
          video_title: 'React Hooks Introduction',
          video_url: 'https://example.com/video1',
          start_timestamp: 120,
          end_timestamp: 180,
        },
      ];

      const history: ChatMessage[] = [
        {
          id: 'm1',
          session_id: 's1',
          role: 'user',
          content: 'What are React hooks?',
          created_at: new Date().toISOString(),
        },
      ];

      const context = contextBuilder.build(chunks, history);

      expect(context).toContain('React hooks allow you to use state');
      expect(context).toContain('React Hooks Introduction');
      expect(context).toContain('What are React hooks?');
    });

    it('should handle empty chunks', () => {
      const context = contextBuilder.build([], []);

      expect(context).toContain('No relevant content found');
    });

    it('should limit chunks to maxChunks', () => {
      const chunks: SearchResult[] = Array.from({ length: 10 }, (_, i) => ({
        chunk: {
          id: `${i}`,
          video_id: 'v1',
          chunk_text: `Content ${i}`,
          chunk_index: i,
          created_at: new Date().toISOString(),
        },
        similarity: 0.8,
        video_id: 'v1',
        video_title: 'Test Video',
        video_url: 'https://example.com/video1',
      }));

      const context = contextBuilder.build(chunks, [], { maxChunks: 3 });

      expect(context).toContain('Content 0');
      expect(context).toContain('Content 1');
      expect(context).toContain('Content 2');
      expect(context).not.toContain('Content 3');
    });
  });

  describe('extractVideoReferences', () => {
    it('should extract unique video references', () => {
      const chunks: SearchResult[] = [
        {
          chunk: { id: '1', video_id: 'v1', chunk_text: 'Content 1', chunk_index: 0, created_at: '' },
          similarity: 0.9,
          video_id: 'v1',
          video_title: 'Video 1',
          video_url: '',
          start_timestamp: 100,
        },
        {
          chunk: { id: '2', video_id: 'v1', chunk_text: 'Content 2', chunk_index: 1, created_at: '' },
          similarity: 0.8,
          video_id: 'v1',
          video_title: 'Video 1',
          video_url: '',
          start_timestamp: 200,
        },
        {
          chunk: { id: '3', video_id: 'v2', chunk_text: 'Content 3', chunk_index: 0, created_at: '' },
          similarity: 0.85,
          video_id: 'v2',
          video_title: 'Video 2',
          video_url: '',
          start_timestamp: 150,
        },
      ];

      const references = contextBuilder.extractVideoReferences(chunks);

      expect(references).toHaveLength(2);
      expect(references[0].video_id).toBe('v1');
      expect(references[0].relevance_score).toBe(0.9); // Higher similarity kept
      expect(references[1].video_id).toBe('v2');
    });
  });

  describe('buildSystemPrompt', () => {
    it('should build general system prompt', () => {
      const prompt = contextBuilder.buildSystemPrompt('general');

      expect(prompt).toContain('AI learning assistant');
      expect(prompt).toContain('General learning assistance');
    });

    it('should build project-specific prompt', () => {
      const prompt = contextBuilder.buildSystemPrompt('project-specific');

      expect(prompt).toContain('project');
      expect(prompt).toContain('implementation');
    });

    it('should build quiz-help prompt', () => {
      const prompt = contextBuilder.buildSystemPrompt('quiz-help');

      expect(prompt).toContain('quiz');
      expect(prompt).toContain('concepts');
    });
  });

  describe('estimateTokenCount', () => {
    it('should estimate token count', () => {
      const text = 'This is a test message with some words.';
      const tokens = contextBuilder.estimateTokenCount(text);

      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(text.length); // Should be less than character count
    });
  });

  describe('isWithinLimits', () => {
    it('should return true for short context', () => {
      const shortContext = 'Short message';
      expect(contextBuilder.isWithinLimits(shortContext)).toBe(true);
    });

    it('should return false for very long context', () => {
      const longContext = 'x'.repeat(50000);
      expect(contextBuilder.isWithinLimits(longContext)).toBe(false);
    });
  });
});
