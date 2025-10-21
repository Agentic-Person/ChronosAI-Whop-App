# Video Processing Pipeline - Detailed Flow

## Complete Processing Pipeline

This document details every step of the video processing pipeline from upload to searchable content.

## Pipeline Stages

### Stage 1: Upload & Validation (30 seconds)

```mermaid
graph LR
    A[Creator Uploads] --> B[Validate File]
    B --> C[Check Size/Format]
    C --> D[Generate Upload URL]
    D --> E[Upload to S3/R2]
    E --> F[Create DB Record]
    F --> G[Trigger Job]
```

**Implementation**:
```typescript
// Step 1: Validate file on client
const validateVideo = (file: File): boolean => {
  const maxSize = 4 * 1024 * 1024 * 1024; // 4GB
  const allowedFormats = ['video/mp4', 'video/mov', 'video/avi', 'video/webm'];

  if (file.size > maxSize) {
    throw new Error('Video too large (max 4GB)');
  }

  if (!allowedFormats.includes(file.type)) {
    throw new Error('Invalid format. Use MP4, MOV, AVI, or WebM');
  }

  return true;
};

// Step 2: Get signed upload URL
const getUploadUrl = async (filename: string, contentType: string) => {
  const response = await fetch('/api/video/upload-url', {
    method: 'POST',
    body: JSON.stringify({ filename, contentType }),
  });
  return response.json();
};

// Step 3: Upload to S3
const uploadToS3 = async (file: File, signedUrl: string) => {
  await fetch(signedUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
};

// Step 4: Create database record
const createVideoRecord = async (metadata: VideoMetadata) => {
  await fetch('/api/video/create', {
    method: 'POST',
    body: JSON.stringify(metadata),
  });
};
```

**Database State**: `transcript_processed: false`, `status: 'uploading'`

### Stage 2: Audio Extraction (1-2 minutes per hour)

```typescript
// Using ffmpeg to extract audio
import ffmpeg from 'fluent-ffmpeg';

async function extractAudio(videoPath: string): Promise<string> {
  const audioPath = videoPath.replace(/\.[^.]+$/, '.wav');

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .audioChannels(1) // Mono
      .audioFrequency(16000) // 16kHz for Whisper
      .format('wav')
      .on('end', () => resolve(audioPath))
      .on('error', reject)
      .save(audioPath);
  });
}
```

**Why WAV format?**
- Whisper API prefers WAV or FLAC
- No lossy compression artifacts
- 16kHz is optimal for speech

**Database State**: `status: 'extracting_audio'`

### Stage 3: Transcription (1-2 minutes per hour)

```typescript
import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function transcribeAudio(audioPath: string): Promise<Transcript> {
  const audioFile = fs.createReadStream(audioPath);

  const response = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    response_format: 'verbose_json', // Get timestamps
    timestamp_granularities: ['segment'], // Segment-level timestamps
    language: 'en', // Optional: auto-detect if omitted
  });

  return {
    text: response.text,
    segments: response.segments || [],
    duration: response.duration,
  };
}

interface Transcript {
  text: string;
  segments: Array<{
    id: number;
    start: number; // seconds
    end: number;
    text: string;
  }>;
  duration: number;
}
```

**Handling Long Videos**:
```typescript
// Whisper API has 25MB limit, split if needed
async function splitAndTranscribe(audioPath: string): Promise<Transcript> {
  const fileSize = fs.statSync(audioPath).size;
  const maxSize = 25 * 1024 * 1024; // 25MB

  if (fileSize <= maxSize) {
    return transcribeAudio(audioPath);
  }

  // Split into chunks
  const chunks = await splitAudioFile(audioPath, maxSize);
  const transcripts = await Promise.all(chunks.map(transcribeAudio));

  // Merge transcripts
  return mergeTranscripts(transcripts);
}
```

**Database State**: `status: 'transcribing'`, `transcript: <full text>`

### Stage 4: Intelligent Chunking (30 seconds)

