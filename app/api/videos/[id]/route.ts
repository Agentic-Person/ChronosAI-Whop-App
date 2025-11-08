/**
 * Video API Endpoint
 * PATCH /api/videos/[id] - Update video details
 * DELETE /api/videos/[id] - Delete video
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedCreatorDev } from '@/lib/whop/middleware';

/**
 * PATCH /api/videos/[id]
 * Update video metadata
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    // Get authenticated creator
    const { creator, error: authError } = await getAuthenticatedCreatorDev(req);
    if (authError) return authError;
    if (!creator) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    // Verify video belongs to creator
    const { data: existingVideo, error: fetchError } = await supabase
      .from('videos')
      .select('creator_id, course_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingVideo) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Video not found' },
        { status: 404 }
      );
    }

    if (existingVideo.creator_id !== creator.creatorId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied' },
        { status: 403 }
      );
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.courseId !== undefined) updateData.course_id = body.courseId;
    if (body.thumbnailUrl !== undefined) updateData.thumbnail_url = body.thumbnailUrl;
    if (body.orderIndex !== undefined) updateData.order_index = body.orderIndex;

    // Update video
    const { data: updatedVideo, error: updateError } = await supabase
      .from('videos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating video:', updateError);
      throw updateError;
    }

    return NextResponse.json(updatedVideo);
  } catch (error) {
    console.error('Error in PATCH /api/videos/[id]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update video' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/videos/[id]
 * Delete a video
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get authenticated creator
    const { creator, error: authError } = await getAuthenticatedCreatorDev(req);
    if (authError) return authError;
    if (!creator) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    // Verify video belongs to creator
    const { data: existingVideo, error: fetchError } = await supabase
      .from('videos')
      .select('creator_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingVideo) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Video not found' },
        { status: 404 }
      );
    }

    if (existingVideo.creator_id !== creator.creatorId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied' },
        { status: 403 }
      );
    }

    // Delete video
    const { error: deleteError } = await supabase
      .from('videos')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting video:', deleteError);
      throw deleteError;
    }

    return NextResponse.json({ success: true, message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/videos/[id]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to delete video' },
      { status: 500 }
    );
  }
}
