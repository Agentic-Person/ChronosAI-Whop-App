/**
 * Achievement System
 * Handles achievement unlocking, tracking, and rewards
 */

import { createClient } from '@/lib/utils/supabase-client';

export enum AchievementRarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

export enum AchievementCategory {
  VIDEO = 'video',
  QUIZ = 'quiz',
  PROJECT = 'project',
  STREAK = 'streak',
  SOCIAL = 'social',
  SPECIAL = 'special',
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  icon: string;
  xp_reward: number;
  unlock_criteria: AchievementCriteria;
  is_unlocked?: boolean;
  unlocked_at?: Date;
}

export interface AchievementCriteria {
  type: 'count' | 'streak' | 'score' | 'time' | 'special';
  threshold: number;
  metric: string;
  special_condition?: string;
}

export interface StudentAchievement {
  achievement_id: string;
  student_id: string;
  unlocked_at: Date;
  progress: number;
  achievement: Achievement;
}

export interface AchievementProgress {
  achievement_id: string;
  current: number;
  required: number;
  percentage: number;
  achievement: Achievement;
}

/**
 * All available achievements in the system
 */
export const ACHIEVEMENTS: Achievement[] = [
  // Video Achievements
  {
    id: 'first-steps',
    name: 'First Steps',
    description: 'Complete your first video',
    category: AchievementCategory.VIDEO,
    rarity: AchievementRarity.COMMON,
    icon: 'Play',
    xp_reward: 50,
    unlock_criteria: {
      type: 'count',
      threshold: 1,
      metric: 'videos_completed',
    },
  },
  {
    id: 'marathon-learner',
    name: 'Marathon Learner',
    description: 'Watch 10 hours of video content',
    category: AchievementCategory.VIDEO,
    rarity: AchievementRarity.RARE,
    icon: 'Clock',
    xp_reward: 500,
    unlock_criteria: {
      type: 'time',
      threshold: 600, // minutes
      metric: 'total_watch_time',
    },
  },
  {
    id: 'course-conqueror',
    name: 'Course Conqueror',
    description: 'Complete 50 videos',
    category: AchievementCategory.VIDEO,
    rarity: AchievementRarity.EPIC,
    icon: 'Crown',
    xp_reward: 1000,
    unlock_criteria: {
      type: 'count',
      threshold: 50,
      metric: 'videos_completed',
    },
  },

  // Quiz Achievements
  {
    id: 'quiz-master',
    name: 'Quiz Master',
    description: 'Pass a quiz with 90%+',
    category: AchievementCategory.QUIZ,
    rarity: AchievementRarity.COMMON,
    icon: 'GraduationCap',
    xp_reward: 100,
    unlock_criteria: {
      type: 'score',
      threshold: 90,
      metric: 'quiz_score',
    },
  },
  {
    id: 'perfect-score',
    name: 'Perfect Score',
    description: 'Get 100% on any quiz',
    category: AchievementCategory.QUIZ,
    rarity: AchievementRarity.RARE,
    icon: 'Star',
    xp_reward: 300,
    unlock_criteria: {
      type: 'score',
      threshold: 100,
      metric: 'quiz_score',
    },
  },
  {
    id: 'quiz-champion',
    name: 'Quiz Champion',
    description: 'Pass 20 quizzes',
    category: AchievementCategory.QUIZ,
    rarity: AchievementRarity.EPIC,
    icon: 'Trophy',
    xp_reward: 750,
    unlock_criteria: {
      type: 'count',
      threshold: 20,
      metric: 'quizzes_passed',
    },
  },

  // Project Achievements
  {
    id: 'first-build',
    name: 'First Build',
    description: 'Submit your first project',
    category: AchievementCategory.PROJECT,
    rarity: AchievementRarity.COMMON,
    icon: 'Rocket',
    xp_reward: 250,
    unlock_criteria: {
      type: 'count',
      threshold: 1,
      metric: 'projects_submitted',
    },
  },
  {
    id: 'code-reviewer',
    name: 'Code Reviewer',
    description: 'Review 5 peer projects',
    category: AchievementCategory.PROJECT,
    rarity: AchievementRarity.RARE,
    icon: 'Eye',
    xp_reward: 300,
    unlock_criteria: {
      type: 'count',
      threshold: 5,
      metric: 'peer_reviews_given',
    },
  },
  {
    id: 'project-pro',
    name: 'Project Pro',
    description: 'Complete 10 projects',
    category: AchievementCategory.PROJECT,
    rarity: AchievementRarity.LEGENDARY,
    icon: 'Award',
    xp_reward: 1500,
    unlock_criteria: {
      type: 'count',
      threshold: 10,
      metric: 'projects_completed',
    },
  },

  // Streak Achievements
  {
    id: 'learning-streak',
    name: 'Learning Streak',
    description: 'Maintain a 7-day streak',
    category: AchievementCategory.STREAK,
    rarity: AchievementRarity.RARE,
    icon: 'Flame',
    xp_reward: 200,
    unlock_criteria: {
      type: 'streak',
      threshold: 7,
      metric: 'current_streak',
    },
  },
  {
    id: 'dedication',
    name: 'Dedication',
    description: 'Maintain a 30-day streak',
    category: AchievementCategory.STREAK,
    rarity: AchievementRarity.EPIC,
    icon: 'Zap',
    xp_reward: 1000,
    unlock_criteria: {
      type: 'streak',
      threshold: 30,
      metric: 'current_streak',
    },
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Maintain a 100-day streak',
    category: AchievementCategory.STREAK,
    rarity: AchievementRarity.LEGENDARY,
    icon: 'Infinity',
    xp_reward: 5000,
    unlock_criteria: {
      type: 'streak',
      threshold: 100,
      metric: 'current_streak',
    },
  },

  // Social Achievements
  {
    id: 'helpful-hand',
    name: 'Helping Hand',
    description: 'Answer 5 peer questions',
    category: AchievementCategory.SOCIAL,
    rarity: AchievementRarity.RARE,
    icon: 'HandHeart',
    xp_reward: 300,
    unlock_criteria: {
      type: 'count',
      threshold: 5,
      metric: 'questions_answered',
    },
  },
  {
    id: 'social-butterfly',
    name: 'Social Butterfly',
    description: 'Join 3 study groups',
    category: AchievementCategory.SOCIAL,
    rarity: AchievementRarity.COMMON,
    icon: 'Users',
    xp_reward: 150,
    unlock_criteria: {
      type: 'count',
      threshold: 3,
      metric: 'study_groups_joined',
    },
  },

  // Special Achievements
  {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Study before 8 AM',
    category: AchievementCategory.SPECIAL,
    rarity: AchievementRarity.RARE,
    icon: 'Sunrise',
    xp_reward: 100,
    unlock_criteria: {
      type: 'special',
      threshold: 1,
      metric: 'early_morning_sessions',
      special_condition: 'time_before_8am',
    },
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Study after 10 PM',
    category: AchievementCategory.SPECIAL,
    rarity: AchievementRarity.RARE,
    icon: 'Moon',
    xp_reward: 100,
    unlock_criteria: {
      type: 'special',
      threshold: 1,
      metric: 'late_night_sessions',
      special_condition: 'time_after_10pm',
    },
  },
  {
    id: 'course-crusher',
    name: 'Course Crusher',
    description: 'Complete entire course',
    category: AchievementCategory.SPECIAL,
    rarity: AchievementRarity.LEGENDARY,
    icon: 'Medal',
    xp_reward: 2500,
    unlock_criteria: {
      type: 'special',
      threshold: 100,
      metric: 'course_completion',
      special_condition: 'full_course_completion',
    },
  },
];

