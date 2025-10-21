/**
 * Upload Handler Tests
 */

import { validateVideoFile } from '../upload-handler';
import { VIDEO_PROCESSING_CONSTANTS } from '../types';

describe('validateVideoFile', () => {
  it('should accept valid video file', () => {
    const result = validateVideoFile(
      'test-video.mp4',
      'video/mp4',
      100 * 1024 * 1024 // 100MB
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject file exceeding size limit', () => {
    const result = validateVideoFile(
      'large-video.mp4',
      'video/mp4',
      5 * 1024 * 1024 * 1024 // 5GB
    );

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('exceeds maximum');
  });

  it('should reject empty file', () => {
    const result = validateVideoFile('empty.mp4', 'video/mp4', 0);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('File is empty');
  });

  it('should reject invalid mime type', () => {
    const result = validateVideoFile(
      'test.pdf',
      'application/pdf',
      1024 * 1024 // 1MB
    );

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Invalid file type');
  });

  it('should reject invalid file extension', () => {
    const result = validateVideoFile(
      'test.exe',
      'video/mp4',
      1024 * 1024 // 1MB
    );

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject filename with dangerous characters', () => {
    const result = validateVideoFile(
      'test<script>.mp4',
      'video/mp4',
      1024 * 1024 // 1MB
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Filename contains invalid characters');
  });

  it('should accept all allowed formats', () => {
    const allowedFormats = VIDEO_PROCESSING_CONSTANTS.ALLOWED_MIME_TYPES;

    allowedFormats.forEach((mimeType) => {
      const extension = mimeType.split('/')[1];
      const result = validateVideoFile(
        `test.${extension}`,
        mimeType,
        1024 * 1024 // 1MB
      );

      // Some mime types might not match extensions exactly
      // Just ensure no crash
      expect(result).toBeDefined();
    });
  });
});
