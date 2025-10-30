/**
 * Trial Management Service
 *
 * Handles 7-day trial lifecycle:
 * - Starting trials on Whop install
 * - Provisioning demo content
 * - Checking trial expiration
 * - Converting trials to paid
 * - Removing demo content after upgrade
 */

import { createClient } from '@/lib/utils/supabase-client';
import { createAdminClient } from '@/lib/supabase/admin';
import { PlanTier } from '@/lib/features/types';
import { TrialStatus, TrialInfo, TrialConversionResult } from './types';
import { logInfo, logError } from '@/lib/infrastructure/monitoring/logger';

// System account that holds the master copy of demo content
const SYSTEM_DEMO_CREATOR_ID = '00000000-0000-0000-0000-000000000001';

// Trial duration in days
const TRIAL_DURATION_DAYS = 7;

export class TrialManager {
  /**
   * Start a 7-day trial for a new creator
   * Called when creator installs app from Whop
   */
  static async startTrial(creatorId: string): Promise<void> {
    try {
      const supabase = createAdminClient();

      const startedAt = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + TRIAL_DURATION_DAYS);

      const { error } = await supabase
        .from('creators')
        .update({
          trial_started_at: startedAt.toISOString(),
          trial_expires_at: expiresAt.toISOString(),
          trial_status: TrialStatus.ACTIVE,
          has_demo_content: false, // Will be set to true after provisioning
        })
        .eq('id', creatorId);

      if (error) {
        throw error;
      }

      logInfo('Trial started', {
        creator_id: creatorId,
        expires_at: expiresAt.toISOString(),
      });
    } catch (error) {
      logError('Failed to start trial', { creator_id: creatorId, error });
      throw error;
    }
  }

  /**
   * Check if creator is currently on trial
   */
  static async isOnTrial(creatorId: string): Promise<boolean> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('creators')
        .select('trial_status, trial_expires_at')
        .eq('id', creatorId)
        .single();

      if (error || !data) {
        return false;
      }

      // Check if trial is active and not expired
      const isActive = data.trial_status === TrialStatus.ACTIVE;
      const notExpired = data.trial_expires_at && new Date(data.trial_expires_at) > new Date();

      return isActive && notExpired;
    } catch (error) {
      logError('Error checking trial status', { creator_id: creatorId, error });
      return false;
    }
  }

  /**
   * Check if trial has expired
   */
  static async hasTrialExpired(creatorId: string): Promise<boolean> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('creators')
        .select('trial_expires_at, trial_status')
        .eq('id', creatorId)
        .single();

      if (error || !data || !data.trial_expires_at) {
        return false;
      }

      const expirationDate = new Date(data.trial_expires_at);
      const now = new Date();

      return expirationDate < now && data.trial_status === TrialStatus.ACTIVE;
    } catch (error) {
      logError('Error checking trial expiration', { creator_id: creatorId, error });
      return false;
    }
  }

  /**
   * Get trial information for a creator
   */
  static async getTrialInfo(creatorId: string): Promise<TrialInfo | null> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('creators')
        .select('trial_started_at, trial_expires_at, trial_status, has_demo_content')
        .eq('id', creatorId)
        .single();

      if (error || !data || !data.trial_started_at || !data.trial_expires_at) {
        return null;
      }

      const expiresAt = new Date(data.trial_expires_at);
      const now = new Date();
      const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return {
        status: data.trial_status as TrialStatus,
        startedAt: new Date(data.trial_started_at),
        expiresAt: expiresAt,
        daysRemaining: Math.max(0, daysRemaining),
        hasDemoContent: data.has_demo_content || false,
      };
    } catch (error) {
      logError('Error getting trial info', { creator_id: creatorId, error });
      return null;
    }
  }

  /**
   * Convert trial to paid subscription
   * Called when creator completes payment
   */
  static async convertTrial(
    creatorId: string,
    tier: PlanTier
  ): Promise<TrialConversionResult> {
    try {
      const supabase = createAdminClient();

      // 1. Update creator to paid tier
      const { error: updateError } = await supabase
        .from('creators')
        .update({
          subscription_tier: tier,
          current_plan: tier,
          trial_status: TrialStatus.CONVERTED,
          has_demo_content: false,
        })
        .eq('id', creatorId);

      if (updateError) {
        throw updateError;
      }

      // 2. Remove demo content
      const demoRemoved = await this.removeDemoContent(creatorId);

      logInfo('Trial converted to paid', {
        creator_id: creatorId,
        tier,
        demo_content_removed: demoRemoved,
      });

      return {
        success: true,
        message: `Successfully upgraded to ${tier} tier`,
        demoContentRemoved: demoRemoved,
        newTier: tier,
      };
    } catch (error) {
      logError('Failed to convert trial', { creator_id: creatorId, tier, error });
      return {
        success: false,
        message: 'Failed to upgrade. Please contact support.',
        demoContentRemoved: false,
        newTier: '',
      };
    }
  }

  /**
   * Remove demo content from creator's account
   * Called after trial conversion or manual cleanup
   */
  static async removeDemoContent(creatorId: string): Promise<boolean> {
    try {
      const supabase = createAdminClient();

      // Delete demo videos
      const { error: videosError } = await supabase
        .from('videos')
        .delete()
        .eq('creator_id', creatorId)
        .eq('is_demo_content', true);

      if (videosError) {
        logError('Failed to delete demo videos', { creator_id: creatorId, error: videosError });
      }

      // Delete demo courses (if table exists and has is_demo column)
      try {
        const { error: coursesError } = await supabase
          .from('courses')
          .delete()
          .eq('creator_id', creatorId)
          .eq('is_demo', true);

        if (coursesError) {
          logError('Failed to delete demo courses', { creator_id: creatorId, error: coursesError });
        }
      } catch (error) {
        // Courses table might not exist yet, ignore error
        logInfo('Skipping demo courses deletion', { creator_id: creatorId });
      }

      // Delete demo video chunks (cleanup embeddings)
      const { data: demoVideos } = await supabase
        .from('videos')
        .select('id')
        .eq('creator_id', creatorId)
        .eq('is_demo_content', true);

      if (demoVideos && demoVideos.length > 0) {
        const videoIds = demoVideos.map((v) => v.id);
        await supabase.from('video_chunks').delete().in('video_id', videoIds);
      }

      logInfo('Demo content removed', { creator_id: creatorId });
      return true;
    } catch (error) {
      logError('Error removing demo content', { creator_id: creatorId, error });
      return false;
    }
  }

  /**
   * Provision demo content to a new creator's account
   * Copies demo videos and courses from system account
   */
  static async provisionDemoContent(creatorId: string): Promise<boolean> {
    try {
      const supabase = createAdminClient();

      // 1. Get demo videos from system account
      const { data: systemVideos, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .eq('creator_id', SYSTEM_DEMO_CREATOR_ID)
        .eq('is_demo_content', true);

      if (videosError || !systemVideos || systemVideos.length === 0) {
        logError('No demo videos found in system account', {
          system_creator_id: SYSTEM_DEMO_CREATOR_ID,
          error: videosError,
        });
        return false;
      }

      // 2. Copy videos to new creator's account
      const newVideos = systemVideos.map((video) => ({
        creator_id: creatorId,
        title: video.title,
        description: video.description,
        video_url: video.video_url,
        thumbnail_url: video.thumbnail_url,
        duration_seconds: video.duration_seconds,
        transcript: video.transcript,
        transcript_processed: video.transcript_processed,
        category: video.category,
        tags: video.tags,
        difficulty_level: video.difficulty_level,
        order_index: video.order_index,
        is_demo_content: true,
      }));

      const { data: insertedVideos, error: insertError } = await supabase
        .from('videos')
        .insert(newVideos)
        .select('id');

      if (insertError) {
        throw insertError;
      }

      // 3. Copy video chunks (embeddings) for RAG functionality
      const systemVideoIds = systemVideos.map((v) => v.id);
      const { data: systemChunks } = await supabase
        .from('video_chunks')
        .select('*')
        .in('video_id', systemVideoIds);

      if (systemChunks && systemChunks.length > 0 && insertedVideos) {
        // Create mapping from old video IDs to new video IDs
        const videoIdMap = new Map<string, string>();
        for (let i = 0; i < systemVideos.length; i++) {
          videoIdMap.set(systemVideos[i].id, insertedVideos[i].id);
        }

        // Copy chunks with updated video IDs
        const newChunks = systemChunks.map((chunk) => ({
          video_id: videoIdMap.get(chunk.video_id),
          chunk_text: chunk.chunk_text,
          chunk_index: chunk.chunk_index,
          start_timestamp: chunk.start_timestamp,
          end_timestamp: chunk.end_timestamp,
          embedding: chunk.embedding,
          topic_tags: chunk.topic_tags,
        }));

        await supabase.from('video_chunks').insert(newChunks);
      }

      // 4. Copy demo courses if they exist
      try {
        const { data: systemCourses } = await supabase
          .from('courses')
          .select('*')
          .eq('creator_id', SYSTEM_DEMO_CREATOR_ID)
          .eq('is_demo', true);

        if (systemCourses && systemCourses.length > 0 && insertedVideos) {
          // Create video ID mapping for course video arrays
          const videoIdMap = new Map<string, string>();
          for (let i = 0; i < systemVideos.length; i++) {
            videoIdMap.set(systemVideos[i].id, insertedVideos[i].id);
          }

          const newCourses = systemCourses.map((course) => ({
            creator_id: creatorId,
            title: course.title,
            description: course.description,
            video_ids: course.video_ids?.map((id: string) => videoIdMap.get(id) || id),
            is_demo: true,
          }));

          await supabase.from('courses').insert(newCourses);
        }
      } catch (error) {
        // Courses table might not exist, that's okay
        logInfo('Skipping demo courses provisioning', { creator_id: creatorId });
      }

      // 5. Update creator to mark demo content as provisioned
      await supabase
        .from('creators')
        .update({ has_demo_content: true })
        .eq('id', creatorId);

      logInfo('Demo content provisioned', {
        creator_id: creatorId,
        videos_count: systemVideos.length,
      });

      return true;
    } catch (error) {
      logError('Failed to provision demo content', { creator_id: creatorId, error });
      return false;
    }
  }

  /**
   * Mark expired trials (runs as cron job)
   */
  static async markExpiredTrials(): Promise<number> {
    try {
      const supabase = createAdminClient();

      const { data, error } = await supabase
        .from('creators')
        .update({ trial_status: TrialStatus.EXPIRED })
        .eq('trial_status', TrialStatus.ACTIVE)
        .lt('trial_expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        throw error;
      }

      const count = data?.length || 0;
      logInfo('Marked expired trials', { count });

      return count;
    } catch (error) {
      logError('Failed to mark expired trials', { error });
      return 0;
    }
  }
}

// Convenience function exports
export const startTrial = TrialManager.startTrial.bind(TrialManager);
export const isOnTrial = TrialManager.isOnTrial.bind(TrialManager);
export const hasTrialExpired = TrialManager.hasTrialExpired.bind(TrialManager);
export const getTrialInfo = TrialManager.getTrialInfo.bind(TrialManager);
export const convertTrial = TrialManager.convertTrial.bind(TrialManager);
export const removeDemoContent = TrialManager.removeDemoContent.bind(TrialManager);
export const provisionDemoContent = TrialManager.provisionDemoContent.bind(TrialManager);
