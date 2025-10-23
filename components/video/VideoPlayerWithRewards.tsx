/**
 * VideoPlayerWithRewards Component
 * Wrapper around VideoPlayer that integrates CHRONOS token rewards
 * Awards tokens on completion and shows reward notification
 */

'use client';

import React, { useState, useCallback } from 'react';
import { VideoPlayer, VideoPlayerProps } from './VideoPlayer';
import { showRewardToast } from '@/components/student/RewardNotification';
import { markVideoComplete, updateVideoProgress } from '@/lib/video/progressTracker';
import { REWARD_AMOUNTS } from '@/lib/chronos/rewardEngine';

interface VideoPlayerWithRewardsProps extends VideoPlayerProps {
  studentId: string;
  creatorId?: string;
}

export const VideoPlayerWithRewards: React.FC<VideoPlayerWithRewardsProps> = ({
  studentId,
  creatorId,
  videoId,
  onProgress,
  onComplete,
  ...videoPlayerProps
}) => {
  const [hasRewarded, setHasRewarded] = useState(false);

  // Handle progress updates
  const handleProgress = useCallback(
    async (percentage: number) => {
      // Call original onProgress if provided
      onProgress?.(percentage);

      // Update progress in database
      try {
        await updateVideoProgress(studentId, videoId, percentage);
      } catch (error) {
        console.error('Failed to update video progress:', error);
      }
    },
    [studentId, videoId, onProgress]
  );

  // Handle video completion
  const handleComplete = useCallback(async () => {
    // Call original onComplete if provided
    onComplete?.();

    // Award tokens if not already rewarded
    if (!hasRewarded) {
      try {
        const result = await markVideoComplete(studentId, videoId, creatorId);

        if (result.success && !result.error) {
          setHasRewarded(true);

          // Show reward notification
          showRewardToast(REWARD_AMOUNTS.VIDEO_COMPLETION, 'video_completion');

          // Show streak notification if milestone reached
          if (result.currentStreak && [7, 30, 100].includes(result.currentStreak)) {
            setTimeout(() => {
              showRewardToast(REWARD_AMOUNTS.DAILY_STREAK, 'daily_streak');
            }, 2000);
          }
        } else if (result.error === 'Already completed today') {
          // Silently ignore - already rewarded
          setHasRewarded(true);
        }
      } catch (error) {
        console.error('Failed to award video completion:', error);
      }
    }
  }, [studentId, videoId, creatorId, hasRewarded, onComplete]);

  return (
    <VideoPlayer
      {...videoPlayerProps}
      videoId={videoId}
      onProgress={handleProgress}
      onComplete={handleComplete}
    />
  );
};

export default VideoPlayerWithRewards;
