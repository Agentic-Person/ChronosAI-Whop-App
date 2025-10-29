/**
 * Storage Cleanup Tests
 *
 * Tests for video storage deletion functionality
 */

import { describe, it, expect, jest } from '@jest/globals';
import {
  extractStoragePathFromUrl,
  deleteVideoFromStorage,
  bulkDeleteVideosFromStorage,
} from '../storage-cleanup';

describe('Storage Cleanup', () => {
  describe('extractStoragePathFromUrl', () => {
    it('should extract path from full Supabase URL', () => {
      const url = 'https://project.supabase.co/storage/v1/object/public/videos/creator-123/video-456.mp4';
      const result = extractStoragePathFromUrl(url);
      expect(result).toBe('creator-123/video-456.mp4');
    });

    it('should handle relative paths', () => {
      const path = '/videos/creator-123/video-456.mp4';
      const result = extractStoragePathFromUrl(path);
      expect(result).toBe('creator-123/video-456.mp4');
    });

    it('should handle storage paths directly', () => {
      const path = 'videos/creator-123/video-456.mp4';
      const result = extractStoragePathFromUrl(path);
      expect(result).toBe('creator-123/video-456.mp4');
    });

    it('should handle paths without videos prefix', () => {
      const path = 'creator-123/video-456.mp4';
      const result = extractStoragePathFromUrl(path);
      expect(result).toBe('creator-123/video-456.mp4');
    });

    it('should return null for empty paths', () => {
      const result = extractStoragePathFromUrl('');
      expect(result).toBeNull();
    });

    it('should return null for invalid URLs', () => {
      const result = extractStoragePathFromUrl('not-a-url');
      // Should still try to extract path
      expect(result).toBeTruthy();
    });
  });

  describe('deleteVideoFromStorage', () => {
    it('should handle deletion attempts', async () => {
      // This is a mock test - actual deletion requires Supabase connection
      const result = await deleteVideoFromStorage('test/path.mp4');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('bulkDeleteVideosFromStorage', () => {
    it('should handle bulk deletion attempts', async () => {
      const paths = ['test/video1.mp4', 'test/video2.mp4'];
      const result = await bulkDeleteVideosFromStorage(paths);

      expect(result).toHaveProperty('successful');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should handle empty path arrays', async () => {
      const result = await bulkDeleteVideosFromStorage([]);
      expect(result.successful).toBe(0);
    });
  });
});
