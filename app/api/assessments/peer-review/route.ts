/**
 * Peer Review API Endpoint
 * GET /api/assessments/peer-review - Get assigned peer reviews
 * POST /api/assessments/peer-review - Submit a peer review
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getReviewerAssignments,
  submitPeerReview,
  PeerReviewData,
} from '@/lib/assessments';
import { getUser } from '@/lib/utils/supabase-client';
import { checkRateLimit } from '@/lib/infrastructure/rate-limiting/rate-limiter';
import {
  ValidationError,
  RateLimitError,
  AuthenticationError,
  errorToAPIResponse,
} from '@/lib/infrastructure/errors';
import { logAPIRequest, logInfo, logError } from '@/lib/infrastructure/monitoring/logger';
import { supabase } from '@/lib/utils/supabase-client';

export async function GET(request: NextRequest) {
  try {
    // 1. Log API request
    logAPIRequest('GET', '/api/assessments/peer-review', {});

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

    // 4. Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any || undefined;

    // 5. Fetch assignments
    const assignments = await getReviewerAssignments(student.id, status);

    return NextResponse.json({
      success: true,
      data: { assignments },
    });
  } catch (error) {
    logError('Failed to fetch peer review assignments', { error });
    return NextResponse.json(
      errorToAPIResponse(error),
      { status: (error as any).statusCode || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Log API request
    logAPIRequest('POST', '/api/assessments/peer-review', {});

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
    const body = await request.json();
    const { assignmentId, review }: { assignmentId: string; review: PeerReviewData } = body;

    if (!assignmentId) {
      throw new ValidationError('Assignment ID is required');
    }

    if (!review || typeof review !== 'object') {
      throw new ValidationError('Review data is required');
    }

    // 5. Verify assignment belongs to this reviewer
    const { data: assignment, error: assignmentError } = await supabase
      .from('peer_review_assignments')
      .select('id, reviewer_id, status')
      .eq('id', assignmentId)
      .single();

    if (assignmentError || !assignment) {
      throw new ValidationError('Assignment not found');
    }

    if (assignment.reviewer_id !== studentId) {
      throw new AuthenticationError('Not authorized to submit this review');
    }

    if (assignment.status === 'completed') {
      throw new ValidationError('Review already submitted');
    }

    // 6. Rate limiting - 20 reviews per day
    const rateLimitResult = await checkRateLimit(studentId, 'peer-review:submit', {
      max: 20,
      window: 86400,
    });

    if (!rateLimitResult.allowed) {
      throw new RateLimitError('Peer review submission rate limit exceeded. Try again tomorrow.');
    }

    // 7. Submit review
    logInfo('Submitting peer review', { student_id: studentId, assignment_id: assignmentId });

    await submitPeerReview(assignmentId, review);

    logInfo('Peer review submitted successfully', { assignment_id: assignmentId });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Peer review submitted successfully',
        xp_awarded: 50,
      },
    });
  } catch (error) {
    logError('Peer review submission failed', { error });
    return NextResponse.json(
      errorToAPIResponse(error),
      { status: (error as any).statusCode || 500 }
    );
  }
}
