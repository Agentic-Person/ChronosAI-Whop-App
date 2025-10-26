/**
 * Chat API Endpoint
 * POST /api/chat - Send a message and get AI response with video references
 */

import { NextRequest, NextResponse } from 'next/server';
import { chatWithSession } from '@/lib/rag/rag-engine';
import { getUser } from '@/lib/utils/supabase-client';
import { checkRateLimit } from '@/lib/infrastructure/rate-limiting/rate-limiter';
import { ChatRequest, APIResponse, ChatResponse } from '@/types/api';
import {
  ValidationError,
  RateLimitError,
  AuthenticationError,
  getErrorStatusCode,
  errorToAPIResponse
} from '@/lib/infrastructure/errors';
import { logAPIRequest, logInfo, logError } from '@/lib/infrastructure/monitoring/logger';
import { measureAsync } from '@/lib/infrastructure/monitoring/performance';
import { awardChatMessage, getBalance } from '@/lib/chronos/rewardEngine';
import { checkChatLimit, incrementChatUsage, initializeUsage, formatUsageMessage } from '@/lib/features/chat-limits';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Log API request
    logAPIRequest('POST', '/api/chat', {});

    // 2. Authenticate user
    const user = await getUser();
    if (!user) {
      throw new AuthenticationError('Not authenticated');
    }

    // 3. Parse and validate request body
    const body: ChatRequest = await request.json();
    const { message, session_id, context_type } = body;

    if (!message || message.trim().length === 0) {
      throw new ValidationError('Message is required');
    }

    if (message.length > 500) {
      throw new ValidationError('Message too long (max 500 characters)');
    }

    // 4. Check chat limits (FREE tier: 3 questions, others: daily limits)
    const limitCheck = await checkChatLimit(user.id);

    if (!limitCheck.allowed) {
      // User has exceeded their chat limit
      return NextResponse.json({
        success: false,
        error: {
          code: 'CHAT_LIMIT_EXCEEDED',
          message: limitCheck.message || 'You have reached your chat limit. Please upgrade to continue.',
          details: {
            tier: limitCheck.usage.tier,
            upgrade_required: limitCheck.usage.upgrade_required,
            questions_asked: limitCheck.usage.questions_asked,
            remaining: limitCheck.usage.remaining,
          },
        },
        meta: {
          usage: limitCheck.usage,
        },
      }, { status: 403 });
    }

    // 5. Rate limiting - 20 requests per minute for chat (additional protection)
    const rateLimitResult = await checkRateLimit(user.id, 'chat:message', {
      max: 20,
      window: 60, // 60 seconds
    });

    if (!rateLimitResult.allowed) {
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${rateLimitResult.reset_in_seconds} seconds.`
      );
    }

    // 5. Get student and creator IDs
    // IMPORTANT: creator_id must come from the student's enrollment for multi-tenant isolation
    const studentId = user.id;

    // Get creator_id from request body or from active enrollment
    let creatorId = body.creator_id;

    if (!creatorId) {
      // If not provided, get from student's enrollments
      const { getStudentEnrollments } = await import('@/lib/supabase/ragHelpers');
      const enrollments = await getStudentEnrollments(studentId);

      if (enrollments.length === 0) {
        throw new ValidationError('Student is not enrolled with any creator');
      }

      // Use the first active enrollment if not specified
      const activeEnrollment = enrollments.find(e => e.status === 'active');
      if (!activeEnrollment) {
        throw new ValidationError('Student has no active enrollment');
      }

      creatorId = activeEnrollment.creator_id;
    }

    // 6. Process chat with performance measurement
    const response = await measureAsync(
      'chat_processing',
      async () => await chatWithSession(
        message,
        studentId,
        creatorId,
        session_id,
        context_type
      )
    );

    // 7. Increment chat usage for tier limits
    let usageInfo;
    try {
      usageInfo = await incrementChatUsage(user.id);
      logInfo('Chat usage incremented', {
        userId: user.id,
        tier: usageInfo.tier,
        remaining: usageInfo.remaining,
        upgrade_required: usageInfo.upgrade_required,
      });
    } catch (error) {
      // If this fails, log but don't fail the request
      logError('Failed to increment chat usage', { error, userId: user.id });
    }

    // 8. Award CHRONOS tokens for asking a question
    let chronosBalance: number | undefined;
    try {
      const rewardResult = await awardChatMessage(
        studentId,
        creatorId,
        response.message_id
      );
      chronosBalance = rewardResult.balance;
    } catch (error) {
      // Non-critical error - log but don't fail the request
      logError('Failed to award chat tokens', { error, userId: user.id });
    }

    // 9. Log success
    const duration = Date.now() - startTime;
    logInfo('Chat request completed', {
      userId: user.id,
      sessionId: response.session_id,
      duration,
      confidence: response.confidence,
      chronosAwarded: chronosBalance !== undefined,
      usageTracked: usageInfo !== undefined,
    });

    // 10. Return response with usage and reward info
    const chatResponse: ChatResponse = {
      message_id: response.message_id,
      content: response.answer,
      video_references: response.video_references,
      session_id: response.session_id,
    };

    return NextResponse.json<APIResponse<ChatResponse>>({
      success: true,
      data: chatResponse,
      meta: {
        creator_id: creatorId, // Multi-tenant: which creator's content was used
        ...(usageInfo ? {
          usage: {
            tier: usageInfo.tier,
            remaining: usageInfo.remaining,
            is_free_tier: usageInfo.is_free_tier,
            upgrade_required: usageInfo.upgrade_required,
            message: formatUsageMessage(usageInfo),
          },
        } : {}),
        ...(chronosBalance !== undefined ? {
          chronos_awarded: 10,
          chronos_balance: chronosBalance,
        } : {}),
      },
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logError('Chat request failed', { error, duration });

    // Convert error to API response
    const apiResponse = errorToAPIResponse(error);
    const statusCode = getErrorStatusCode(error);

    return NextResponse.json<APIResponse>(apiResponse, { status: statusCode });
  }
}

/**
 * GET /api/chat - Get list of chat sessions for current user
 */
export async function GET(request: NextRequest) {
  try {
    logAPIRequest('GET', '/api/chat', {});

    // 1. Authenticate user
    const user = await getUser();
    if (!user) {
      throw new AuthenticationError('Not authenticated');
    }

    // 2. Get chat sessions for student
    const { chatService } = await import('@/lib/rag/chat-service');
    const sessions = await chatService.getStudentSessions(user.id, 20);

    // 3. Return sessions
    return NextResponse.json<APIResponse>({
      success: true,
      data: { sessions },
    });

  } catch (error) {
    logError('Failed to fetch chat sessions', { error });

    const apiResponse = errorToAPIResponse(error);
    const statusCode = getErrorStatusCode(error);

    return NextResponse.json<APIResponse>(apiResponse, { status: statusCode });
  }
}
