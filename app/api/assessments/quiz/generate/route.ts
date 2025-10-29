/**
 * Quiz Generation API Endpoint
 * POST /api/assessments/quiz/generate - Generate AI quiz from video content
 * FEATURE GATED: PRO tier required
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateQuiz, QuizOptions } from '@/lib/assessments';
import { getUser } from '@/lib/utils/supabase-client';
import { checkRateLimit } from '@/lib/infrastructure/rate-limiting/rate-limiter';
import { checkFeatureAccess } from '@/lib/features/feature-flags';
import { Feature } from '@/lib/features/types';
import {
  ValidationError,
  RateLimitError,
  AuthenticationError,
  FeatureNotAvailableError,
  errorToAPIResponse,
} from '@/lib/infrastructure/errors';
import { logAPIRequest, logInfo, logError } from '@/lib/infrastructure/monitoring/logger';
import { createClient } from '@/lib/supabase/server';

interface GenerateQuizRequest {
  videoIds: string[];
  options: QuizOptions;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Log API request
    logAPIRequest('POST', '/api/assessments/quiz/generate', {});

    // 2. Authenticate user
    const user = await getUser();
    if (!user) {
      throw new AuthenticationError('Not authenticated');
    }

    // 3. Get creator ID
    const supabase = createClient();
    const { data: student } = await supabase
      .from('students')
      .select('creator_id')
      .eq('whop_user_id', user.id)
      .single();

    if (!student) {
      throw new AuthenticationError('Student profile not found');
    }

    const creatorId = student.creator_id;

    // 4. Feature gate check - PRO tier required
    const featureAccess = await checkFeatureAccess(creatorId, Feature.FEATURE_QUIZZES);

    if (!featureAccess.hasAccess) {
      throw new FeatureNotAvailableError(
        'Quiz generation requires PRO or ENTERPRISE plan',
        {
          feature: Feature.FEATURE_QUIZZES,
          currentPlan: featureAccess.userPlan,
          requiredPlan: featureAccess.requiredPlan,
        }
      );
    }

    // 5. Parse and validate request body
    const body: GenerateQuizRequest = await request.json();
    const { videoIds, options } = body;

    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      throw new ValidationError('At least one video ID is required');
    }

    if (videoIds.length > 10) {
      throw new ValidationError('Maximum 10 videos can be used for quiz generation');
    }

    if (!options || typeof options !== 'object') {
      throw new ValidationError('Quiz options are required');
    }

    // Validate options
    if (!options.questionCount || options.questionCount < 3 || options.questionCount > 20) {
      throw new ValidationError('Question count must be between 3 and 20');
    }

    if (!['beginner', 'intermediate', 'advanced'].includes(options.difficulty)) {
      throw new ValidationError('Invalid difficulty level');
    }

    if (!options.questionTypes || options.questionTypes.length === 0) {
      throw new ValidationError('At least one question type is required');
    }

    // 6. Rate limiting - 5 quiz generations per hour
    const rateLimitResult = await checkRateLimit(creatorId, 'quiz:generate', {
      max: 5,
      window: 3600, // 1 hour
    });

    if (!rateLimitResult.allowed) {
      throw new RateLimitError('Quiz generation rate limit exceeded. Try again later.');
    }

    // 7. Generate quiz
    logInfo('Generating quiz', { creator_id: creatorId, video_count: videoIds.length });

    const quiz = await generateQuiz(videoIds, options, creatorId);

    // 8. Return response
    const duration = Date.now() - startTime;
    logInfo('Quiz generated successfully', {
      quiz_id: quiz.id,
      duration_ms: duration,
      question_count: quiz.questions.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        quiz,
        remaining_generations: rateLimitResult.remaining,
      },
    });
  } catch (error) {
    logError('Quiz generation failed', { error });
    return NextResponse.json(
      errorToAPIResponse(error),
      { status: (error as any).statusCode || 500 }
    );
  }
}
