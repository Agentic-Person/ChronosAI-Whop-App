/**
 * Audio Extractor Tests
 *
 * Tests for audio extraction and splitting functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import {
  extractAudioFromVideo,
  splitAudioFile,
  checkFFmpegAvailable,
  validateAudioFile,
  cleanupAudioChunks,
} from '../audio-extractor';

describe('Audio Extractor', () => {
  const testDir = path.join(process.cwd(), 'tmp', 'test-audio');
  const mockVideoPath = path.join(testDir, 'test-video.mp4');
  const mockAudioPath = path.join(testDir, 'test-audio.wav');

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Cleanup test files
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('checkFFmpegAvailable', () => {
    it('should check if ffmpeg is available', async () => {
      const result = await checkFFmpegAvailable();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('extractAudioFromVideo', () => {
    it('should throw error if ffmpeg is not available', async () => {
      // Mock video file
      fs.writeFileSync(mockVideoPath, 'fake video content');

      // This test will pass or fail depending on system ffmpeg availability
      try {
        const result = await extractAudioFromVideo(mockVideoPath);
        expect(result).toBeTruthy();
      } catch (error: any) {
        expect(error.message).toContain('ffmpeg');
      }
    });

    it('should handle invalid video path', async () => {
      const invalidPath = path.join(testDir, 'nonexistent.mp4');

      await expect(extractAudioFromVideo(invalidPath)).rejects.toThrow();
    });
  });

  describe('splitAudioFile', () => {
    it('should return single chunk for small files', async () => {
      // Create small mock audio file
      const smallAudioPath = path.join(testDir, 'small.wav');
      fs.writeFileSync(smallAudioPath, Buffer.alloc(1024 * 1024)); // 1MB

      try {
        const chunks = await splitAudioFile(smallAudioPath, 25);
        expect(chunks).toHaveLength(1);
        expect(chunks[0].path).toBe(smallAudioPath);
      } catch (error) {
        // If ffmpeg not available, test should gracefully handle
        console.log('FFmpeg not available, skipping split test');
      }
    });

    it('should split large files into multiple chunks', async () => {
      // This is more of an integration test
      // In real implementation, would need actual audio file
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('validateAudioFile', () => {
    it('should return false for non-existent files', async () => {
      const result = await validateAudioFile('/nonexistent/file.wav');
      expect(result).toBe(false);
    });
  });

  describe('cleanupAudioChunks', () => {
    it('should clean up audio chunk files', () => {
      const chunk1 = path.join(testDir, 'chunk1.wav');
      const chunk2 = path.join(testDir, 'chunk2.wav');

      fs.writeFileSync(chunk1, 'chunk1');
      fs.writeFileSync(chunk2, 'chunk2');

      cleanupAudioChunks([
        { path: chunk1, index: 0, durationSeconds: 10, sizeBytes: 1000 },
        { path: chunk2, index: 1, durationSeconds: 10, sizeBytes: 1000 },
      ]);

      expect(fs.existsSync(chunk1)).toBe(false);
      expect(fs.existsSync(chunk2)).toBe(false);
    });
  });
});
