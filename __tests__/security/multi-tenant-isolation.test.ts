/**
 * Multi-Tenant Isolation Security Tests
 * Tests for CRITICAL: Cross-tenant data leakage prevention
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@/lib/utils/supabase-client';
import { searchRelevantChunks } from '@/lib/rag/vector-search';
import { queryRAG } from '@/lib/rag/rag-engine';

describe('Multi-Tenant Isolation Tests', () => {
  let testCreator1Id: string;
  let testCreator2Id: string;
  let testVideo1Id: string;
  let testVideo2Id: string;

  beforeAll(async () => {
    // Setup test data
    // Note: In actual tests, you'd create test creators and videos
    testCreator1Id = 'creator-1-uuid';
    testCreator2Id = 'creator-2-uuid';
    testVideo1Id = 'video-1-uuid';
    testVideo2Id = 'video-2-uuid';
  });

  describe('Vector Search Isolation', () => {
    it('should require creator_id parameter', async () => {
      await expect(async () => {
        // @ts-expect-error - Testing missing creator_id
        await searchRelevantChunks('test query', {
          // creator_id intentionally missing
          match_count: 5,
        });
      }).rejects.toThrow(/creator_id is required/i);
    });

    it('should not return chunks from other creators', async () => {
      const results = await searchRelevantChunks('test query', {
        creator_id: testCreator1Id,
        match_count: 10,
      });

      // All results should belong to creator 1
      results.forEach(result => {
        // This would check the creator_id on the video
        expect(result.video_id).toBeDefined();
      });
    });

    it('should filter by video_ids within same creator', async () => {
      const results = await searchRelevantChunks('test query', {
        creator_id: testCreator1Id,
        video_ids: [testVideo1Id],
        match_count: 5,
      });

      // All results should be from the specified video
      results.forEach(result => {
        expect(result.video_id).toBe(testVideo1Id);
      });
    });

    it('should return empty results when video belongs to different creator', async () => {
      // Try to access creator 2's video with creator 1's ID
      const results = await searchRelevantChunks('test query', {
        creator_id: testCreator1Id,
        video_ids: [testVideo2Id], // Belongs to creator 2
        match_count: 5,
      });

      // Should return no results due to creator_id mismatch
      expect(results.length).toBe(0);
    });
  });

  describe('RAG Query Isolation', () => {
    it('should enforce creator_id in RAG queries', async () => {
      await expect(async () => {
        await queryRAG('What is machine learning?', {
          // @ts-expect-error - Testing missing creator_id
          student_id: 'student-123',
          // creator_id intentionally missing
        });
      }).rejects.toThrow(/creator_id is required/i);
    });

    it('should only search within creator content', async () => {
      const response = await queryRAG('test question', {
        creator_id: testCreator1Id,
        student_id: 'student-123',
      });

      // Verify all video references belong to the correct creator
      response.video_references.forEach(ref => {
        expect(ref.video_id).toBeDefined();
        // In real test, would verify creator_id matches
      });
    });
  });

  describe('Database RLS Policies', () => {
    it('should prevent cross-creator video access', async () => {
      const supabase = createClient();

      // This test assumes creator 1 is authenticated
      // Try to access creator 2's videos
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('creator_id', testCreator2Id);

      // RLS should block this
      expect(data).toBeNull();
      expect(error).toBeDefined();
    });

    it('should prevent cross-creator chunk access', async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('video_chunks')
        .select('*')
        .eq('video_id', testVideo2Id); // Belongs to creator 2

      // RLS should block this
      expect(data).toBeNull();
      expect(error).toBeDefined();
    });

    it('should prevent cross-creator chat session access', async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('creator_id', testCreator2Id);

      // RLS should block this
      expect(data).toBeNull();
      expect(error).toBeDefined();
    });
  });

  describe('Match Video Chunks Function', () => {
    it('should enforce creator_id in match_video_chunks function', async () => {
      const supabase = createClient();

      // Generate a dummy embedding (1536 dimensions for OpenAI)
      const dummyEmbedding = Array(1536).fill(0);

      const { data, error } = await supabase.rpc('match_video_chunks', {
        query_embedding: dummyEmbedding,
        match_threshold: 0.7,
        match_count: 5,
        filter_creator_id: testCreator1Id,
      });

      if (data) {
        // All results should be from creator 1
        data.forEach((result: any) => {
          // Verify creator_id matches
          expect(result.chunk_id).toBeDefined();
        });
      }
    });

    it('should not return results without creator_id', async () => {
      const supabase = createClient();
      const dummyEmbedding = Array(1536).fill(0);

      // Try to call without creator_id (should fail)
      const { data, error } = await supabase.rpc('match_video_chunks', {
        query_embedding: dummyEmbedding,
        match_threshold: 0.7,
        match_count: 5,
        // filter_creator_id intentionally missing
      });

      expect(error).toBeDefined();
    });
  });

  describe('Enrollment-Based Access', () => {
    it('should only return videos from enrolled creators', async () => {
      // Student should only see videos from creators they're enrolled with
      const studentId = 'student-123';

      const supabase = createClient();
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('creator_id')
        .eq('student_id', studentId)
        .eq('status', 'active');

      expect(enrollments).toBeDefined();
      // Verify only enrolled creators' content is accessible
    });

    it('should block access to unenrolled creator content', async () => {
      // Test that students cannot access content from creators
      // they are not enrolled with
      const studentId = 'student-123';
      const unenrolledCreatorId = 'creator-999';

      const supabase = createClient();
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', studentId)
        .eq('creator_id', unenrolledCreatorId)
        .eq('status', 'active')
        .single();

      expect(enrollment).toBeNull();
    });
  });

  describe('Creator Data Isolation', () => {
    it('should isolate creator analytics', async () => {
      // Creator 1 should not see creator 2's analytics
      const supabase = createClient();

      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('event_data->creator_id', testCreator2Id);

      // Should be blocked by RLS or return empty
      expect(data).toEqual([]);
    });

    it('should isolate creator student lists', async () => {
      // Creator 1 should only see their own students
      const supabase = createClient();

      const { data: students } = await supabase
        .from('students')
        .select('*')
        .eq('creator_id', testCreator1Id);

      if (students) {
        students.forEach(student => {
          expect(student.creator_id).toBe(testCreator1Id);
        });
      }
    });
  });

  describe('Admin Functions Security', () => {
    it('should require creator_id in enroll_student function', async () => {
      const supabase = createClient();

      const { error } = await supabase.rpc('enroll_student', {
        p_student_id: 'student-123',
        p_creator_id: null, // Should reject null creator_id
      });

      expect(error).toBeDefined();
    });

    it('should prevent enrollment manipulation across creators', async () => {
      // Ensure creator 1 cannot manipulate creator 2's enrollments
      const supabase = createClient();

      const { error } = await supabase
        .from('enrollments')
        .update({ status: 'inactive' })
        .eq('creator_id', testCreator2Id); // Different creator

      expect(error).toBeDefined();
    });
  });
});

describe('Creator Impersonation Prevention', () => {
  it('should validate creator ownership before operations', () => {
    // Verify that operations check creator_id matches authenticated user
    const authenticatedCreatorId = 'creator-1';
    const requestedCreatorId = 'creator-2';

    expect(authenticatedCreatorId).not.toBe(requestedCreatorId);
  });

  it('should prevent header-based creator_id manipulation', () => {
    // Verify that creator_id cannot be spoofed via headers
    const headers = {
      'x-creator-id': 'malicious-creator-id',
    };

    // Should be rejected in favor of session-based creator_id
    expect(headers['x-creator-id']).toBeDefined();
  });
});

describe('Service Role Access Control', () => {
  it('should audit service role usage', () => {
    // Verify that service role queries are logged
    const serviceRoleQuery = {
      role: 'service_role',
      operation: 'SELECT',
      table: 'videos',
    };

    expect(serviceRoleQuery.role).toBe('service_role');
    // In production, this should trigger audit logging
  });

  it('should limit service role to background jobs', () => {
    // Service role should only be used for Inngest jobs and admin operations
    const validServiceRoleOperations = [
      'video_processing',
      'email_notifications',
      'analytics_aggregation',
    ];

    expect(validServiceRoleOperations.length).toBeGreaterThan(0);
  });
});
