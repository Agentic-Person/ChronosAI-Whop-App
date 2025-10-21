/**
 * Project Submission API Endpoint
 * POST /api/assessments/projects/submit - Submit project for AI review
 */

import { NextRequest, NextResponse } from 'next/server';
import { reviewProjectSubmission } from '@/lib/assessments';
import { getUser } from '@/lib/utils/supabase-client';
import { checkRateLimit } from '@/lib/infrastructure/rate-limiting/rate-limiter';
import { awardXP } from '@/lib/progress/gamification-engine';
import {
  ValidationError,
  RateLimitError,
  AuthenticationError,
  errorToAPIResponse,
} from '@/lib/infrastructure/errors';
import { logAPIRequest, logInfo, logError } from '@/lib/infrastructure/monitoring/logger';
import { supabase } from '@/lib/utils/supabase-client';

interface SubmitProjectRequest {
  projectId: string;
  code: string;
  files?: Array<{ filename: string; url: string }>;
  notes?: string;
  demoUrl?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Log API request
    logAPIRequest('POST', '/api/assessments/projects/submit', {});

    // 2. Authenticate user
    const user = await getUser();
    if (!user) {
      throw new AuthenticationError('Not authenticated');
    }

    // 3. Get student ID
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('whop_user_id', user.id)
      .single();

    if (!student) {
      throw new AuthenticationError('Student profile not found');
    }

    const studentId = student.id;

    // 4. Parse and validate request body
    const body: SubmitProjectRequest = await request.json();
    const { projectId, code, files, notes, demoUrl } = body;

    if (!projectId) {
      throw new ValidationError('Project ID is required');
    }

    if (!code || code.trim().length === 0) {
      throw new ValidationError('Code is required');
    }

    if (code.length > 50000) {
      throw new ValidationError('Code is too long (max 50,000 characters)');
    }

    // 5. Verify project belongs to student
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, student_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new ValidationError('Project not found');
    }

    if (project.student_id !== studentId) {
      throw new AuthenticationError('Not authorized to submit this project');
    }

    // 6. Rate limiting - 10 submissions per day
    const rateLimitResult = await checkRateLimit(studentId, 'project:submit', {
      max: 10,
      window: 86400,
    });

    if (!rateLimitResult.allowed) {
      throw new RateLimitError('Project submission rate limit exceeded. Try again tomorrow.');
    }

    // 7. Create submission
    const { data: submission, error: submissionError } = await supabase
      .from('project_submissions')
      .insert({
        project_id: projectId,
        student_id: studentId,
        code,
        files: files || [],
        notes,
        demo_url: demoUrl,
        submission_number: 1, // TODO: Increment for resubmissions
      })
      .select()
      .single();

    if (submissionError || !submission) {
      throw new Error('Failed to create submission');
    }

    // 8. Trigger AI review (async)
    logInfo('Starting AI code review', { submission_id: submission.id });

    const review = await reviewProjectSubmission(submission.id);

    // 9. Update project status
    await supabase
      .from('projects')
      .update({ status: 'submitted' })
      .eq('id', projectId);

    // 10. Award XP for submission
    await awardXP(studentId, 200, 'project_submitted', {
      project_id: projectId,
      submission_id: submission.id,
    });

    // 11. Return response
    const duration = Date.now() - startTime;
    logInfo('Project submitted successfully', {
      submission_id: submission.id,
      ai_score: review.overall_score,
      duration_ms: duration,
    });

    return NextResponse.json({
      success: true,
      data: {
        submission: {
          ...submission,
          ai_review: review,
        },
        xp_awarded: 200,
      },
    });
  } catch (error) {
    logError('Project submission failed', { error });
    return NextResponse.json(
      errorToAPIResponse(error),
      { status: (error as any).statusCode || 500 }
    );
  }
}