```typescript
interface TextChunk {
  text: string;
  index: number;
  startTimestamp: number;
  endTimestamp: number;
  wordCount: number;
}

class IntelligentChunker {
  private readonly TARGET_WORDS = 750; // Target chunk size
  private readonly MIN_WORDS = 500;
  private readonly MAX_WORDS = 1000;
  private readonly OVERLAP_WORDS = 100;

  chunk(transcript: Transcript): TextChunk[] {
    const chunks: TextChunk[] = [];
    let currentChunk: string[] = [];
    let chunkStartTime = 0;
    let lastSegmentEnd = 0;

    for (const segment of transcript.segments) {
      const words = segment.text.split(/\s+/);
      currentChunk.push(...words);
      lastSegmentEnd = segment.end;

      // Check if chunk is complete
      if (currentChunk.length >= this.TARGET_WORDS) {
        // Find natural break (sentence end)
        const breakPoint = this.findNaturalBreak(currentChunk);

        chunks.push({
          text: currentChunk.slice(0, breakPoint).join(' '),
          index: chunks.length,
          startTimestamp: chunkStartTime,
          endTimestamp: lastSegmentEnd,
          wordCount: breakPoint,
        });

        // Overlap: keep last 100 words
        currentChunk = currentChunk.slice(breakPoint - this.OVERLAP_WORDS);
        chunkStartTime = lastSegmentEnd - this.calculateOverlapTime(segment);
      }
    }

    // Add remaining words
    if (currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.join(' '),
        index: chunks.length,
        startTimestamp: chunkStartTime,
        endTimestamp: lastSegmentEnd,
        wordCount: currentChunk.length,
      });
    }

    return chunks;
  }

  private findNaturalBreak(words: string[]): number {
    // Look for sentence endings in last 100 words
    for (let i = words.length - 1; i >= words.length - 100; i--) {
      if (words[i].match(/[.!?]$/)) {
        return i + 1;
      }
    }
    // No natural break found, use target size
    return this.TARGET_WORDS;
  }

  private calculateOverlapTime(segment: any): number {
    const segmentDuration = segment.end - segment.start;
    const wordsInSegment = segment.text.split(/\s+/).length;
    return (this.OVERLAP_WORDS / wordsInSegment) * segmentDuration;
  }
}
```

**Why This Approach?**
- **500-1000 words**: Optimal for semantic search context
- **100-word overlap**: Prevents losing context at boundaries
- **Natural breaks**: Chunk at sentence endings when possible
- **Preserve timestamps**: Essential for video references

**Database State**: `status: 'chunking'`, creates records in `video_chunks` table

### Stage 5: Embedding Generation (1-2 minutes)

```typescript
import OpenAI from 'openai';
import { chunkArray } from '@/lib/utils/helpers';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class EmbeddingGenerator {
  async generateEmbeddings(chunks: TextChunk[]): Promise<EmbeddedChunk[]> {
    // Batch process to respect rate limits
    const batches = chunkArray(chunks, 100); // 100 chunks per batch
    const allEmbeddings: EmbeddedChunk[] = [];

    for (const batch of batches) {
      const embeddings = await this.processBatch(batch);
      allEmbeddings.push(...embeddings);

      // Rate limiting: wait between batches
      await this.sleep(1000); // 1 second
    }

    return allEmbeddings;
  }

  private async processBatch(chunks: TextChunk[]): Promise<EmbeddedChunk[]> {
    const texts = chunks.map(c => c.text);

    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: texts,
    });

    return chunks.map((chunk, idx) => ({
      ...chunk,
      embedding: response.data[idx].embedding, // 1536 dimensions
    }));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface EmbeddedChunk extends TextChunk {
  embedding: number[]; // 1536 floats
}
```

**Cost Calculation**:
```typescript
// For 1 hour video (~8,000 words)
const chunks = Math.ceil(8000 / 750); // ~11 chunks
const tokens = chunks * 750 * 1.3; // ~10,725 tokens (1.3x for tokenization)
const cost = (tokens / 1000) * 0.0001; // ~$0.001 per video hour
```

**Database State**: `status: 'embedding'`, stores vectors in `video_chunks.embedding`

### Stage 6: Database Storage & Indexing (30 seconds)

