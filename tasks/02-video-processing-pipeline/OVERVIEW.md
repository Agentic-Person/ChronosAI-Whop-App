# Module 2: Video Processing Pipeline - Overview

## Executive Summary

The Video Processing Pipeline is the foundational system that transforms raw video uploads into searchable, AI-queryable content through automatic transcription, intelligent chunking, and vector embedding generation.

**Status**: Full Implementation Required
**Priority**: P0 (Critical Path - Required for RAG Chat)
**Dependencies**: Backend Infrastructure (Module 8)

## Problem Statement

### Creator Pain Points
- Manually transcribing videos is time-consuming and expensive
- No way to make video content searchable
- Students can't find specific information in hours of content
- Uploading and organizing videos is tedious

### What We're Solving
- **Automatic Transcription**: Whisper API converts speech to text with 95%+ accuracy
- **Intelligent Chunking**: Breaks transcripts into searchable segments
- **Vector Embeddings**: Makes content semantically searchable
- **Bulk Processing**: Handle 10+ videos simultaneously
- **Progress Tracking**: Real-time status updates

## Key Success Metrics

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Processing Speed | <5 min per hour of video | Creators get results fast |
| Transcription Accuracy | >95% | RAG depends on accurate text |
| Concurrent Processing | 10 videos simultaneously | Scalability |
| Cost per Hour | <$1 per hour of video | Sustainable economics |
| Success Rate | >98% | Reliability |

## System Capabilities

### Must Have (P0)
- [x] Video file upload to S3/R2
- [x] Automatic audio extraction
- [x] Whisper API transcription
- [x] Intelligent text chunking (500-1000 words)
- [x] OpenAI embedding generation
- [x] pgvector storage
- [x] Processing status tracking
- [x] Error handling and retry logic
- [x] Email notifications on completion

### Should Have (P1)
- [ ] Thumbnail generation
- [ ] Multiple audio tracks (multi-language)
- [ ] Speaker diarization (who said what)
- [ ] Chapter detection
- [ ] Automatic tagging by topic

### Nice to Have (Future)
- [ ] Real-time transcription for live streams
- [ ] Custom vocabulary for industry terms
- [ ] Slide detection in presentations
- [ ] Auto-generated video summaries

## Processing Pipeline Flow

```
1. UPLOAD
   Creator drags video → Upload to S3/R2 → Create DB record

2. TRANSCRIBE
   Extract audio → Send to Whisper API → Get timestamped transcript

3. CHUNK
   Split transcript → 500-1000 word segments → Preserve timestamps

4. EMBED
   Generate embeddings → OpenAI ada-002 → Store in pgvector

5. COMPLETE
   Mark as processed → Send notification → Ready for RAG search
```

**Total Time**: 3-5 minutes per hour of video content

## Technology Stack

| Component | Technology | Cost | Why |
|-----------|------------|------|-----|
| Video Storage | AWS S3 or Cloudflare R2 | ~$0.02/GB | Reliable, scalable |
| Transcription | OpenAI Whisper API | $0.006/min | Best accuracy |
| Embeddings | OpenAI ada-002 | $0.0001/1K tokens | Cost-effective |
| Job Queue | Inngest or Trigger.dev | ~$20/month | Reliable background jobs |
| Database | Supabase PostgreSQL | Included | Already using |

## Cost Analysis

### Per Video (1 hour of content)
- **Storage**: ~$0.02 (500MB video)
- **Transcription**: ~$0.36 (60 minutes × $0.006)
- **Embeddings**: ~$0.08 (assuming 8,000 words)
- **Total**: ~$0.46 per hour of video

### Monthly (100 creators, 5 videos/month each)
- **Total Videos**: 500 videos/month
- **Average Length**: 30 minutes
- **Total Cost**: ~$115/month
- **Per Creator**: ~$1.15/month

**Optimization**: Cache embeddings, batch processing, use R2 instead of S3

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Whisper API rate limits | Low | High | Queue system, retry logic |
| Poor transcription quality | Medium | High | Allow manual editing |
| Storage costs exceed budget | Low | Medium | Use Cloudflare R2, compression |
| Processing bottlenecks | Medium | Medium | Parallel processing, scale workers |
| Video format incompatibility | Low | Low | Support major formats, validate uploads |

## Development Timeline

### Week 1: Core Pipeline
- Days 1-2: S3/R2 upload handling
- Days 3-4: Whisper integration
- Days 5-6: Chunking algorithm
- Day 7: Testing and optimization

### Week 2: Embeddings & UI
- Days 1-2: OpenAI embedding generation
- Days 3-4: Upload UI components
- Days 5-6: Status dashboard
- Day 7: Integration testing

## Dependencies

### Upstream (We Need These First)
1. **Backend Infrastructure** (Module 8) - Database, job queue, storage
2. **Whop Integration** (Module 7) - Auth to know which creator

### Downstream (These Need Us)
1. **RAG Chat Engine** (Module 1) - Needs embeddings to search
2. **Creator Dashboard** (Module 6) - Displays processing status
3. **Progress Tracking** (Module 5) - Tracks video completion

## Testing Strategy

### Unit Tests
- Audio extraction
- Chunking algorithm
- Embedding generation
- Database operations

### Integration Tests
- End-to-end video processing
- Whisper API calls
- OpenAI API calls
- S3 upload/download

### Performance Tests
- Concurrent video processing
- Large file handling (4GB+)
- Processing time benchmarks

## Security Considerations

1. **File Validation**: Check file type, size before processing
2. **Access Control**: Only creator can upload to their account
3. **Signed URLs**: Temporary access to S3 objects
4. **API Keys**: Secure storage in env variables
5. **Content Scanning**: Malware/virus checks on uploads

## Next Steps

1. Read `ARCHITECTURE.md` - Understand technical design
2. Read `PROCESSING_FLOW.md` - Detailed pipeline steps
3. Read `IMPLEMENTATION.md` - Step-by-step build guide
4. Review `COST_OPTIMIZATION.md` - Reduce expenses
5. Check `API_SPEC.md` - API contracts

## Questions to Resolve

- [ ] AWS S3 vs Cloudflare R2? (R2 is cheaper, no egress fees)
- [ ] Inngest vs Trigger.dev for job queue?
- [ ] Allow manual transcript editing?
- [ ] Video retention policy? (delete after X months)
- [ ] Max video length limit? (suggest 4 hours)

## Related Documentation

- `/tasks/08-backend-infrastructure/` - Job queue setup
- `/tasks/01-rag-chat-engine/` - Uses the embeddings we create
- `/supabase/migrations/` - video and video_chunks tables
- `/lib/utils/constants.ts` - Chunk size constants
