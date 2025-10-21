/**
 * Study Groups API
 * ENTERPRISE tier feature - Study group management
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/utils/supabase-client';
import { withFeatureGate } from '@/lib/middleware/feature-gate';
import { Feature } from '@/lib/features/types';
import { studyGroupService } from '@/lib/study-buddy/study-group-service';

/**
 * POST /api/study-buddy/groups
 * Create a new study group
 */
export const POST = withFeatureGate(
  { feature: Feature.FEATURE_STUDY_GROUPS },
  async (request: NextRequest) => {
    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!student) {
        return NextResponse.json(
          { error: 'Student not found' },
          { status: 404 }
        );
      }

      const body = await request.json();

      const result = await studyGroupService.createGroup(student.id, body);

      return NextResponse.json(result);
    } catch (error: any) {
      console.error('Create group error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create group' },
        { status: 500 }
      );
    }
  }
);

/**
 * GET /api/study-buddy/groups
 * Discover study groups or get my groups
 */
export const GET = withFeatureGate(
  { feature: Feature.FEATURE_STUDY_GROUPS },
  async (request: NextRequest) => {
    try {
      const supabase = createClient();
      const { searchParams } = new URL(request.url);

      const action = searchParams.get('action'); // 'discover' or 'my-groups'
      const type = searchParams.get('type');
      const focusModule = searchParams.get('focusModule');
      const search = searchParams.get('search');

      if (action === 'my-groups') {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!student) {
          return NextResponse.json(
            { error: 'Student not found' },
            { status: 404 }
          );
        }

        const groups = await studyGroupService.getMyGroups(student.id);
        return NextResponse.json({ success: true, groups });
      }

      // Discover groups
      const groups = await studyGroupService.discoverGroups({
        type: type as any,
        focusModule: focusModule ? parseInt(focusModule) : undefined,
        search: search || undefined,
      });

      return NextResponse.json({ success: true, groups });
    } catch (error: any) {
      console.error('Get groups error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to get groups' },
        { status: 500 }
      );
    }
  }
);
