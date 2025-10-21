# Module 2: Video Processing Pipeline - Implementation Guide

## Prerequisites

Before implementing video processing:
- [ ] Module 8 (Backend Infrastructure) operational - Inngest job queue required
- [ ] Supabase database with `videos` and `video_chunks` tables
- [ ] OpenAI API key (for Whisper and embeddings)
- [ ] S3 or Cloudflare R2 bucket configured
- [ ] FFmpeg installed (for audio extraction)

## Phase 1: Video Upload & Storage

### Step 1.1: Configure S3/R2 Storage

```typescript
// lib/video/storage/s3-client.ts

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  // For Cloudflare R2, add endpoint:
  // endpoint: process.env.R2_ENDPOINT,
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET!;

export class VideoStorage {
  /**
   * Generate presigned URL for direct browser upload
   * This avoids routing large files through your API
   */
  async getUploadUrl(
    fileName: string,
    fileType: string,
    creatorId: string
  ): Promise<{ uploadUrl: string; videoKey: string }> {
    // Create unique key with creator namespace
    const videoKey = `videos/${creatorId}/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: videoKey,
      ContentType: fileType,
      // Set metadata
      Metadata: {
        creator_id: creatorId,
        uploaded_at: new Date().toISOString(),
      },
    });

    // Generate presigned URL (valid for 1 hour)
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    return { uploadUrl, videoKey };
  }

  /**
   * Get presigned URL for video playback
   */
  async getPlaybackUrl(videoKey: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: videoKey,
    });

    // Valid for 24 hours
    return await getSignedUrl(s3Client, command, {
      expiresIn: 86400,
    });
  }

  /**
   * Check if video exists in storage
   */
  async videoExists(videoKey: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: videoKey,
      });
      await s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const videoStorage = new VideoStorage();
```

### Step 1.2: Create Upload API Route

```typescript
// app/api/videos/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { videoStorage } from '@/lib/video/storage/s3-client';
import { getSupabaseAdmin } from '@/lib/infrastructure/database/connection-pool';
import { withRateLimit } from '@/lib/infrastructure/rate-limiting/rate-limiter';

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileName, fileType, fileSize, creatorId, metadata } = body;

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: MP4, MOV, AVI, MKV' },
        { status: 400 }
      );
    }

    // Validate file size (max 5GB)
    const MAX_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
    if (fileSize > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size: 5GB' },
        { status: 400 }
      );
    }

    // Get presigned upload URL
    const { uploadUrl, videoKey } = await videoStorage.getUploadUrl(
      fileName,
      fileType,
      creatorId
    );

    // Create video record in database
    const { data: video, error } = await getSupabaseAdmin()
      .from('videos')
      .insert({
        creator_id: creatorId,
        title: metadata?.title || fileName.replace(/\.[^/.]+$/, ''),
        description: metadata?.description || '',
        video_url: videoKey, // S3 key, not full URL
        duration: metadata?.duration || 0,
        difficulty_level: metadata?.difficulty || 'intermediate',
        processing_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create video record:', error);
      return NextResponse.json(
        { error: 'Failed to create video record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      uploadUrl,
      videoId: video.id,
      videoKey,
    });
  } catch (error) {
    console.error('Upload URL generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handler, 'videoUpload');
```

### Step 1.3: Client-Side Upload Component

```typescript
// lib/video/upload-client.ts

export async function uploadVideoToS3(
  file: File,
  uploadUrl: string,
  onProgress: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

// Usage in React component:
async function handleUpload(file: File) {
  // Step 1: Get upload URL
  const response = await fetch('/api/videos/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      creatorId: creator.id,
      metadata: {
        title: file.name.replace(/\.[^/.]+$/, ''),
        description: '',
        difficulty: 'intermediate',
      },
    }),
  });

  const { uploadUrl, videoId } = await response.json();

  // Step 2: Upload directly to S3
  await uploadVideoToS3(file, uploadUrl, (progress) => {
    console.log(`Upload progress: ${progress}%`);
    setUploadProgress(progress);
  });

  // Step 3: Trigger processing
  await fetch('/api/videos/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId }),
  });

  console.log('Video uploaded and processing started!');
}
```

## Phase 2: Audio Extraction

### Step 2.1: Install FFmpeg

**On Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install ffmpeg
```

