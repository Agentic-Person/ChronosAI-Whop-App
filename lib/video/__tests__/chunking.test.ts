/**
 * Chunking Algorithm Tests
 */

import { IntelligentChunker, chunkTranscript, validateChunk, validateChunks } from '../chunking';
import { Transcript, ChunkOptions } from '../types';

describe('IntelligentChunker', () => {
  const mockTranscript: Transcript = {
    text: 'This is a test transcript. It contains multiple sentences. Each sentence has several words. We use this to test chunking.',
    segments: [
      {
        id: 0,
        start: 0,
        end: 5,
        text: 'This is a test transcript.',
      },
      {
        id: 1,
        start: 5,
        end: 10,
        text: 'It contains multiple sentences.',
      },
      {
        id: 2,
        start: 10,
        end: 15,
        text: 'Each sentence has several words.',
      },
      {
        id: 3,
        start: 15,
        end: 20,
        text: 'We use this to test chunking.',
      },
    ],
    language: 'en',
    duration: 20,
  };

  describe('constructor', () => {
    it('should create chunker with default options', () => {
      const chunker = new IntelligentChunker();
      expect(chunker).toBeDefined();
    });

    it('should create chunker with custom options', () => {
      const options: ChunkOptions = {
        targetWords: 500,
        minWords: 300,
        maxWords: 800,
        overlapWords: 50,
      };
      const chunker = new IntelligentChunker(options);
      expect(chunker).toBeDefined();
    });

    it('should throw error for invalid options', () => {
      const invalidOptions: ChunkOptions = {
        minWords: 1000,
        targetWords: 500,
        maxWords: 800,
      };
      expect(() => new IntelligentChunker(invalidOptions)).toThrow();
    });
  });

  describe('chunk', () => {
    it('should chunk small transcript into single chunk', () => {
      const chunker = new IntelligentChunker({
        targetWords: 100,
        minWords: 10,
        maxWords: 200,
        overlapWords: 5, // Must be less than minWords
      });

      const chunks = chunker.chunk(mockTranscript);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].index).toBe(0);
      expect(chunks[0].text).toBeTruthy();
      expect(chunks[0].wordCount).toBeGreaterThan(0);
    });

    it('should preserve timestamps', () => {
      const chunker = new IntelligentChunker();
      const chunks = chunker.chunk(mockTranscript);

      chunks.forEach((chunk) => {
        expect(chunk.startTimestamp).toBeGreaterThanOrEqual(0);
        expect(chunk.endTimestamp).toBeGreaterThan(chunk.startTimestamp);
        expect(chunk.endTimestamp).toBeLessThanOrEqual(mockTranscript.duration);
      });
    });

    it('should create chunks with sequential indices', () => {
      const chunker = new IntelligentChunker();
      const chunks = chunker.chunk(mockTranscript);

      chunks.forEach((chunk, index) => {
        expect(chunk.index).toBe(index);
      });
    });
  });

  describe('validateChunk', () => {
    it('should validate correct chunk', () => {
      const validChunk = {
        text: 'This is a valid chunk with enough words.',
        index: 0,
        startTimestamp: 0,
        endTimestamp: 10,
        wordCount: 8,
      };

      // Adjust word count to be within valid range (500-1000)
      validChunk.wordCount = 600;
      validChunk.text = 'word '.repeat(600).trim();

      expect(validateChunk(validChunk)).toBe(true);
    });

    it('should reject chunk with too few words', () => {
      const invalidChunk = {
        text: 'Too short',
        index: 0,
        startTimestamp: 0,
        endTimestamp: 10,
        wordCount: 2,
      };

      expect(validateChunk(invalidChunk)).toBe(false);
    });

    it('should reject chunk with too many words', () => {
      const invalidChunk = {
        text: 'word '.repeat(2000),
        index: 0,
        startTimestamp: 0,
        endTimestamp: 10,
        wordCount: 2000,
      };

      expect(validateChunk(invalidChunk)).toBe(false);
    });

    it('should reject chunk with invalid timestamps', () => {
      const invalidChunk = {
        text: 'word '.repeat(600),
        index: 0,
        startTimestamp: 10,
        endTimestamp: 5, // End before start
        wordCount: 600,
      };

      expect(validateChunk(invalidChunk)).toBe(false);
    });
  });

  describe('validateChunks', () => {
    it('should validate array of correct chunks', () => {
      const chunks = [
        {
          text: 'word '.repeat(600),
          index: 0,
          startTimestamp: 0,
          endTimestamp: 10,
          wordCount: 600,
        },
        {
          text: 'word '.repeat(650),
          index: 1,
          startTimestamp: 8,
          endTimestamp: 20,
          wordCount: 650,
        },
      ];

      const result = validateChunks(chunks);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect timestamp ordering issues', () => {
      const chunks = [
        {
          text: 'word '.repeat(600),
          index: 0,
          startTimestamp: 10,
          endTimestamp: 20,
          wordCount: 600,
        },
        {
          text: 'word '.repeat(650),
          index: 1,
          startTimestamp: 5, // Before previous chunk
          endTimestamp: 15,
          wordCount: 650,
        },
      ];

      const result = validateChunks(chunks);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('chunkTranscript', () => {
  it('should chunk transcript with default options', () => {
    const mockTranscript: Transcript = {
      text: 'word '.repeat(2000),
      segments: [
        {
          id: 0,
          start: 0,
          end: 100,
          text: 'word '.repeat(2000),
        },
      ],
      language: 'en',
      duration: 100,
    };

    const chunks = chunkTranscript(mockTranscript);

    expect(chunks.length).toBeGreaterThan(0);
    chunks.forEach((chunk) => {
      expect(chunk.wordCount).toBeGreaterThanOrEqual(500);
      expect(chunk.wordCount).toBeLessThanOrEqual(1000);
    });
  });

  it('should chunk transcript with custom options', () => {
    const mockTranscript: Transcript = {
      text: 'word '.repeat(1000),
      segments: [
        {
          id: 0,
          start: 0,
          end: 50,
          text: 'word '.repeat(1000),
        },
      ],
      language: 'en',
      duration: 50,
    };

    const options: ChunkOptions = {
      targetWords: 300,
      minWords: 200,
      maxWords: 400,
      overlapWords: 50,
    };

    const chunks = chunkTranscript(mockTranscript, options);

    expect(chunks.length).toBeGreaterThan(0);
    chunks.forEach((chunk) => {
      expect(chunk.wordCount).toBeGreaterThanOrEqual(200);
      expect(chunk.wordCount).toBeLessThanOrEqual(400);
    });
  });
});