/**
 * Get all achievements for a student
 */
export async function getStudentAchievements(studentId: string): Promise<StudentAchievement[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('student_achievements')
    .select(`
      achievement_id,
      student_id,
      unlocked_at,
      progress
    `)
    .eq('student_id', studentId);

  if (error) {
    console.error('Error fetching student achievements:', error);
    return [];
  }

  // Combine with achievement metadata
  return data.map((sa) => {
    const achievement = ACHIEVEMENTS.find((a) => a.id === sa.achievement_id);
    return {
      ...sa,
      unlocked_at: new Date(sa.unlocked_at),
      achievement: achievement!,
    };
  });
}

/**
 * Check for newly unlocked achievements
 */
export async function checkUnlockedAchievements(studentId: string): Promise<Achievement[]> {
  const supabase = createClient();
  const newlyUnlocked: Achievement[] = [];

  // Get student stats
  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single();

  if (!student) return [];

  // Get current achievements
  const studentAchievements = await getStudentAchievements(studentId);
  const unlockedIds = new Set(studentAchievements.map((sa) => sa.achievement_id));

  // Get additional stats
  const stats = await getStudentStats(studentId);

  // Check each achievement
  for (const achievement of ACHIEVEMENTS) {
    if (unlockedIds.has(achievement.id)) continue;

    const isUnlocked = checkAchievementCriteria(achievement, student, stats);

    if (isUnlocked) {
      await awardAchievement(studentId, achievement.id);
      newlyUnlocked.push(achievement);
    }
  }

  return newlyUnlocked;
}

/**
 * Get student statistics for achievement checking
 */
async function getStudentStats(studentId: string): Promise<Record<string, number>> {
  const supabase = createClient();

  // Videos completed
  const { count: videosCompleted } = await supabase
    .from('video_progress')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('is_completed', true);

  // Total watch time
  const { data: watchTime } = await supabase
    .from('video_progress')
    .select('watch_time_seconds')
    .eq('student_id', studentId);

  const totalWatchTime = watchTime?.reduce((sum, v) => sum + (v.watch_time_seconds || 0), 0) || 0;

  // Quizzes passed
  const { count: quizzesPassed } = await supabase
    .from('quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .gte('score', 70);

  // Projects submitted
  const { count: projectsSubmitted } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId);

  // Projects completed
  const { count: projectsCompleted } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('status', 'completed');

  // Study groups
  const { count: studyGroupsJoined } = await supabase
    .from('study_group_members')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId);

  return {
    videos_completed: videosCompleted || 0,
    total_watch_time: Math.floor(totalWatchTime / 60), // Convert to minutes
    quizzes_passed: quizzesPassed || 0,
    projects_submitted: projectsSubmitted || 0,
    projects_completed: projectsCompleted || 0,
    study_groups_joined: studyGroupsJoined || 0,
  };
}

