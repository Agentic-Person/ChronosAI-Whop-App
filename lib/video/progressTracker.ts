/**
 * Video Progress Tracker
 * Tracks video watch progress and awards CHRONOS tokens on completion
 */

import { createClient } from '@/lib/utils/supabase-client';
import { awardVideoCompletion } from '@/lib/chronos/rewardEngine';
import { updateStreak } from '@/lib/chronos/streakTracker';

// Threshold for considering a video "complete" (90% or 100%)
const COMPLETION_THRESHOLD = 90;

/**
 * Mark video as complete and award tokens
 * Also updates student's daily streak
 */
export async function markVideoComplete(
  studentId: string,
  videoId: string,
  creatorId?: string
): Promise<{
  success: boolean;
  balance?: number;
  streakUpdated?: boolean;
  currentStreak?: number;
  error?: string;
}> {
  const supabase = createClient();

  try {
    // Check if already completed today (prevent duplicate rewards)
    const { data: existingProgress } = await supabase
      .from('video_progress')
      .select('id, completed_at')
      .eq('student_id', studentId)
      .eq('video_id', videoId)
      .gte('progress_percentage', COMPLETION_THRESHOLD)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (existingProgress?.completed_at) {
      const completedDate = new Date(existingProgress.completed_at).toDateString();
      const today = new Date().toDateString();

      if (completedDate === today) {
        return {
          success: true,
          error: 'Already completed today',
        };
      }
    }

    // Update video progress to 100%
    const { error: progressError } = await supabase
      .from('video_progress')
      .upsert({
        student_id: studentId,
        video_id: videoId,
        progress_percentage: 100,
        completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (progressError) {
      console.error('Failed to update video progress:', progressError);
      throw new Error('Failed to update progress');
    }

    // Award CHRONOS tokens
    const rewardResult = await awardVideoCompletion(studentId, videoId, creatorId);

    // Update daily streak
    const streakResult = await updateStreak(studentId);

    return {
      success: true,
      balance: rewardResult.balance,
      streakUpdated: true,
      currentStreak: streakResult.currentStreak,
    };
  } catch (error) {
    console.error('Failed to mark video complete:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update video progress (called during playback)
 */
export async function updateVideoProgress(
  studentId: string,
  videoId: string,
  percentage: number
): Promise<void> {
  const supabase = createClient();

  // Round to nearest integer
  const roundedPercentage = Math.round(percentage);

  // Update progress in database
  await supabase.from('video_progress').upsert({
    student_id: studentId,
    video_id: videoId,
    progress_percentage: roundedPercentage,
    completed: roundedPercentage >= COMPLETION_THRESHOLD,
    completed_at:
      roundedPercentage >= COMPLETION_THRESHOLD
        ? new Date().toISOString()
        : null,
    updated_at: new Date().toISOString(),
  });

  // If just crossed completion threshold, award tokens
  if (roundedPercentage >= COMPLETION_THRESHOLD) {
    // Check if we haven't already awarded for this completion
    const { data: existing } = await supabase
      .from('video_progress')
      .select('completed_at')
      .eq('student_id', studentId)
      .eq('video_id', videoId)
      .single();

    if (!existing?.completed_at) {
      // First time completing
      await markVideoComplete(studentId, videoId);
    }
  }
}

/**
 * Get video progress for a student
 */
export async function getVideoProgress(
  studentId: string,
  videoId: string
): Promise<{
  percentage: number;
  completed: boolean;
  completedAt: string | null;
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('video_progress')
    .select('progress_percentage, completed, completed_at')
    .eq('student_id', studentId)
    .eq('video_id', videoId)
    .single();

  if (error || !data) {
    return {
      percentage: 0,
      completed: false,
      completedAt: null,
    };
  }

  return {
    percentage: data.progress_percentage || 0,
    completed: data.completed || false,
    completedAt: data.completed_at,
  };
}

/**
 * Get all video progress for a student
 */
export async function getAllVideoProgress(
  studentId: string
): Promise<
  Array<{
    videoId: string;
    percentage: number;
    completed: boolean;
    completedAt: string | null;
  }>
> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('video_progress')
    .select('video_id, progress_percentage, completed, completed_at')
    .eq('student_id', studentId);

  if (error || !data) {
    return [];
  }

  return data.map((item) => ({
    videoId: item.video_id,
    percentage: item.progress_percentage || 0,
    completed: item.completed || false,
    completedAt: item.completed_at,
  }));
}

export const ProgressTracker = {
  markVideoComplete,
  updateVideoProgress,
  getVideoProgress,
  getAllVideoProgress,
  COMPLETION_THRESHOLD,
};

export default ProgressTracker;
