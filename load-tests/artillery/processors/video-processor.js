/**
 * Video Upload Artillery Processor
 * Handles video upload flow and processing status tracking
 */

const { faker } = require('@faker-js/faker');
const fs = require('fs');
const path = require('path');

/**
 * Generate realistic video metadata
 */
function generateVideoMetadata(context, events, done) {
  const videoTypes = ['tutorial', 'lecture', 'demo', 'workshop', 'case-study'];
  const topics = ['JavaScript', 'React', 'Node.js', 'Database', 'API Design', 'Testing', 'DevOps'];

  context.vars.videoMetadata = {
    title: `${faker.helpers.arrayElement(topics)} - ${faker.helpers.arrayElement(videoTypes)} ${faker.number.int({ min: 1, max: 100 })}`,
    description: faker.lorem.paragraph(),
    duration: faker.number.int({ min: 300, max: 3600 }), // 5-60 minutes
    category: faker.helpers.arrayElement(topics),
    tags: faker.helpers.arrayElements(['beginner', 'intermediate', 'advanced', 'tutorial', 'practical'], { min: 2, max: 4 }),
  };

  return done();
}

/**
 * Generate video file size within plan limits
 */
function generateVideoSize(context, events, done) {
  // Different file sizes based on video duration
  const duration = context.vars.videoMetadata?.duration || 600;

  // Assume ~1MB per 30 seconds for compressed video
  const baseSizeBytes = Math.floor(duration / 30) * 1024 * 1024;

  // Add variance (±20%)
  const variance = 0.2;
  const minSize = baseSizeBytes * (1 - variance);
  const maxSize = baseSizeBytes * (1 + variance);

  context.vars.fileSize = Math.floor(Math.random() * (maxSize - minSize) + minSize);

  return done();
}

/**
 * Create a mock video file buffer for upload
 */
function createVideoBuffer(requestParams, context, ee, next) {
  try {
    // For load testing, create a small buffer instead of full video
    // In production tests, you'd use actual video files
    const testFileSize = 1024 * 100; // 100KB for testing
    const buffer = Buffer.alloc(testFileSize);

    // Fill with semi-realistic video header data
    // MP4 file signature
    buffer.write('ftypisom', 4, 'ascii');

    // Fill rest with random data
    for (let i = 20; i < testFileSize; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }

    context.vars.videoBuffer = buffer;

    ee.emit('customStat', {
      stat: 'video_buffer_size_kb',
      value: Math.floor(testFileSize / 1024)
    });

    return next();
  } catch (error) {
    ee.emit('customStat', { stat: 'video_buffer_creation_error', value: 1 });
    return next(error);
  }
}

/**
 * Track upload progress and success rate
 */
function trackUploadProgress(requestParams, response, context, ee, next) {
  try {
    const body = JSON.parse(response.body);

    // Track successful upload URL generation
    if (body.uploadUrl && body.videoId) {
      ee.emit('customStat', { stat: 'upload_url_generated', value: 1 });

      // Track storage usage
      if (body.storage) {
        const usagePercent = (body.storage.used_mb / body.storage.limit_mb) * 100;
        ee.emit('customStat', {
          stat: 'storage_usage_percent',
          value: Math.round(usagePercent)
        });

        // Alert if storage is running low
        if (usagePercent > 90) {
          ee.emit('customStat', { stat: 'storage_nearly_full', value: 1 });
        }
      }
    }

    // Track storage limit errors
    if (response.statusCode === 403 && body.error === 'STORAGE_LIMIT_EXCEEDED') {
      ee.emit('customStat', { stat: 'storage_limit_exceeded', value: 1 });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Monitor video processing status
 */
function trackProcessingStatus(requestParams, response, context, ee, next) {
  try {
    const body = JSON.parse(response.body);

    if (body.status || body.video?.processingStatus) {
      const status = body.status || body.video.processingStatus;

      // Track status distribution
      ee.emit('customStat', {
        stat: `processing_status_${status}`,
        value: 1
      });

      // Track processing progress
      if (body.progress !== undefined) {
        ee.emit('customStat', {
          stat: 'processing_progress_percent',
          value: body.progress
        });
      }

      // Track processing duration
      if (status === 'completed' && context.vars.uploadStartTime) {
        const duration = Date.now() - context.vars.uploadStartTime;
        ee.emit('customStat', {
          stat: 'video_processing_duration_ms',
          value: duration
        });
      }

      // Track failures
      if (status === 'failed') {
        ee.emit('customStat', { stat: 'video_processing_failed', value: 1 });

        if (body.error) {
          ee.emit('customStat', {
            stat: `processing_error_${body.error.code || 'unknown'}`,
            value: 1
          });
        }
      }
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Validate processing webhook delivery
 */
function validateProcessingWebhook(requestParams, response, context, ee, next) {
  try {
    // Track webhook delivery
    if (response.statusCode === 200) {
      ee.emit('customStat', { stat: 'processing_webhook_delivered', value: 1 });
    } else {
      ee.emit('customStat', { stat: 'processing_webhook_failed', value: 1 });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Check if processing is still ongoing (for polling loops)
 */
function isProcessingComplete(context) {
  const status = context.vars.processingStatus;
  return status === 'completed' || status === 'failed' || status === 'error';
}

/**
 * Calculate appropriate polling interval based on video size
 */
function calculatePollInterval(context, events, done) {
  // Larger files take longer to process, so poll less frequently
  const fileSize = context.vars.fileSize || 10000000; // Default 10MB
  const fileSizeMB = fileSize / (1024 * 1024);

  // Base interval: 5s for small files, up to 30s for large files
  const baseInterval = 5;
  const maxInterval = 30;
  const scaleFactor = fileSizeMB / 100; // Scale based on 100MB reference

  const interval = Math.min(
    maxInterval,
    Math.max(baseInterval, baseInterval + (maxInterval - baseInterval) * scaleFactor)
  );

  context.vars.pollInterval = Math.floor(interval);

  return done();
}

/**
 * Track concurrent upload capacity
 */
function trackConcurrentUploads(requestParams, response, context, ee, next) {
  // Track active uploads
  if (response.statusCode === 200) {
    context.vars.uploadStartTime = Date.now();
    ee.emit('customStat', { stat: 'concurrent_uploads_started', value: 1 });
  }

  // Track upload completion
  if (context.vars.uploadStartTime && isProcessingComplete(context)) {
    ee.emit('customStat', { stat: 'concurrent_uploads_completed', value: 1 });
  }

  return next();
}

/**
 * Simulate upload failures for resilience testing
 */
function simulateUploadFailure(context, events, done) {
  // Randomly fail 5% of uploads to test error handling
  const failureRate = 0.05;
  context.vars.shouldFailUpload = Math.random() < failureRate;

  if (context.vars.shouldFailUpload) {
    events.emit('customStat', { stat: 'simulated_upload_failure', value: 1 });
  }

  return done();
}

module.exports = {
  generateVideoMetadata,
  generateVideoSize,
  createVideoBuffer,
  trackUploadProgress,
  trackProcessingStatus,
  validateProcessingWebhook,
  isProcessingComplete,
  calculatePollInterval,
  trackConcurrentUploads,
  simulateUploadFailure,
};
