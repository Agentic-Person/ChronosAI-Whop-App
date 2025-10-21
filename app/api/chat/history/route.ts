/**
 * Chat History API Endpoint
 * GET /api/chat/history?session_id=xxx&limit=50
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
import { logAPIRequest, logError } from '@/lib/infrastructure/monitoring/logger';

export async function GET(request: NextRequest) {
  try {
    logAPIRequest('GET', '/api/chat/history', {});

    // 1. Authenticate user
    const user = await getUser();
    if (!user) {
      throw new AuthenticationError('Not authenticated');
    }

    // 2. Get query parameters
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    const limitStr = searchParams.get('limit');
    const limit = limitStr ? parseInt(limitStr, 10) : 50;

    // 3. Validate parameters
    if (!sessionId) {
      throw new ValidationError('session_id is required');
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      throw new ValidationError('limit must be between 1 and 100');
    }

    // 4. Verify session belongs to user
    const session = await chatService.getSession(sessionId);
    if (session.student_id !== user.id) {
      throw new AuthenticationError('Unauthorized access to session');
    }

    // 5. Fetch message history
    const messages = await chatService.getHistory(sessionId, limit);

    // 6. Return messages
    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        session_id: sessionId,
        messages,
        total: messages.length,
      },
    });

  } catch (error) {
    logError('Failed to fetch chat history', { error });

    const apiResponse = errorToAPIResponse(error);
    const statusCode = getErrorStatusCode(error);

    return NextResponse.json<APIResponse>(apiResponse, { status: statusCode });
  }
}
