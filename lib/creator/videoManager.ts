/**
 * Video Manager Helper Functions
 * Simplified video management for creator dashboard
 */

import { createClient } from '@/lib/utils/supabase-client';
import { createAdminClient } from '@/lib/supabase/admin';
import { Video } from '@/types/database';

export interface VideoWithStats extends Video {
  views: number;
  completions: number;
  avgCompletion: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * Update video metadata (title, description)
 */
export async function updateVideoMetadata(
  videoId: string,
  updates: Partial<Pick<Video, 'title' | 'description'>>
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('videos')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', videoId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update video: ${error.message}`);
  }

  return data;
}

/**
 * Delete video and associated data
 */
export async function deleteVideo(videoId: string) {
  const supabase = createClient();

  // First, get video details for storage cleanup
  const { data: video } = await supabase
    .from('videos')
    .select('video_url, storage_path')
    .eq('id', videoId)
    .single();

  // Delete video chunks first (cascade)
  await supabase.from('video_chunks').delete().eq('video_id', videoId);

  // Delete video transcriptions
  await supabase.from('video_transcriptions').delete().eq('video_id', videoId);

  // Delete video progress records
  await supabase.from('video_progress').delete().eq('video_id', videoId);

  // Delete the video
  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('id', videoId);

  if (error) {
    throw new Error(`Failed to delete video: ${error.message}`);
  }

  // Delete from storage
  if (video) {
    try {
      const { deleteVideoFromStorage, extractStoragePathFromUrl } = await import('@/lib/video/storage-cleanup');
      const storagePath = video.storage_path || extractStoragePathFromUrl(video.video_url);

      if (storagePath) {
        await deleteVideoFromStorage(storagePath);
      }
    } catch (storageError) {
      // Log but don't fail - database deletion already succeeded
      console.error('Failed to delete video from storage:', storageError);
    }
  }
}

/**
 * Retry processing for a failed video
 */
export async function retryProcessing(videoId: string) {
  const supabase = createClient();

  // Reset transcript processing status
  const { error } = await supabase
    .from('videos')
    .update({
      transcript_processed: false,
      transcript: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', videoId);

  if (error) {
    throw new Error(`Failed to retry processing: ${error.message}`);
  }

  // TODO: Trigger video processing pipeline
  // await triggerVideoProcessing(videoId);
}

/**
 * Get all videos for a creator with stats
 */
export async function getCreatorVideosWithStats(creatorId: string, courseId?: string | null): Promise<VideoWithStats[]> {
  // Use admin client to bypass RLS for dev testing
  const supabase = createAdminClient();

  let query = supabase
    .from('videos')
    .select(`
      *,
      video_progress (
        id,
        completed,
        completion_percentage
      ),
      courses:course_id (
        id,
        title
      )
    `)
    .eq('creator_id', creatorId)
    // CRITICAL: Only show this creator's content, never demo content from other creators
    .or(`is_demo.is.null,and(is_demo.eq.false),and(is_demo.eq.true,creator_id.eq.${creatorId})`);

  // Filter by course if provided
  if (courseId) {
    query = query.eq('course_id', courseId);
  }

  const { data: videos, error } = await query
    .order('created_at', { ascending: false });

  console.log('🔍 DATABASE QUERY RESULT:');
  console.log('Videos found:', videos?.length || 0);
  console.log('Error:', error);
  if (videos) {
    console.log('Video titles:', videos.map(v => v.title));
    console.log('Video URLs:', videos.map(v => ({ id: v.id, url: v.video_url || v.url, duration: v.duration })));
  }

  if (error) {
    throw new Error(`Failed to fetch videos: ${error.message}`);
  }

  if (!videos) return [];

  return videos.map((video: any) => {
    const progressRecords = video.video_progress || [];
    const views = progressRecords.length;
    const completions = progressRecords.filter((p: any) => p.completed).length;
    const avgCompletion = views > 0
      ? Math.round(progressRecords.reduce((sum: number, p: any) => sum + (p.completion_percentage || 0), 0) / views)
      : 0;

    // Determine status
    let status: 'pending' | 'processing' | 'completed' | 'failed' = 'completed';
    if (!video.transcript_processed) {
      status = video.transcript ? 'processing' : 'pending';
    }

    return {
      ...video,
      views,
      completions,
      avgCompletion,
      status,
    };
  });
}

/**
 * Search videos by title or description
 */
export async function searchVideos(creatorId: string, query: string): Promise<Video[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('creator_id', creatorId)
    // Filter out demo content from other creators
    .or(`is_demo.is.null,and(is_demo.eq.false),and(is_demo.eq.true,creator_id.eq.${creatorId})`)
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to search videos: ${error.message}`);
  }

  return data || [];
}

/**
 * Filter videos by status
 */
export async function filterVideosByStatus(
  creatorId: string,
  status: 'all' | 'processing' | 'completed' | 'failed'
): Promise<Video[]> {
  const supabase = createClient();

  let query = supabase
    .from('videos')
    .select('*')
    .eq('creator_id', creatorId);

  if (status === 'completed') {
    query = query.eq('transcript_processed', true);
  } else if (status === 'processing') {
    query = query.eq('transcript_processed', false);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to filter videos: ${error.message}`);
  }

  return data || [];
}