```typescript
import { supabaseAdmin } from '@/lib/utils/supabase-client';

async function storeChunks(
  videoId: string,
  embeddedChunks: EmbeddedChunk[]
): Promise<void> {
  const records = embeddedChunks.map(chunk => ({
    video_id: videoId,
    chunk_text: chunk.text,
    chunk_index: chunk.index,
    start_timestamp: chunk.startTimestamp,
    end_timestamp: chunk.endTimestamp,
    embedding: `[${chunk.embedding.join(',')}]`, // Convert to pgvector format
  }));

  // Batch insert
  const { error } = await supabaseAdmin
    .from('video_chunks')
    .insert(records);

  if (error) throw error;

  // Update video record
  await supabaseAdmin
    .from('videos')
    .update({
      transcript_processed: true,
      status: 'completed',
    })
    .eq('id', videoId);
}
```

**pgvector Storage**:
```sql
-- The embedding column uses pgvector type
ALTER TABLE video_chunks ADD COLUMN embedding vector(1536);

-- Create index for fast similarity search
CREATE INDEX ON video_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100); -- Adjust based on data size
```

**Database State**: `transcript_processed: true`, `status: 'completed'`

### Stage 7: Completion & Notification (5 seconds)

```typescript
import { sendEmail } from '@/lib/infrastructure/email';

async function notifyCompletion(videoId: string, creatorEmail: string) {
  const video = await getVideoById(videoId);

  await sendEmail({
    to: creatorEmail,
    subject: `Video processed: ${video.title}`,
    html: `
      <h1>Your video is ready!</h1>
      <p><strong>${video.title}</strong> has been processed and is now searchable.</p>
      <p>Students can now ask questions about this content through the AI chat.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/videos/${videoId}">
        View Video
      </a>
    `,
  });
}
```

## Error Handling

### Retry Strategy

```typescript
async function processVideoWithRetry(videoId: string, maxRetries = 3) {
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      await processVideo(videoId);
      return; // Success
    } catch (error) {
      attempts++;
      console.error(`Attempt ${attempts} failed:`, error);

      if (attempts >= maxRetries) {
        // Mark as failed
        await supabaseAdmin
          .from('videos')
          .update({ status: 'failed', error: error.message })
          .eq('id', videoId);

        // Notify creator
        await notifyFailure(videoId, error);
        throw error;
      }

      // Exponential backoff
      await sleep(Math.pow(2, attempts) * 1000);
    }
  }
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `TranscriptionFailed` | Poor audio quality | Allow manual transcript upload |
| `FileTooLarge` | >4GB file | Split video or compress |
| `UnsupportedFormat` | Wrong codec | Convert to MP4 |
| `RateLimitExceeded` | Too many API calls | Queue and retry |
| `InsufficientStorage` | S3 quota exceeded | Upgrade plan or delete old videos |

## Performance Optimization

### Parallel Processing

```typescript
async function processBatchOfVideos(videoIds: string[]) {
  // Process up to 5 videos concurrently
  const chunks = chunkArray(videoIds, 5);

  for (const chunk of chunks) {
    await Promise.all(chunk.map(id => processVideo(id)));
  }
}
```

### Caching Strategy

```typescript
// Cache embeddings to avoid regenerating
const cacheKey = `embedding:${sha256(text)}`;
let embedding = await cache.get(cacheKey);

if (!embedding) {
  embedding = await generateEmbedding(text);
  await cache.set(cacheKey, embedding, { ex: 30 * 24 * 60 * 60 }); // 30 days
}
```

## Monitoring

Track these metrics:
```typescript
metrics.timing('video.processing.total', totalDuration);
metrics.timing('video.processing.transcription', transcriptionTime);
metrics.timing('video.processing.embedding', embeddingTime);
metrics.increment('video.processing.success');
metrics.increment('video.processing.failure', { error_type });
metrics.gauge('video.processing.queue_size', queueSize);
```

## Next Steps

1. Review `ARCHITECTURE.md` for system design
2. Read `IMPLEMENTATION.md` for step-by-step build
3. Check `COST_OPTIMIZATION.md` for savings tips