**On macOS**:
```bash
brew install ffmpeg
```

**On Windows**:
Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH

**Verify installation**:
```bash
ffmpeg -version
```

### Step 2.2: Create Audio Extraction Service

```typescript
// lib/video/audio-extraction.ts

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execPromise = promisify(exec);

export class AudioExtractor {
  /**
   * Extract audio from video file
   * Returns path to extracted audio file (WAV format for Whisper)
   */
  async extractAudio(videoPath: string): Promise<string> {
    // Create temp directory for audio files
    const tempDir = path.join(os.tmpdir(), 'mentora-audio');
    await fs.mkdir(tempDir, { recursive: true });

    // Generate output path
    const audioPath = path.join(
      tempDir,
      `audio-${Date.now()}.wav`
    );

    // FFmpeg command to extract audio
    // -i: input file
    // -vn: disable video
    // -acodec pcm_s16le: audio codec for WAV
    // -ar 16000: sample rate (Whisper requires 16kHz)
    // -ac 1: mono channel
    const command = `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}"`;

    try {
      await execPromise(command);

      // Verify file was created
      const stats = await fs.stat(audioPath);
      if (stats.size === 0) {
        throw new Error('Audio extraction produced empty file');
      }

      return audioPath;
    } catch (error) {
      console.error('FFmpeg error:', error);
      throw new Error(`Failed to extract audio: ${error.message}`);
    }
  }

  /**
   * Download video from S3 to temp directory
   */
  async downloadVideoToTemp(videoUrl: string): Promise<string> {
    const tempDir = path.join(os.tmpdir(), 'mentora-videos');
    await fs.mkdir(tempDir, { recursive: true });

    const videoPath = path.join(tempDir, `video-${Date.now()}.mp4`);

    // Download from S3 (use presigned URL)
    const response = await fetch(videoUrl);
    const buffer = await response.arrayBuffer();
    await fs.writeFile(videoPath, Buffer.from(buffer));

    return videoPath;
  }

  /**
   * Cleanup temp files
   */
  async cleanup(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

export const audioExtractor = new AudioExtractor();
```

## Phase 3: Transcription with Whisper

### Step 3.1: Create Whisper Service

```typescript
// lib/video/transcription.ts

import OpenAI from 'openai';
import fs from 'fs';
import type { Transcription, TranscriptSegment } from '@/types/video';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export class WhisperService {
  /**
   * Transcribe audio file using Whisper API
   * Returns transcript with timestamps
   */
  async transcribe(audioFilePath: string): Promise<Transcription> {
    try {
      console.log('Starting Whisper transcription...');
      const startTime = Date.now();

      // Create read stream for file
      const audioStream = fs.createReadStream(audioFilePath);

      // Call Whisper API
      const response = await openai.audio.transcriptions.create({
        file: audioStream,
        model: 'whisper-1',
        response_format: 'verbose_json', // Get timestamps
        timestamp_granularities: ['segment'], // Word-level timestamps
      });

      const duration = Date.now() - startTime;
      console.log(`Transcription completed in ${duration}ms`);

      // Process response
      const segments: TranscriptSegment[] = response.segments?.map((seg: any) => ({
        id: seg.id,
        text: seg.text.trim(),
        start: seg.start,
        end: seg.end,
        tokens: seg.tokens,
        temperature: seg.temperature,
        avg_logprob: seg.avg_logprob,
        compression_ratio: seg.compression_ratio,
        no_speech_prob: seg.no_speech_prob,
      })) || [];

      return {
        text: response.text,
        language: response.language,
        duration: response.duration,
        segments,
      };
    } catch (error) {
      console.error('Whisper API error:', error);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Estimate transcription cost
   * Whisper API pricing: $0.006 per minute
   */
  estimateCost(durationSeconds: number): number {
    const minutes = Math.ceil(durationSeconds / 60);
    return minutes * 0.006;
  }
}

export const whisperService = new WhisperService();
```

### Step 3.2: Add Transcription Types

```typescript
// types/video.ts (add to existing file)

export interface TranscriptSegment {
  id: number;
  text: string;
  start: number; // seconds
  end: number; // seconds
  tokens?: number[];
  temperature?: number;
  avg_logprob?: number;
  compression_ratio?: number;
  no_speech_prob?: number;
}

export interface Transcription {
  text: string; // Full transcript
  language: string;
  duration: number;
  segments: TranscriptSegment[];
}

export interface TextChunk {
  text: string;
  startTime: number;
  endTime: number;
  wordCount: number;
  topics?: string[];
}
```

## Phase 4: Intelligent Chunking

### Step 4.1: Create Chunking Algorithm

```typescript
// lib/video/chunking.ts

import type { Transcription, TranscriptSegment, TextChunk } from '@/types/video';

export class IntelligentChunker {
  // Configuration
  private readonly TARGET_WORDS = 750;
  private readonly MIN_WORDS = 500;
  private readonly MAX_WORDS = 1000;
  private readonly OVERLAP_WORDS = 100;

  /**
   * Chunk transcript into semantically meaningful segments
   */
  chunk(transcript: Transcription): TextChunk[] {
    const chunks: TextChunk[] = [];
    const segments = transcript.segments;

    let currentChunk: {
      segments: TranscriptSegment[];
      wordCount: number;
    } = {
      segments: [],
      wordCount: 0,
    };

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentWords = this.countWords(segment.text);

      currentChunk.segments.push(segment);
      currentChunk.wordCount += segmentWords;

      // Check if we should finalize this chunk
      const shouldFinalize =
        currentChunk.wordCount >= this.TARGET_WORDS ||
        (currentChunk.wordCount >= this.MIN_WORDS &&
          this.isNaturalBreak(segment, segments[i + 1]));

      if (shouldFinalize || i === segments.length - 1) {
        // Create chunk
        const chunkText = currentChunk.segments
          .map((s) => s.text)
          .join(' ')
          .trim();

        const startTime = currentChunk.segments[0].start;
        const endTime =
          currentChunk.segments[currentChunk.segments.length - 1].end;

        chunks.push({
          text: chunkText,
          startTime,
          endTime,
          wordCount: currentChunk.wordCount,
        });

        // Start new chunk with overlap
        const overlapSegments = this.getOverlapSegments(
          currentChunk.segments,
          this.OVERLAP_WORDS
        );

        currentChunk = {
          segments: overlapSegments,
          wordCount: overlapSegments.reduce(
            (sum, s) => sum + this.countWords(s.text),
            0
          ),
        };
      }
    }

    return chunks;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }

  /**
   * Check if this is a natural break point
   */
  private isNaturalBreak(
    current: TranscriptSegment,
    next?: TranscriptSegment
  ): boolean {
    if (!next) return true;

    const currentText = current.text.trim();
    const nextText = next.text.trim();

    // Pause between segments (>2 seconds)
    if (next.start - current.end > 2.0) {
      return true;
    }

    // Current ends with strong punctuation
    if (/[.!?:]$/.test(currentText)) {
      return true;
    }

    // Next starts with transition words
    const transitionWords = [
      'However',
      'Therefore',
      'Additionally',
      'Furthermore',
      'Meanwhile',
      'Next',
      'Finally',
      'First',
      'Second',
      'Now',
      'So',
    ];

    for (const word of transitionWords) {
      if (nextText.startsWith(word)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get last N words of segments for overlap
   */
  private getOverlapSegments(
    segments: TranscriptSegment[],
    targetWords: number
  ): TranscriptSegment[] {
    const overlap: TranscriptSegment[] = [];
    let wordCount = 0;

    // Start from end and work backwards
    for (let i = segments.length - 1; i >= 0; i--) {
      const segment = segments[i];
      const segmentWords = this.countWords(segment.text);

      overlap.unshift(segment);
      wordCount += segmentWords;

      if (wordCount >= targetWords) {
        break;
      }
    }

    return overlap;
  }
}

export const intelligentChunker = new IntelligentChunker();
```

## Phase 5: Embedding Generation

### Step 5.1: Create Embedding Service

```typescript
// lib/video/embeddings.ts

import OpenAI from 'openai';
import type { TextChunk } from '@/types/video';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export class EmbeddingService {
  private readonly MODEL = 'text-embedding-ada-002';
  private readonly BATCH_SIZE = 10; // Process 10 chunks at a time

  /**
   * Generate embedding for a single text chunk
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: this.MODEL,
        input: text.trim(),
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation error:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple chunks (batched)
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await openai.embeddings.create({
        model: this.MODEL,
        input: texts.map((t) => t.trim()),
      });

      return response.data.map((item) => item.embedding);
    } catch (error) {
      console.error('Batch embedding error:', error);
      throw new Error(`Batch embedding failed: ${error.message}`);
    }
  }

  /**
   * Process all chunks with batching to avoid rate limits
   */
  async processChunksWithEmbeddings(
    chunks: TextChunk[]
  ): Promise<Array<TextChunk & { embedding: number[] }>> {
    const results: Array<TextChunk & { embedding: number[] }> = [];

    // Process in batches
    for (let i = 0; i < chunks.length; i += this.BATCH_SIZE) {
      const batch = chunks.slice(i, i + this.BATCH_SIZE);
      const texts = batch.map((chunk) => chunk.text);

      console.log(
        `Processing embeddings batch ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(chunks.length / this.BATCH_SIZE)}`
      );

      const embeddings = await this.generateEmbeddingsBatch(texts);

      // Combine chunks with embeddings
      batch.forEach((chunk, index) => {
        results.push({
          ...chunk,
          embedding: embeddings[index],
        });
      });

      // Small delay to avoid rate limits
      if (i + this.BATCH_SIZE < chunks.length) {
        await this.delay(200); // 200ms delay
      }
    }

    return results;
  }

  /**
   * Estimate cost for embeddings
   * ada-002 pricing: $0.0001 per 1K tokens
   * Rough estimate: 750 words ≈ 1000 tokens
   */
  estimateCost(chunkCount: number): number {
    const tokensPerChunk = 1000;
    const totalTokens = chunkCount * tokensPerChunk;
    return (totalTokens / 1000) * 0.0001;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const embeddingService = new EmbeddingService();
```

## Phase 6: Complete Processing Pipeline (Inngest Job)

### Step 6.1: Create Processing Job

```typescript
// lib/infrastructure/jobs/functions/process-video.ts

import { inngest } from '../inngest-client';
import { getSupabaseAdmin } from '@/lib/infrastructure/database/connection-pool';
import { videoStorage } from '@/lib/video/storage/s3-client';
import { audioExtractor } from '@/lib/video/audio-extraction';
import { whisperService } from '@/lib/video/transcription';
import { intelligentChunker } from '@/lib/video/chunking';
import { embeddingService } from '@/lib/video/embeddings';

export const processVideo = inngest.createFunction(
  {
    id: 'process-video',
    name: 'Process Uploaded Video',
    retries: 3,
    rateLimit: {
      limit: 5, // Max 5 concurrent
      period: '1m',
    },
  },
  { event: 'video/upload.completed' },
  async ({ event, step, logger }) => {
    const { videoId } = event.data;

    logger.info('Starting video processing', { videoId });

    // Step 1: Update status
    await step.run('update-status-processing', async () => {
      await getSupabaseAdmin()
        .from('videos')
        .update({ processing_status: 'processing' })
        .eq('id', videoId);

      return { status: 'processing' };
    });

    // Step 2: Get video record
    const video = await step.run('fetch-video', async () => {
      const { data } = await getSupabaseAdmin()
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .single();

      if (!data) throw new Error('Video not found');
      return data;
    });

    // Step 3: Download video from S3
    const videoPath = await step.run('download-video', async () => {
      const playbackUrl = await videoStorage.getPlaybackUrl(video.video_url);
      const path = await audioExtractor.downloadVideoToTemp(playbackUrl);
      logger.info('Video downloaded', { videoId, path });
      return path;
    });

    // Step 4: Extract audio
    const audioPath = await step.run('extract-audio', async () => {
      const path = await audioExtractor.extractAudio(videoPath);
      logger.info('Audio extracted', { videoId, audioPath: path });
      return path;
    });

    // Step 5: Transcribe with Whisper
    const transcript = await step.run('transcribe', async () => {
      const result = await whisperService.transcribe(audioPath);
      logger.info('Transcription completed', {
        videoId,
        duration: result.duration,
        segmentCount: result.segments.length,
      });

      // Store full transcript
      await getSupabaseAdmin()
        .from('videos')
        .update({
          full_transcript: result.text,
          transcript_data: result,
        })
        .eq('id', videoId);

      return result;
    });

    // Step 6: Chunk transcript
    const chunks = await step.run('chunk-transcript', async () => {
      const textChunks = intelligentChunker.chunk(transcript);
      logger.info('Chunking completed', {
        videoId,
        chunkCount: textChunks.length,
      });
      return textChunks;
    });

    // Step 7: Generate embeddings
    await step.run('generate-embeddings', async () => {
      const chunksWithEmbeddings = await embeddingService.processChunksWithEmbeddings(chunks);

      // Store in database
      const chunkRecords = chunksWithEmbeddings.map((chunk, index) => ({
        video_id: videoId,
        chunk_text: chunk.text,
        chunk_index: index,
        start_timestamp: Math.floor(chunk.startTime),
        end_timestamp: Math.floor(chunk.endTime),
        embedding: chunk.embedding,
      }));

      await getSupabaseAdmin()
        .from('video_chunks')
        .insert(chunkRecords);

      logger.info('Embeddings stored', {
        videoId,
        chunkCount: chunkRecords.length,
      });

      return { chunksProcessed: chunkRecords.length };
    });

    // Step 8: Cleanup temp files
    await step.run('cleanup', async () => {
      await audioExtractor.cleanup(videoPath);
      await audioExtractor.cleanup(audioPath);
      logger.info('Temp files cleaned up', { videoId });
    });

    // Step 9: Mark complete
    await step.run('mark-complete', async () => {
      await getSupabaseAdmin()
        .from('videos')
        .update({
          processing_status: 'completed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', videoId);

      logger.info('Video processing complete', { videoId });
    });

    return {
      success: true,
      videoId,
      chunksCreated: chunks.length,
    };
  }
);

// Error handler
processVideo.onFailure(async ({ event, error, attempt }) => {
  if (attempt >= 3) {
    // Final failure
    await getSupabaseAdmin()
      .from('videos')
      .update({
        processing_status: 'failed',
        error_message: error.message,
      })
      .eq('id', event.data.videoId);

    // Send notification to creator
    // await sendEmail(creator, 'video-processing-failed', { error: error.message });
  }
});
```

### Step 6.2: Trigger Processing After Upload

```typescript
// app/api/videos/process/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/infrastructure/jobs/inngest-client';

export async function POST(req: NextRequest) {
  try {
    const { videoId } = await req.json();

    // Send event to Inngest
    await inngest.send({
      name: 'video/upload.completed',
      data: {
        videoId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Video processing started',
    });
  } catch (error) {
    console.error('Failed to trigger processing:', error);
    return NextResponse.json(
      { error: 'Failed to start processing' },
      { status: 500 }
    );
  }
}
```

## Phase 7: Testing

### Test Video Processing Locally

```typescript
// scripts/test-video-processing.ts

import { videoStorage } from '../lib/video/storage/s3-client';
import { audioExtractor } from '../lib/video/audio-extraction';
import { whisperService } from '../lib/video/transcription';
import { intelligentChunker } from '../lib/video/chunking';
import { embeddingService } from '../lib/video/embeddings';

async function testVideoProcessing() {
  console.log('🎬 Testing video processing pipeline...\n');

  // Use a small test video (< 5 min for quick testing)
  const testVideoPath = './test-video.mp4';

  try {
    // Step 1: Extract audio
    console.log('1. Extracting audio...');
    const audioPath = await audioExtractor.extractAudio(testVideoPath);
    console.log(`✅ Audio extracted: ${audioPath}\n`);

    // Step 2: Transcribe
    console.log('2. Transcribing with Whisper...');
    const transcript = await whisperService.transcribe(audioPath);
    console.log(`✅ Transcription complete:`);
    console.log(`   Duration: ${transcript.duration}s`);
    console.log(`   Segments: ${transcript.segments.length}`);
    console.log(`   Preview: ${transcript.text.substring(0, 100)}...\n`);

    // Step 3: Chunk
    console.log('3. Chunking transcript...');
    const chunks = intelligentChunker.chunk(transcript);
    console.log(`✅ Created ${chunks.length} chunks`);
    console.log(`   Avg words per chunk: ${Math.round(chunks.reduce((sum, c) => sum + c.wordCount, 0) / chunks.length)}\n`);

    // Step 4: Generate embeddings (first 3 chunks for testing)
    console.log('4. Generating embeddings (first 3 chunks)...');
    const testChunks = chunks.slice(0, 3);
    const chunksWithEmbeddings = await embeddingService.processChunksWithEmbeddings(testChunks);
    console.log(`✅ Generated ${chunksWithEmbeddings.length} embeddings`);
    console.log(`   Embedding dimensions: ${chunksWithEmbeddings[0].embedding.length}\n`);

    // Cleanup
    await audioExtractor.cleanup(audioPath);

    console.log('🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testVideoProcessing();
```

Run test:
```bash
npm run test:video-processing
```

### Test Cost Estimation

```typescript
// scripts/estimate-processing-cost.ts

async function estimateCost(videoDurationMinutes: number) {
  const durationSeconds = videoDurationMinutes * 60;

  // Whisper cost
  const whisperCost = (videoDurationMinutes * 0.006).toFixed(4);

  // Embedding cost (estimate 1 chunk per minute)
  const estimatedChunks = Math.ceil(videoDurationMinutes);
  const embeddingCost = (estimatedChunks * 0.0001).toFixed(4);

  // Total
  const totalCost = (parseFloat(whisperCost) + parseFloat(embeddingCost)).toFixed(4);

  console.log(`\n💰 Cost Estimate for ${videoDurationMinutes}-minute video:`);
  console.log(`   Whisper Transcription: $${whisperCost}`);
  console.log(`   OpenAI Embeddings: $${embeddingCost}`);
  console.log(`   Total: $${totalCost}`);
  console.log(`\nFor 100 videos: $${(parseFloat(totalCost) * 100).toFixed(2)}`);
}

// Test with 60-minute video
estimateCost(60);
```

## Performance Optimization

### Parallel Processing

Process multiple videos concurrently but limit to avoid rate limits:

```typescript
// Inngest configuration with concurrency control
export const processVideo = inngest.createFunction(
  {
    id: 'process-video',
    concurrency: {
      limit: 5, // Max 5 videos processing at once
    },
  },
  // ... rest of function
);
```

### Caching Transcripts

Cache transcripts to avoid reprocessing if video is re-uploaded:

```typescript
import { cache } from '@/lib/infrastructure/cache/redis-client';

// Before transcribing
const cacheKey = `transcript:${videoHash}`;
const cached = await cache.get(cacheKey);
if (cached) return cached;

// After transcribing
await cache.set(cacheKey, transcript, 7 * 24 * 60 * 60); // 7 days
```

## Troubleshooting

### Issue: FFmpeg not found
**Solution**: Ensure FFmpeg is installed and in PATH

### Issue: Whisper API timeout
**Solution**: Split long videos into segments, process separately

### Issue: Out of memory
**Solution**: Process chunks in smaller batches, increase Node memory limit

### Issue: S3 upload fails
**Solution**: Check bucket permissions, CORS configuration

---

**Next**: Implement real-time progress updates using Inngest streaming or webhooks!