/**
 * Get video by ID
 */
export async function getVideoById(videoId: string): Promise<Video | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Bulk delete videos
 */
export async function bulkDeleteVideos(videoIds: string[]) {
  const supabase = createClient();

  // First, get all video storage paths
  const { data: videos } = await supabase
    .from('videos')
    .select('video_url, storage_path')
    .in('id', videoIds);

  // Delete video chunks
  await supabase.from('video_chunks').delete().in('video_id', videoIds);

  // Delete video transcriptions
  await supabase.from('video_transcriptions').delete().in('video_id', videoIds);

  // Delete video progress
  await supabase.from('video_progress').delete().in('video_id', videoIds);

  // Delete videos
  const { error } = await supabase
    .from('videos')
    .delete()
    .in('id', videoIds);

  if (error) {
    throw new Error(`Failed to bulk delete videos: ${error.message}`);
  }

  // Delete from storage
  if (videos && videos.length > 0) {
    try {
      const { bulkDeleteVideosFromStorage, extractStoragePathFromUrl } = await import('@/lib/video/storage-cleanup');

      const storagePaths = videos
        .map(v => v.storage_path || extractStoragePathFromUrl(v.video_url))
        .filter(Boolean) as string[];

      if (storagePaths.length > 0) {
        const result = await bulkDeleteVideosFromStorage(storagePaths);
        console.log('Storage cleanup result:', result);
      }
    } catch (storageError) {
      // Log but don't fail - database deletion already succeeded
      console.error('Failed to delete videos from storage:', storageError);
    }
  }
}

/**
 * Get video processing status
 */
export async function getVideoProcessingStatus(videoId: string) {
  const supabase = createClient();

  const { data: video } = await supabase
    .from('videos')
    .select('transcript_processed, transcript')
    .eq('id', videoId)
    .single();

  if (!video) return null;

  // Check for chunks
  const { count: chunkCount } = await supabase
    .from('video_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('video_id', videoId);

  let status: 'pending' | 'transcribing' | 'chunking' | 'embedding' | 'completed' | 'failed' = 'pending';
  let progress = 0;

  if (video.transcript_processed && chunkCount && chunkCount > 0) {
    status = 'completed';
    progress = 100;
  } else if (chunkCount && chunkCount > 0) {
    status = 'embedding';
    progress = 75;
  } else if (video.transcript) {
    status = 'chunking';
    progress = 50;
  } else {
    status = 'transcribing';
    progress = 25;
  }

  return {
    status,
    progress,
    chunkCount: chunkCount || 0,
    hasTranscript: !!video.transcript,
  };
}