/**
 * Check if achievement criteria is met
 */
function checkAchievementCriteria(
  achievement: Achievement,
  student: any,
  stats: Record<string, number>
): boolean {
  const { type, threshold, metric, special_condition } = achievement.unlock_criteria;

  switch (type) {
    case 'count':
      return (stats[metric] || 0) >= threshold;

    case 'streak':
      return (student.current_streak || 0) >= threshold;

    case 'score':
      // Handled separately in quiz attempts
      return false;

    case 'time':
      return (stats[metric] || 0) >= threshold;

    case 'special':
      if (special_condition === 'full_course_completion') {
        // Check if all course videos are completed
        return (stats.course_completion || 0) >= threshold;
      }
      return false;

    default:
      return false;
  }
}

/**
 * Award achievement to student
 */
export async function awardAchievement(studentId: string, achievementId: string): Promise<void> {
  const supabase = createClient();

  const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
  if (!achievement) return;

  // Insert achievement
  const { error: insertError } = await supabase.from('student_achievements').insert({
    student_id: studentId,
    achievement_id: achievementId,
    unlocked_at: new Date().toISOString(),
    progress: 100,
  });

  if (insertError) {
    console.error('Error awarding achievement:', insertError);
    return;
  }

  // Award XP
  const { error: xpError } = await supabase.rpc('award_xp', {
    p_student_id: studentId,
    p_xp_amount: achievement.xp_reward,
    p_action: `achievement_${achievementId}`,
    p_metadata: {
      achievement_id: achievementId,
      achievement_name: achievement.name,
      xp_reward: achievement.xp_reward,
    },
  });

  if (xpError) {
    console.error('Error awarding XP for achievement:', xpError);
  }
}

/**
 * Get achievement progress for in-progress achievements
 */
export async function getAchievementProgress(studentId: string): Promise<AchievementProgress[]> {
  const supabase = createClient();

  // Get student data
  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single();

  if (!student) return [];

  // Get stats
  const stats = await getStudentStats(studentId);

  // Get already unlocked achievements
  const studentAchievements = await getStudentAchievements(studentId);
  const unlockedIds = new Set(studentAchievements.map((sa) => sa.achievement_id));

  const progress: AchievementProgress[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (unlockedIds.has(achievement.id)) continue;

    const { metric, threshold } = achievement.unlock_criteria;
    let current = 0;

    if (achievement.unlock_criteria.type === 'streak') {
      current = student.current_streak || 0;
    } else {
      current = stats[metric] || 0;
    }

    if (current > 0) {
      progress.push({
        achievement_id: achievement.id,
        current,
        required: threshold,
        percentage: Math.min((current / threshold) * 100, 100),
        achievement,
      });
    }
  }

  // Sort by percentage (closest to completion first)
  return progress.sort((a, b) => b.percentage - a.percentage);
}

/**
 * Get achievement by ID
 */
export function getAchievementById(achievementId: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === achievementId);
}

/**
 * Get achievements by category
 */
export function getAchievementsByCategory(category: AchievementCategory): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.category === category);
}

/**
 * Get achievements by rarity
 */
export function getAchievementsByRarity(rarity: AchievementRarity): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.rarity === rarity);
}

/**
 * Check for special time-based achievements
 */
export async function checkTimeBasedAchievements(studentId: string): Promise<Achievement[]> {
  const now = new Date();
  const hour = now.getHours();
  const newlyUnlocked: Achievement[] = [];

  // Early bird (before 8 AM)
  if (hour < 8) {
    const earlyBird = ACHIEVEMENTS.find((a) => a.id === 'early-bird');
    if (earlyBird) {
      const studentAchievements = await getStudentAchievements(studentId);
      const hasAchievement = studentAchievements.some((sa) => sa.achievement_id === 'early-bird');

      if (!hasAchievement) {
        await awardAchievement(studentId, 'early-bird');
        newlyUnlocked.push(earlyBird);
      }
    }
  }

  // Night owl (after 10 PM)
  if (hour >= 22) {
    const nightOwl = ACHIEVEMENTS.find((a) => a.id === 'night-owl');
    if (nightOwl) {
      const studentAchievements = await getStudentAchievements(studentId);
      const hasAchievement = studentAchievements.some((sa) => sa.achievement_id === 'night-owl');

      if (!hasAchievement) {
        await awardAchievement(studentId, 'night-owl');
        newlyUnlocked.push(nightOwl);
      }
    }
  }

  return newlyUnlocked;
}
