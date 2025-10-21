/**
 * Embedding Generator Tests
 */

import { estimateCost } from '../embedding-generator';
import { TextChunk, VIDEO_PROCESSING_CONSTANTS } from '../types';

describe('estimateCost', () => {
  it('should estimate cost for single chunk', () => {
    const chunks: TextChunk[] = [
      {
        text: 'word '.repeat(750), // 750 words
        index: 0,
        startTimestamp: 0,
        endTimestamp: 10,
        wordCount: 750,
      },
    ];

    const cost = estimateCost(chunks);

    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(1); // Should be very cheap
  });

  it('should estimate cost for multiple chunks', () => {
    const chunks: TextChunk[] = Array.from({ length: 10 }, (_, i) => ({
      text: 'word '.repeat(700),
      index: i,
      startTimestamp: i * 10,
      endTimestamp: (i + 1) * 10,
      wordCount: 700,
    }));

    const cost = estimateCost(chunks);

    expect(cost).toBeGreaterThan(0);
    // Cost should scale with number of chunks
    expect(cost).toBeGreaterThan(estimateCost([chunks[0]]));
  });

  it('should return zero for empty chunks', () => {
    const cost = estimateCost([]);
    expect(cost).toBe(0);
  });

  it('should match expected cost calculation', () => {
    const chunks: TextChunk[] = [
      {
        text: 'test',
        index: 0,
        startTimestamp: 0,
        endTimestamp: 10,
        wordCount: 1,
      },
    ];

    const cost = estimateCost(chunks);

    // Rough estimate: 1 word ≈ 1.3 tokens ≈ 5.2 chars
    // Cost = (tokens / 1000) * COST_PER_1K_TOKENS
    const expectedMinCost = 0;
    const expectedMaxCost = VIDEO_PROCESSING_CONSTANTS.COST_PER_1K_TOKENS_EMBEDDING;

    expect(cost).toBeGreaterThanOrEqual(expectedMinCost);
    expect(cost).toBeLessThanOrEqual(expectedMaxCost);
  });
});
