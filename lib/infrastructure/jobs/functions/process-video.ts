/**
 * Video Processing Inngest Job
 *
 * Complete pipeline for processing uploaded videos:
 * 1. Transcribe video using Whisper API
 * 2. Chunk transcript into semantic segments
 * 3. Generate embeddings for each chunk
 * 4. Store in database
 * 5. Send completion notification
 */

import { inngest } from '../inngest-client';
import { transcribeVideo, storeTranscription, trackTranscriptionCost } from '@/lib/video/transcription';
import { chunkTranscript, storeChunks } from '@/lib/video/chunking';
import { generateEmbeddings, storeEmbeddings, trackEmbeddingCost } from '@/lib/video/embedding-generator';
import { updateProcessingStatus, getVideoById } from '@/lib/video/upload-handler';
import { getSupabaseAdmin } from '@/lib/infrastructure/database/connection-pool';
import { logInfo, logError } from '@/lib/infrastructure/monitoring/logger';
import { TextChunk } from '@/lib/video/types';

/**
 * Main video processing function
 */
export const processVideo = inngest.createFunction(
  {
    id: 'process-video',
    name: 'Process Uploaded Video',
    retries: 3,
    concurrency: {
      limit: 5, // Process max 5 videos concurrently
    },
  },
  { event: 'video/upload.completed' },
  async ({ event, step, logger }) => {
    const { videoId, creatorId, videoUrl, duration } = event.data;

    logger.info('Starting video processing', { videoId, creatorId });

    try {
      // Step 1: Transcribe video
      const transcript = await step.run('transcribe-video', async () => {
        await updateProcessingStatus(videoId, {
          processing_status: 'processing',
          processing_step: 'Transcribing audio',
          processing_progress: 10,
        });

        logger.info('Transcribing video', { videoId, videoUrl });
        const result = await transcribeVideo(videoUrl);

        // Store transcription
        await storeTranscription(videoId, result);

        // Track cost
        await trackTranscriptionCost(videoId, result.duration);

        await updateProcessingStatus(videoId, {
          processing_step: 'Transcription complete',
          processing_progress: 40,
        });

        logger.info('Transcription completed', {
          videoId,
          wordCount: result.text.split(/\s+/).length,
          segmentCount: result.segments.length,
        });

        return result;
      });

      // Step 2: Chunk transcript
      const chunks = await step.run('chunk-transcript', async () => {
        await updateProcessingStatus(videoId, {
          processing_step: 'Creating semantic chunks',
          processing_progress: 50,
        });

        logger.info('Chunking transcript', { videoId });
        const textChunks = chunkTranscript(transcript);

        // Store chunks - CRITICAL: Pass creatorId for multi-tenant isolation
        await storeChunks(videoId, creatorId, textChunks);

        await updateProcessingStatus(videoId, {
          processing_step: 'Chunks created',
          processing_progress: 60,
        });

        logger.info('Chunking completed', { videoId, chunkCount: textChunks.length });

        return textChunks;
      });

      // Step 3: Generate embeddings
      await step.run('generate-embeddings', async () => {
        await updateProcessingStatus(videoId, {
          processing_step: 'Generating embeddings',
          processing_progress: 70,
        });

        logger.info('Generating embeddings', { videoId, chunkCount: chunks.length });
        const embeddingResult = await generateEmbeddings(chunks);

        // Store embeddings
        await storeEmbeddings(videoId, embeddingResult.embeddings);

        // Track cost
        await trackEmbeddingCost(
          videoId,
          embeddingResult.totalTokens,
          embeddingResult.estimatedCost
        );

        await updateProcessingStatus(videoId, {
          processing_step: 'Embeddings generated',
          processing_progress: 90,
        });

        logger.info('Embeddings completed', {
          videoId,
          totalTokens: embeddingResult.totalTokens,
          estimatedCost: embeddingResult.estimatedCost,
        });
      });

      // Step 4: Mark as complete
      await step.run('mark-complete', async () => {
        await updateProcessingStatus(videoId, {
          processing_status: 'completed',
          processing_step: 'Processing complete',
          processing_progress: 100,
          processing_error: undefined,
        });

        logger.info('Video processing complete', { videoId });
      });

      // Step 5: Send notification
      await step.run('send-notification', async () => {
        const video = await getVideoById(videoId);
        if (!video) {
          throw new Error('Video not found');
        }

        // Get creator email
        const supabase = getSupabaseAdmin();
        const { data: creator } = await supabase
          .from('creators')
          .select('whop_user_id')
          .eq('id', creatorId)
          .single();

        if (creator) {
          // Send email notification via Inngest
          await inngest.send({
            name: 'email/send',
            data: {
              to: creator.whop_user_id, // This should be email in production
              template: 'video-processed',
              variables: {
                videoTitle: video.title,
                videoId: video.id,
                duration: video.duration_seconds,
              },
            },
          });

          logger.info('Notification sent', { videoId, creatorId });
        }
      });

      return {
        success: true,
        videoId,
        message: 'Video processed successfully',
      };
    } catch (error: any) {
      logger.error('Video processing failed', { videoId, error: error.message });

      // Update status to failed
      await updateProcessingStatus(videoId, {
        processing_status: 'failed',
        processing_error: error.message,
      });

      // Create job record
      const supabase = getSupabaseAdmin();
      await supabase.from('video_processing_jobs').insert({
        video_id: videoId,
        job_type: 'full-pipeline',
        status: 'failed',
        error_message: error.message,
        error_stack: error.stack,
        metadata: {
          creatorId,
          videoUrl,
          attemptedAt: new Date().toISOString(),
        },
      });

      throw error;
    }
  }
);

/**
 * Regenerate embeddings for existing video
 */
export const regenerateEmbeddings = inngest.createFunction(
  {
    id: 'regenerate-embeddings',
    name: 'Regenerate Video Embeddings',
    retries: 2,
  },
  { event: 'video/embeddings.regenerate' },
  async ({ event, step, logger }) => {
    const { videoId } = event.data;

    logger.info('Regenerating embeddings', { videoId });

    await step.run('regenerate', async () => {
      const supabase = getSupabaseAdmin();

      // Get chunks
      const { data: chunks, error } = await supabase
        .from('video_chunks')
        .select('chunk_text, chunk_index, start_timestamp, end_timestamp, word_count')
        .eq('video_id', videoId)
        .order('chunk_index', { ascending: true });

      if (error || !chunks) {
        throw new Error('Failed to fetch chunks');
      }

      // Convert to TextChunk format
      const textChunks: TextChunk[] = chunks.map((c) => ({
        text: c.chunk_text,
        index: c.chunk_index,
        startTimestamp: c.start_timestamp,
        endTimestamp: c.end_timestamp,
        wordCount: c.word_count,
      }));

      // Generate embeddings
      const result = await generateEmbeddings(textChunks);

      // Store embeddings
      await storeEmbeddings(videoId, result.embeddings);

      // Track cost
      await trackEmbeddingCost(videoId, result.totalTokens, result.estimatedCost);

      logger.info('Embeddings regenerated', { videoId });
    });

    return { success: true, videoId };
  }
);
