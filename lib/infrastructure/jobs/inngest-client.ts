/**
 * Inngest Client Configuration
 * Job queue and workflow orchestration
 */

import { Inngest, EventSchemas } from 'inngest';

/**
 * Define all event schemas for type safety
 */
type MentoraEvents = {
  'video/upload.completed': {
    data: {
      videoId: string;
      creatorId: string;
      videoUrl: string;
      duration: number;
    };
  };
  'video/transcription.completed': {
    data: {
      videoId: string;
      transcriptUrl: string;
    };
  };
  'quiz/generation.requested': {
    data: {
      quizId: string;
      videoId: string;
      creatorId: string;
      questionCount: number;
    };
  };
  'student/achievement.unlocked': {
    data: {
      studentId: string;
      achievementId: string;
      xpEarned: number;
    };
  };
  'analytics/daily.aggregate': {
    data: {
      date: string;
    };
  };
  'email/send': {
    data: {
      to: string;
      template: string;
      variables: Record<string, any>;
    };
  };
  'membership/updated': {
    data: {
      userId: string;
      planTier: string;
      action: 'created' | 'expired' | 'upgraded' | 'downgraded';
    };
  };
};

/**
 * Inngest client instance
 */
export const inngest = new Inngest({
  id: 'mentora',
  schemas: new EventSchemas().fromRecord<MentoraEvents>(),
  eventKey: process.env.INNGEST_EVENT_KEY,
});
