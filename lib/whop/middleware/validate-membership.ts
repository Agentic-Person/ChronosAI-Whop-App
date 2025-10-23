/**
 * Whop Membership Validation Middleware
 *
 * Validates Whop membership status using MCP tools
 * Agent: Agent 14 (Whop Integration Specialist)
 * Policy: MCP-First (Mandatory)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  validateMembership,
  isMembershipActive,
  getMembership,
  type MembershipTier,
} from '@/lib/whop/mcp';

export interface WhopAuthContext {
  userId: string;
  userType: 'creator' | 'student';
  creatorId?: string;
  membershipId: string;
  tier: MembershipTier;
  isActive: boolean;
}

/**
 * Validate Whop membership from request
 *
 * ✅ Uses MCP tools for all Whop API calls
 */
export async function validateWhopMembership(
  req: NextRequest
): Promise<WhopAuthContext | null> {
  try {
    const supabase = createClient();

    // Get current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return null;
    }

    const userId = session.user.id;

    // Check if user is a creator
    const { data: creator } = await supabase
      .from('creators')
      .select('id, whop_company_id, membership_tier, whop_data')
      .eq('id', userId)
      .single();

    if (creator) {
      // User is a creator
      return {
        userId: creator.id,
        userType: 'creator',
        creatorId: creator.id,
        membershipId: '', // Creators don't have membership IDs
        tier: creator.membership_tier as MembershipTier,
        isActive: true, // Creators are always active
      };
    }

    // Check if user is a student
    const { data: student } = await supabase
      .from('students')
      .select('id, creator_id, whop_membership_id, membership_tier, membership_status')
      .eq('id', userId)
      .single();

    if (!student || !student.whop_membership_id) {
      return null;
    }

    // ✅ MCP-FIRST: Validate membership via MCP
    const membershipValidation = await validateMembership(
      student.whop_membership_id
    );

    // Update student record with latest status
    if (membershipValidation.status !== student.membership_status) {
      await supabase
        .from('students')
        .update({
          membership_status: membershipValidation.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', student.id);
    }

    return {
      userId: student.id,
      userType: 'student',
      creatorId: student.creator_id,
      membershipId: student.whop_membership_id,
      tier: (membershipValidation.tier || student.membership_tier) as MembershipTier,
      isActive: membershipValidation.valid,
    };
  } catch (error) {
    console.error('Membership validation error:', error);
    return null;
  }
}

/**
 * Middleware wrapper for protected routes
 *
 * Usage:
 * ```ts
 * export const GET = withWhopAuth(async (req, context) => {
 *   // context.user is populated with WhopAuthContext
 *   return NextResponse.json({ ... });
 * });
 * ```
 */
export function withWhopAuth<T = any>(
  handler: (
    req: NextRequest,
    context: { user: WhopAuthContext; params?: T }
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: { params?: T }) => {
    const user = await validateWhopMembership(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing membership' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Forbidden: Membership is not active' },
        { status: 403 }
      );
    }

    return handler(req, { user, params: context?.params });
  };
}

/**
 * Middleware that requires specific membership tier
 *
 * Usage:
 * ```ts
 * export const GET = withWhopTier('PRO', async (req, context) => {
 *   // Only PRO and ENTERPRISE users can access
 *   return NextResponse.json({ ... });
 * });
 * ```
 */
export function withWhopTier<T = any>(
  requiredTier: MembershipTier | MembershipTier[],
  handler: (
    req: NextRequest,
    context: { user: WhopAuthContext; params?: T }
  ) => Promise<NextResponse>
) {
  const allowedTiers = Array.isArray(requiredTier) ? requiredTier : [requiredTier];

  // Tier hierarchy: BASIC < PRO < ENTERPRISE
  const tierHierarchy: Record<MembershipTier, number> = {
    BASIC: 1,
    PRO: 2,
    ENTERPRISE: 3,
  };

  return withWhopAuth<T>(async (req, context) => {
    const userTierLevel = tierHierarchy[context.user.tier];
    const requiredLevel = Math.min(...allowedTiers.map(t => tierHierarchy[t]));

    if (userTierLevel < requiredLevel) {
      return NextResponse.json(
        {
          error: 'Forbidden: Insufficient membership tier',
          required: allowedTiers,
          current: context.user.tier,
        },
        { status: 403 }
      );
    }

    return handler(req, context);
  });
}

/**
 * Middleware for creator-only routes
 */
export function withCreatorAuth<T = any>(
  handler: (
    req: NextRequest,
    context: { user: WhopAuthContext; params?: T }
  ) => Promise<NextResponse>
) {
  return withWhopAuth<T>(async (req, context) => {
    if (context.user.userType !== 'creator') {
      return NextResponse.json(
        { error: 'Forbidden: Creator access only' },
        { status: 403 }
      );
    }

    return handler(req, context);
  });
}

/**
 * Middleware for student-only routes
 */
export function withStudentAuth<T = any>(
  handler: (
    req: NextRequest,
    context: { user: WhopAuthContext; params?: T }
  ) => Promise<NextResponse>
) {
  return withWhopAuth<T>(async (req, context) => {
    if (context.user.userType !== 'student') {
      return NextResponse.json(
        { error: 'Forbidden: Student access only' },
        { status: 403 }
      );
    }

    return handler(req, context);
  });
}
