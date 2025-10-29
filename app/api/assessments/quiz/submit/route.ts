/**
 * Quiz Submission API Endpoint
 * POST /api/assessments/quiz/submit - Submit quiz answers and get results
 */

import { NextRequest, NextResponse } from 'next/server';
import { submitQuizAttempt } from '@/lib/assessments';
import { checkRateLimit } from '@/lib/infrastructure/rate-limiting/rate-limiter';
import {
  ValidationError,
  RateLimitError,
  AuthenticationError,
  errorToAPIResponse,
} from '@/lib/infrastructure/errors';
import { logAPIRequest, logInfo, logError } from '@/lib/infrastructure/monitoring/logger';
import { createClient } from '@/lib/supabase/server';

interface SubmitQuizRequest {
  quizId: string;
  answers: Record<string, any>;
  timeSpentSeconds?: number;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Log API request
    logAPIRequest('POST', '/api/assessments/quiz/submit', {});

    // 2. Authenticate user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
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
    const body: SubmitQuizRequest = await request.json();
    const { quizId, answers, timeSpentSeconds } = body;

    if (!quizId) {
      throw new ValidationError('Quiz ID is required');
    }

    if (!answers || typeof answers !== 'object') {
      throw new ValidationError('Answers are required');
    }

    if (Object.keys(answers).length === 0) {
      throw new ValidationError('At least one answer must be provided');
    }

    // 5. Rate limiting - 10 submissions per hour (prevent spam retries)
    const rateLimitResult = await checkRateLimit(studentId, 'quiz:submit', {
      max: 10,
      window: 3600,
    });

    if (!rateLimitResult.allowed) {
      throw new RateLimitError('Quiz submission rate limit exceeded. Please wait before retrying.');
    }

    // 6. Submit quiz attempt
    logInfo('Submitting quiz attempt', { student_id: studentId, quiz_id: quizId });

    const result = await submitQuizAttempt(quizId, studentId, answers, timeSpentSeconds);

    // 7. Return response
    const duration = Date.now() - startTime;
    logInfo('Quiz submitted successfully', {
      attempt_id: result.attempt_id,
      score: result.score,
      passed: result.passed,
      duration_ms: duration,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logError('Quiz submission failed', { error });
    return NextResponse.json(
      errorToAPIResponse(error),
      { status: (error as any).statusCode || 500 }
    );
  }
}
