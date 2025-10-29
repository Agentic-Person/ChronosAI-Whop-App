import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/courses
 * List all courses for a creator
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const creatorId = searchParams.get('creatorId');

    if (!creatorId) {
      // For dev, use default creator
      const defaultCreatorId = '00000000-0000-0000-0000-000000000001';
      const supabase = createAdminClient();

      const { data: courses, error } = await supabase
        .from('courses')
        .select('*')
        .eq('creator_id', defaultCreatorId)
        .order('order_index', { ascending: true });

      if (error) throw error;

      return NextResponse.json(courses || []);
    }

    const supabase = createAdminClient();

    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .eq('creator_id', creatorId)
      .order('order_index', { ascending: true });

    if (error) throw error;

    return NextResponse.json(courses || []);
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/courses
 * Create a new course
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, creatorId, thumbnailUrl } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Course title is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get the next order index
    const { data: existingCourses } = await supabase
      .from('courses')
      .select('order_index')
      .eq('creator_id', creatorId || '00000000-0000-0000-0000-000000000001')
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrderIndex = existingCourses && existingCourses.length > 0
      ? (existingCourses[0].order_index || 0) + 1
      : 1;

    const { data: course, error } = await supabase
      .from('courses')
      .insert({
        title,
        description: description || '',
        creator_id: creatorId || '00000000-0000-0000-0000-000000000001',
        thumbnail_url: thumbnailUrl,
        order_index: nextOrderIndex,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(course);
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/courses
 * Update a course
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, description, thumbnailUrl, isActive, orderIndex } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (thumbnailUrl !== undefined) updateData.thumbnail_url = thumbnailUrl;
    if (isActive !== undefined) updateData.is_active = isActive;
    if (orderIndex !== undefined) updateData.order_index = orderIndex;

    const { data: course, error } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(course);
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json(
      { error: 'Failed to update course' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/courses
 * Delete a course
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('id');

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if course has videos
    const { data: videos, error: videoError } = await supabase
      .from('videos')
      .select('id')
      .eq('course_id', courseId)
      .limit(1);

    if (videoError) throw videoError;

    if (videos && videos.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete course with videos. Please move or delete videos first.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json(
      { error: 'Failed to delete course' },
      { status: 500 }
    );
  }
}