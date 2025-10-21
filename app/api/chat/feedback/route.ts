/**
 * Chat Feedback API Endpoint
 * POST /api/chat/feedback - Submit thumbs up/down feedback on AI response
 */

import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@/lib/rag/chat-service';
import { getUser } from '@/lib/utils/supabase-client';
import { APIResponse } from '@/types/api';
import {
  ValidationError,
  AuthenticationError,
  getErrorStatusCode,
  errorToAPIResponse,
} from '@/lib/infrastructure/errors';
import { logAPIRequest, logInfo, logError } from '@/lib/infrastructure/monitoring/logger';

interface FeedbackRequest {
  message_id: string;
  feedback: 'positive' | 'negative';
  comment?: string;
}

export async function POST(request: NextRequest) {
  try {
    logAPIRequest('POST', '/api/chat/feedback', {});

    // 1. Authenticate user
    const user = await getUser();
    if (!user) {
      throw new AuthenticationError('Not authenticated');
    }

    // 2. Parse request body
    const body: FeedbackRequest = await request.json();
    const { message_id, feedback, comment } = body;

    // 3. Validate input
    if (!message_id) {
      throw new ValidationError('message_id is required');
    }

    if (!feedback || !['positive', 'negative'].includes(feedback)) {
      throw new ValidationError('feedback must be "positive" or "negative"');
    }

    if (comment && comment.length > 500) {
      throw new ValidationError('comment too long (max 500 characters)');
    }

    // 4. Update feedback
    await chatService.updateFeedback(message_id, feedback);

    // 5. Log feedback for analytics
    logInfo('Chat feedback submitted', {
      userId: user.id,
      messageId: message_id,
      feedback,
      hasComment: !!comment,
    });

    // TODO: If comment provided, store it separately for review
    // This could be useful for improving AI quality

    // 6. Return success
    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        message: 'Feedback recorded successfully',
        message_id,
        feedback,
      },
    });

  } catch (error) {
    logError('Failed to submit feedback', { error });

    const apiResponse = errorToAPIResponse(error);
    const statusCode = getErrorStatusCode(error);

    return NextResponse.json<APIResponse>(apiResponse, { status: statusCode });
  }
}
