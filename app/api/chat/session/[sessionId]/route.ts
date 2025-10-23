/**
 * Chat Session Management API
 * DELETE /api/chat/session/[sessionId] - Delete a chat session
 */

import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@/lib/rag/chat-service';
import { getUser } from '@/lib/utils/supabase-client';
import {
  AuthenticationError,
  ValidationError,
  RecordNotFoundError,
  getErrorStatusCode,
  errorToAPIResponse,
} from '@/lib/infrastructure/errors';
import { logAPIRequest, logInfo, logError } from '@/lib/infrastructure/monitoring/logger';
import { APIResponse } from '@/types/api';

interface RouteContext {
  params: {
    sessionId: string;
  };
}

/**
 * DELETE - Delete a chat session and all its messages
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { sessionId } = context.params;

    logAPIRequest('DELETE', `/api/chat/session/${sessionId}`, {});

    // 1. Authenticate user
    const user = await getUser();
    if (!user) {
      throw new AuthenticationError('Not authenticated');
    }

    // 2. Validate session ID
    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    // 3. Get session to verify ownership
    const session = await chatService.getSession(sessionId);

    // 4. Verify the user owns this session
    if (session.student_id !== user.id) {
      throw new AuthenticationError('You do not have permission to delete this session');
    }

    // 5. Delete the session (messages will cascade delete)
    await chatService.deleteSession(sessionId);

    logInfo('Chat session deleted', { sessionId, userId: user.id });

    return NextResponse.json<APIResponse>({
      success: true,
      data: { message: 'Session deleted successfully' },
    });

  } catch (error) {
    logError('Failed to delete chat session', { error });

    const apiResponse = errorToAPIResponse(error);
    const statusCode = getErrorStatusCode(error);

    return NextResponse.json<APIResponse>(apiResponse, { status: statusCode });
  }
}

/**
 * PATCH - Update chat session (e.g., rename title)
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { sessionId } = context.params;

    logAPIRequest('PATCH', `/api/chat/session/${sessionId}`, {});

    // 1. Authenticate user
    const user = await getUser();
    if (!user) {
      throw new AuthenticationError('Not authenticated');
    }

    // 2. Validate session ID
    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    // 3. Parse request body
    const body = await request.json();
    const { title } = body;

    if (!title || title.trim().length === 0) {
      throw new ValidationError('Title is required');
    }

    if (title.length > 100) {
      throw new ValidationError('Title too long (max 100 characters)');
    }

    // 4. Get session to verify ownership
    const session = await chatService.getSession(sessionId);

    // 5. Verify the user owns this session
    if (session.student_id !== user.id) {
      throw new AuthenticationError('You do not have permission to update this session');
    }

    // 6. Update session title
    await chatService.updateSessionTitle(sessionId, title.trim());

    logInfo('Chat session updated', { sessionId, userId: user.id, newTitle: title });

    return NextResponse.json<APIResponse>({
      success: true,
      data: { message: 'Session updated successfully' },
    });

  } catch (error) {
    logError('Failed to update chat session', { error });

    const apiResponse = errorToAPIResponse(error);
    const statusCode = getErrorStatusCode(error);

    return NextResponse.json<APIResponse>(apiResponse, { status: statusCode });
  }
}
