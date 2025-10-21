/**
 * Content Recommendation Engine
 * AI-powered content suggestions for students and creators
 */

import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

export interface Video {
  id: string;
  title: string;
  duration_seconds: number;
  module_number?: number;
  creator_id: string;
}

export interface LearningPath {
  path_id: string;
  goal: string;
  total_weeks: number;
  modules: PathModule[];
  milestones: Milestone[];
}

export interface PathModule {
  module_number: number;
  title: string;
  videos: Video[];
  estimated_hours: number;
}

export interface Milestone {
  type: 'quiz' | 'project' | 'review';
  after_video_id: string;
  title: string;
}

export class RecommendationEngine {
  private anthropic: Anthropic;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is required for Recommendation Engine');
    }
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Recommend next videos for a student
   */
  async recommendNextVideos(studentId: string, limit: number = 5): Promise<Video[]> {
    const supabase = createClient();

    // Get student info
    const { data: student } = await supabase
      .from('students')
      .select('creator_id, difficulty_level, level')
      .eq('id', studentId)
      .single();

    if (!student) return [];

    // Get completed videos
    const { data: completed } = await supabase
      .from('learning_progress')
      .select('video_id')
      .eq('student_id', studentId)
      .eq('completed', true);

    const completedIds = completed?.map((c) => c.video_id) || [];

    // Get all videos from creator
    const { data: allVideos } = await supabase
      .from('videos')
      .select('id, title, duration_seconds, module_number, creator_id')
      .eq('creator_id', student.creator_id)
      .order('module_number, created_at');

    if (!allVideos) return [];

    // Filter out completed
    const remainingVideos = allVideos.filter((v) => !completedIds.includes(v.id));

    // Use collaborative filtering (simple: next in sequence)
    const recommendations = remainingVideos.slice(0, limit);

    return recommendations;
  }

  /**
   * Generate personalized learning path
   */
  async generateLearningPath(studentId: string, goal: string): Promise<LearningPath | null> {
    const supabase = createClient();

    // Get student data
    const { data: student } = await supabase
      .from('students')
      .select('creator_id, difficulty_level, level, weekly_availability_hours')
      .eq('id', studentId)
      .single();

    if (!student) return null;

    // Get all available videos
    const { data: videos } = await supabase
      .from('videos')
      .select('id, title, duration_seconds, module_number, creator_id')
      .eq('creator_id', student.creator_id)
      .order('module_number, created_at');

    if (!videos || videos.length === 0) return null;

    // Group videos by module
    const moduleMap = new Map<number, Video[]>();
    for (const video of videos) {
      const moduleNum = video.module_number || 1;
      const existing = moduleMap.get(moduleNum) || [];
      existing.push(video);
      moduleMap.set(moduleNum, existing);
    }

    // Build path modules
    const pathModules: PathModule[] = [];
    for (const [moduleNum, moduleVideos] of moduleMap.entries()) {
      const totalSeconds = moduleVideos.reduce((sum, v) => sum + v.duration_seconds, 0);
      pathModules.push({
        module_number: moduleNum,
        title: `Module ${moduleNum}`,
        videos: moduleVideos,
        estimated_hours: Math.ceil(totalSeconds / 3600),
      });
    }

    // Calculate total weeks based on availability
    const totalHours = pathModules.reduce((sum, m) => sum + m.estimated_hours, 0);
    const weeklyHours = student.weekly_availability_hours || 5;
    const totalWeeks = Math.ceil(totalHours / weeklyHours);

    // Generate milestones
    const milestones: Milestone[] = [];
    for (const module of pathModules) {
      const lastVideo = module.videos[module.videos.length - 1];
      milestones.push({
        type: 'quiz',
        after_video_id: lastVideo.id,
        title: `Module ${module.module_number} Assessment`,
      });
    }

    const path: LearningPath = {
      path_id: `path-${studentId}-${Date.now()}`,
      goal,
      total_weeks: totalWeeks,
      modules: pathModules,
      milestones,
    };

    // Store in database
    await supabase.from('learning_paths').insert({
      student_id: studentId,
      creator_id: student.creator_id,
      goal,
      total_duration_weeks: totalWeeks,
      path_structure: path.modules,
      milestones: path.milestones,
      status: 'active',
    });

    return path;
  }

  /**
   * Find similar content (for marketplace/discovery)
   */
  async findSimilarContent(videoId: string, limit: number = 5): Promise<Video[]> {
    const supabase = createClient();

    // Get source video
    const { data: sourceVideo } = await supabase
      .from('videos')
      .select('title, module_number, creator_id')
      .eq('id', videoId)
      .single();

    if (!sourceVideo) return [];

    // Find videos with similar titles or same module
    const { data: similarVideos } = await supabase
      .from('videos')
      .select('id, title, duration_seconds, module_number, creator_id')
      .eq('creator_id', sourceVideo.creator_id)
      .neq('id', videoId)
      .limit(limit * 2);

    if (!similarVideos) return [];

    // Score by similarity
    const scored = similarVideos.map((video) => {
      let score = 0;

      // Same module = high score
      if (video.module_number === sourceVideo.module_number) {
        score += 10;
      }

      // Similar title words
      const sourceTitleWords = new Set(
        sourceVideo.title.toLowerCase().split(/\s+/)
      );
      const videoTitleWords = video.title.toLowerCase().split(/\s+/);
      const matchingWords = videoTitleWords.filter((word) =>
        sourceTitleWords.has(word)
      );
      score += matchingWords.length * 2;

      return { video, score };
    });

    // Sort by score and return top N
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.video);
  }
}
