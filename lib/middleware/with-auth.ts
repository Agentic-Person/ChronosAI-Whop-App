/**
 * Authentication Middleware
 * Enforces creator authentication on protected API routes
 *
 * SECURITY: Fixes VULN-001 and VULN-002 by enforcing proper authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withInfrastructure, MiddlewareOptions, InfrastructureRequest } from '@/lib/infrastructure/middleware/with-infrastructure';
import { AuthenticationError } from '@/lib/infrastructure/errors';
import { logInfo, logWarning } from '@/lib/infrastructure/monitoring/logger';

export interface Creator {
  id: string;
  whop_user_id: string;
  email: string | null;
  company_name: string;
  subscription_tier: string;
  membership_valid: boolean;
  current_plan: string;
  created_at: string;
  updated_at: string;
}

export interface AuthenticatedRequest extends InfrastructureRequest {
  creator: Creator;
  creatorId: string;
}

/**
 * Middleware that requires creator authentication
 *
 * Usage:
 * ```typescript
 * export const POST = withCreatorAuth(async (req, creator) => {
 *   // creator.id is guaranteed to be valid here
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withCreatorAuth(
  handler: (req: AuthenticatedRequest, creator: Creator) => Promise<NextResponse>,
  options?: MiddlewareOptions
) {
  return withInfrastructure(async (req: InfrastructureRequest) => {
    const supabase = createClient();

    // 1. Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logWarning('Unauthenticated request to protected route', {
        path: new URL(req.url).pathname,
        requestId: req.requestId,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required. Please log in.',
          },
        },
        { status: 401 }
      );
    }

    // 2. Get creator record from whop_user_id
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('*')
      .eq('whop_user_id', user.id)
      .single();

    if (creatorError || !creator) {
      logWarning('Creator account not found for authenticated user', {
        userId: user.id,
        error: creatorError?.message,
        requestId: req.requestId,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CREATOR_ACCOUNT_REQUIRED',
            message: 'Creator account not found. Please complete onboarding.',
          },
        },
        { status: 403 }
      );
    }

    // 3. Validate membership is active
    if (!creator.membership_valid) {
      logWarning('Inactive membership accessing protected route', {
        creatorId: creator.id,
        requestId: req.requestId,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MEMBERSHIP_INACTIVE',
            message: 'Your membership is not active. Please update your subscription.',
          },
        },
        { status: 403 }
      );
    }

    // 4. SECURITY: Reject any x-creator-id header manipulation
    const headerCreatorId = req.headers.get('x-creator-id');
    if (headerCreatorId && headerCreatorId !== creator.id) {
      logWarning('Creator ID header mismatch detected', {
        authenticatedCreatorId: creator.id,
        headerCreatorId,
        requestId: req.requestId,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Creator ID mismatch. Possible security violation.',
          },
        },
        { status: 403 }
      );
    }

    // 5. Enhance request with creator info
    const authReq = req as AuthenticatedRequest;
    authReq.creator = creator;
    authReq.creatorId = creator.id;
    authReq.userId = user.id;

    logInfo('Authenticated creator request', {
      creatorId: creator.id,
      path: new URL(req.url).pathname,
      requestId: req.requestId,
    });

    // 6. Call handler with authenticated context
    return handler(authReq, creator);
  }, options);
}

/**
 * Middleware that requires student authentication
 */
export interface Student {
  id: string;
  whop_user_id: string;
  creator_id: string;
  email: string | null;
  learning_profile: any;
  created_at: string;
  updated_at: string;
}

export interface StudentAuthenticatedRequest extends InfrastructureRequest {
  student: Student;
  studentId: string;
}

export function withStudentAuth(
  handler: (req: StudentAuthenticatedRequest, student: Student) => Promise<NextResponse>,
  options?: MiddlewareOptions
) {
  return withInfrastructure(async (req: InfrastructureRequest) => {
    const supabase = createClient();

    // 1. Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required. Please log in.',
          },
        },
        { status: 401 }
      );
    }

    // 2. Get student record
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('whop_user_id', user.id)
      .single();

    if (studentError || !student) {
      logWarning('Student account not found for authenticated user', {
        userId: user.id,
        error: studentError?.message,
        requestId: req.requestId,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'STUDENT_ACCOUNT_REQUIRED',
            message: 'Student account not found.',
          },
        },
        { status: 403 }
      );
    }

    // 3. Enhance request with student info
    const authReq = req as StudentAuthenticatedRequest;
    authReq.student = student;
    authReq.studentId = student.id;
    authReq.userId = user.id;

    logInfo('Authenticated student request', {
      studentId: student.id,
      path: new URL(req.url).pathname,
      requestId: req.requestId,
    });

    return handler(authReq, student);
  }, options);
}

/**
 * Get creator ID from authenticated session
 * Use this in API routes that use service client
 */
export async function getAuthenticatedCreatorId(): Promise<string> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthenticationError('Not authenticated');
  }

  const { data: creator, error: creatorError } = await supabase
    .from('creators')
    .select('id')
    .eq('whop_user_id', user.id)
    .single();

  if (creatorError || !creator) {
    throw new AuthenticationError('Creator account not found');
  }

  return creator.id;
}

/**
 * Get student ID from authenticated session
 */
export async function getAuthenticatedStudentId(): Promise<string> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthenticationError('Not authenticated');
  }

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id')
    .eq('whop_user_id', user.id)
    .single();

  if (studentError || !student) {
    throw new AuthenticationError('Student account not found');
  }

  return student.id;
}

/**
 * Validate that creator owns a resource
 * Use this for additional authorization checks
 */
export async function validateCreatorOwnership(
  creatorId: string,
  resourceId: string,
  resourceType: 'video' | 'chat_session' | 'student'
): Promise<boolean> {
  const supabase = createClient();

  let query;
  switch (resourceType) {
    case 'video':
      query = supabase
        .from('videos')
        .select('id')
        .eq('id', resourceId)
        .eq('creator_id', creatorId)
        .single();
      break;
    case 'chat_session':
      query = supabase
        .from('chat_sessions')
        .select('id')
        .eq('id', resourceId)
        .eq('creator_id', creatorId)
        .single();
      break;
    case 'student':
      query = supabase
        .from('students')
        .select('id')
        .eq('id', resourceId)
        .eq('creator_id', creatorId)
        .single();
      break;
    default:
      return false;
  }

  const { data, error } = await query;

  return !!data && !error;
}
