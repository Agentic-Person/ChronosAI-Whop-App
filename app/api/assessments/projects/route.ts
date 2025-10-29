/**
 * Projects API Endpoint
 * GET /api/assessments/projects - Get student's projects
 * POST /api/assessments/projects - Create a new project
 * FEATURE GATED: PRO tier required
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createProjectFromTemplate,
  getStudentProjects,
  CreateProjectOptions,
} from '@/lib/assessments';
import { getUser } from '@/lib/utils/supabase-client';
import { createClient } from '@/lib/supabase/server';
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

export async function GET(request: NextRequest) {
  try {
    // 1. Log API request
    logAPIRequest('GET', '/api/assessments/projects', {});

    // 2. Authenticate user
    const user = await getUser();
    if (!user) {
      throw new AuthenticationError('Not authenticated');
    }

    // 3. Get student ID
    const supabase = createClient();
    const { data: student } = await supabase
      .from('students')
      .select('id, creator_id')
      .eq('whop_user_id', user.id)
      .single();

    if (!student) {
      throw new AuthenticationError('Student profile not found');
    }

    // 4. Feature gate check - PRO tier required
    const featureAccess = await checkFeatureAccess(student.creator_id, Feature.FEATURE_PROJECTS);

    if (!featureAccess.hasAccess) {
      throw new FeatureNotAvailableError(
        'Projects require PRO or ENTERPRISE plan',
        {
          feature: Feature.FEATURE_PROJECTS,
          currentPlan: featureAccess.userPlan,
          requiredPlan: featureAccess.requiredPlan,
        }
      );
    }

    // 5. Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    // 6. Fetch projects
    const projects = await getStudentProjects(student.id, status);

    return NextResponse.json({
      success: true,
      data: { projects },
    });
  } catch (error) {
    logError('Failed to fetch projects', { error });
    return NextResponse.json(
      errorToAPIResponse(error),
      { status: (error as any).statusCode || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Log API request
    logAPIRequest('POST', '/api/assessments/projects', {});

    // 2. Authenticate user
    const user = await getUser();
    if (!user) {
      throw new AuthenticationError('Not authenticated');
    }

    // 3. Get student ID
    const supabase = createClient();
    const { data: student } = await supabase
      .from('students')
      .select('id, creator_id')
      .eq('whop_user_id', user.id)
      .single();

    if (!student) {
      throw new AuthenticationError('Student profile not found');
    }

    // 4. Feature gate check - PRO tier required
    const featureAccess = await checkFeatureAccess(student.creator_id, Feature.FEATURE_PROJECTS);

    if (!featureAccess.hasAccess) {
      throw new FeatureNotAvailableError(
        'Projects require PRO or ENTERPRISE plan',
        {
          feature: Feature.FEATURE_PROJECTS,
          currentPlan: featureAccess.userPlan,
          requiredPlan: featureAccess.requiredPlan,
        }
      );
    }

    // 5. Parse and validate request body
    const body = await request.json();
    const { templateId, title, description, dueDate, customRequirements } = body;

    if (!templateId && !title) {
      throw new ValidationError('Either templateId or title is required');
    }

    // 6. Rate limiting - 20 project creations per day
    const rateLimitResult = await checkRateLimit(student.id, 'project:create', {
      max: 20,
      window: 86400, // 24 hours
    });

    if (!rateLimitResult.allowed) {
      throw new RateLimitError('Project creation rate limit exceeded. Try again tomorrow.');
    }

    // 7. Create project
    const options: CreateProjectOptions = {
      studentId: student.id,
      templateId,
      title,
      description,
      dueDate,
      customRequirements,
    };

    logInfo('Creating project', { student_id: student.id, template_id: templateId });

    const project = await createProjectFromTemplate(options);

    if (!project) {
      throw new Error('Failed to create project');
    }

    logInfo('Project created successfully', { project_id: project.id });

    return NextResponse.json({
      success: true,
      data: { project },
    });
  } catch (error) {
    logError('Project creation failed', { error });
    return NextResponse.json(
      errorToAPIResponse(error),
      { status: (error as any).statusCode || 500 }
    );
  }
}
