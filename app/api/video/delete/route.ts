import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('id');

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Delete video chunks first (foreign key constraint)
    const { error: chunksError } = await supabase
      .from('video_chunks')
      .delete()
      .eq('video_id', videoId);

    if (chunksError) {
      console.error('Error deleting video chunks:', chunksError);
      // Continue anyway - chunks might not exist
    }

    // Delete the video
    const { error: videoError } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId);

    if (videoError) {
      console.error('Error deleting video:', videoError);
      return NextResponse.json(
        { error: 'Failed to delete video', details: videoError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Video deleted successfully',
    });

  } catch (error) {
    console.error('Delete video error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
