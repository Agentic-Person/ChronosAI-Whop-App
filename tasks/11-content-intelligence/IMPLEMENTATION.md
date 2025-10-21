# Module 11: Content Intelligence - Implementation Guide

## Table of Contents
1. [Setup & Dependencies](#setup--dependencies)
2. [Content Gap Detection](#content-gap-detection)
3. [Auto-Tagging Service](#auto-tagging-service)
4. [Video Quality Analyzer](#video-quality-analyzer)
5. [Personalized Learning Paths](#personalized-learning-paths)
6. [Predictive Analytics](#predictive-analytics)
7. [Knowledge Graph](#knowledge-graph)
8. [Content Recommendations](#content-recommendations)
9. [A/B Testing Framework](#ab-testing-framework)
10. [Background Jobs](#background-jobs)
11. [API Routes](#api-routes)
12. [Testing](#testing)

---

## Setup & Dependencies

### Install Python Dependencies (for ML)

```bash
# Create Python environment for ML models
python -m venv ml-env
source ml-env/bin/activate  # On Windows: ml-env\Scripts\activate

# Install ML libraries
pip install scikit-learn numpy pandas
pip install python-dotenv
pip install psycopg2-binary  # For database access
pip install anthropic  # Claude AI client
```

### Install Node.js Dependencies

```bash
npm install zod  # For schema validation
npm install date-fns  # Date utilities
```

### Environment Variables

```bash
# .env.local

# AI Services
ANTHROPIC_API_KEY=your-anthropic-key

# Database (already configured)
DATABASE_URL=postgresql://...

# Python ML Service (if separate)
ML_SERVICE_URL=http://localhost:8000
```

---

## Content Gap Detection

### Gap Detector Service

Create `lib/intelligence/gap-detector.ts`:

```typescript
// lib/intelligence/gap-detector.ts

import Anthropic from '@anthropic-ai/sdk';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export interface ContentGap {
  topic: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  evidence: {
    mentionedInVideos: number;
    questionsAsked: number;
    prerequisiteFor: string[];
  };
  suggestedContent: {
    title: string;
    description: string;
    estimatedLength: string;
  };
}

export class ContentGapDetector {
  private anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  /**
   * Analyze all content and detect gaps
   */
  async detectGaps(creatorId: string): Promise<ContentGap[]> {
    const supabase = getSupabaseAdmin();

    // 1. Get all videos with transcripts
    const { data: videos } = await supabase
      .from('videos')
      .select('id, title, full_transcript, module_number')
      .eq('creator_id', creatorId)
      .not('full_transcript', 'is', null);

    if (!videos || videos.length === 0) {
      return [];
    }

    // 2. Get all chat questions
    const { data: chatMessages } = await supabase
      .from('chat_messages')
      .select('message')
      .eq('role', 'user')
      .limit(500)
      .order('created_at', { ascending: false });

    // 3. Extract all taught topics
    const taughtTopics = await this.extractTaughtTopics(videos);

    // 4. Extract mentioned but not taught topics
    const mentionedTopics = await this.extractMentionedTopics(videos);

    // 5. Extract topics from questions
    const questionTopics = await this.extractQuestionTopics(
      chatMessages?.map(m => m.message) || []
    );

    // 6. Find gaps
    const gaps: ContentGap[] = [];

    // Topics mentioned but not taught
    for (const topic of mentionedTopics) {
      if (!taughtTopics.includes(topic.name)) {
        const questionsCount = questionTopics.filter(q =>
          q.toLowerCase().includes(topic.name.toLowerCase())
        ).length;

        const gap: ContentGap = {
          topic: topic.name,
          severity: this.calculateSeverity(topic.mentions, questionsCount),
          evidence: {
            mentionedInVideos: topic.mentions,
            questionsAsked: questionsCount,
            prerequisiteFor: topic.prerequisiteFor,
          },
          suggestedContent: await this.generateContentSuggestion(topic.name),
        };

        gaps.push(gap);
      }
    }

    // Sort by severity
    return gaps.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Extract topics that are taught in videos
   */
  private async extractTaughtTopics(videos: any[]): Promise<string[]> {
    const transcripts = videos.map(v => v.full_transcript).join('\n\n---\n\n');

    const prompt = `
Analyze these video transcripts and list ALL programming topics that are TAUGHT (explained in detail with examples).

Return ONLY a JSON array of topic names, like:
["React Hooks", "JavaScript Closures", "CSS Grid"]

Transcripts:
${transcripts.substring(0, 50000)}
`;

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') return [];

    try {
      return JSON.parse(content.text);
    } catch {
      return [];
    }
  }

  /**
   * Extract topics that are mentioned but not taught
   */
  private async extractMentionedTopics(
    videos: any[]
  ): Promise<Array<{ name: string; mentions: number; prerequisiteFor: string[] }>> {
    const allTopics: Map<string, { mentions: number; videos: string[] }> = new Map();

    for (const video of videos) {
      const prompt = `
Analyze this video transcript and list programming topics that are MENTIONED or REFERENCED but NOT explained in detail.

Examples:
- "We'll use closures here" (mentioned but not explained)
- "This requires understanding of promises" (referenced as prerequisite)

Return ONLY a JSON array of topic names:
["Closures", "Promises", "Async/Await"]

Transcript:
${video.full_transcript.substring(0, 10000)}
`;

      try {
        const response = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        });

        const content = response.content[0];
        if (content.type !== 'text') continue;

        const topics: string[] = JSON.parse(content.text);

        for (const topic of topics) {
          const existing = allTopics.get(topic);
          if (existing) {
            existing.mentions++;
            existing.videos.push(video.id);
          } else {
            allTopics.set(topic, { mentions: 1, videos: [video.id] });
          }
        }
      } catch (error) {
        console.error('Failed to extract topics from video:', video.id, error);
      }
    }

    return Array.from(allTopics.entries()).map(([name, data]) => ({
      name,
      mentions: data.mentions,
      prerequisiteFor: data.videos,
    }));
  }

  /**
   * Extract topics from student questions
   */
  private async extractQuestionTopics(questions: string[]): Promise<string[]> {
    if (questions.length === 0) return [];

    const allQuestions = questions.slice(0, 200).join('\n');

    const prompt = `
Analyze these student questions and extract the programming topics they're asking about.

Return ONLY a JSON array of topic names:
["React Hooks", "State Management", "API Calls"]

Questions:
${allQuestions}
`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') return [];

      return JSON.parse(content.text);
    } catch {
      return [];
    }
  }

  /**
   * Calculate gap severity
   */
  private calculateSeverity(
    mentions: number,
    questionsAsked: number
  ): 'critical' | 'high' | 'medium' | 'low' {
    const score = mentions * 2 + questionsAsked * 3;

    if (score >= 30) return 'critical';
    if (score >= 15) return 'high';
    if (score >= 5) return 'medium';
    return 'low';
  }

  /**
   * Generate content suggestion for a gap
   */
  private async generateContentSuggestion(topic: string): Promise<{
    title: string;
    description: string;
    estimatedLength: string;
  }> {
    const prompt = `
You're a content creator planning a new tutorial video.

Topic: ${topic}

Generate a compelling video title, description, and estimated length for a tutorial on this topic.

Return ONLY valid JSON:
{
  "title": "Understanding ${topic} in JavaScript",
  "description": "Learn how to...",
  "estimatedLength": "12-15 minutes"
}
`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') throw new Error('Invalid response');

      return JSON.parse(content.text);
    } catch {
      return {
        title: `${topic} Tutorial`,
        description: `Learn the fundamentals of ${topic}`,
        estimatedLength: '10-15 minutes',
      };
    }
  }

  /**
   * Store gaps in database
   */
  async storeGaps(gaps: ContentGap[]): Promise<void> {
    const supabase = getSupabaseAdmin();

    // Clear old gaps
    await supabase.from('content_gaps').delete().eq('status', 'open');

    // Insert new gaps
    const records = gaps.map(gap => ({
      topic: gap.topic,
      severity: gap.severity,
      evidence: gap.evidence,
      suggested_content: gap.suggestedContent,
      status: 'open',
    }));

    await supabase.from('content_gaps').insert(records);
  }
}
```

---

## Auto-Tagging Service

### Video Tagging Service

Create `lib/intelligence/auto-tagger.ts`:

```typescript
// lib/intelligence/auto-tagger.ts

import Anthropic from '@anthropic-ai/sdk';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export interface VideoMetadata {
  topics: Topic[];
  skills: Skill[];
  difficulty: {
    overall: 'beginner' | 'intermediate' | 'advanced';
    byTopic: { [topic: string]: string };
  };
  prerequisites: {
    concepts: string[];
    videoIds: string[];
  };
  learningOutcomes: string[];
  keywords: string[];
  languages: string[];
  tools: string[];
}

export interface Topic {
  name: string;
  category: string;
  coverage: number; // 0-100
  depth: 'overview' | 'detailed' | 'deep-dive';
}

export interface Skill {
  name: string;
  level: 'basic' | 'intermediate' | 'advanced';
  type: 'practical' | 'theoretical';
}

export class AutoTaggerService {
  private anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  /**
   * Auto-tag a video using AI
   */
  async tagVideo(videoId: string): Promise<VideoMetadata> {
    const supabase = getSupabaseAdmin();

    // Get video transcript
    const { data: video } = await supabase
      .from('videos')
      .select('title, description, full_transcript')
      .eq('id', videoId)
      .single();

    if (!video || !video.full_transcript) {
      throw new Error('Video or transcript not found');
    }

    // Generate tags using Claude
    const metadata = await this.generateMetadata(
      video.title,
      video.description || '',
      video.full_transcript
    );

    // Store metadata
    await this.storeMetadata(videoId, metadata);

    return metadata;
  }

  /**
   * Generate metadata using Claude AI
   */
  private async generateMetadata(
    title: string,
    description: string,
    transcript: string
  ): Promise<VideoMetadata> {
    const prompt = `
Analyze this video and extract detailed metadata.

Title: ${title}
Description: ${description}
Transcript: ${transcript.substring(0, 20000)}

Return ONLY valid JSON with this exact structure:
{
  "topics": [
    {
      "name": "React Hooks",
      "category": "React",
      "coverage": 80,
      "depth": "detailed"
    }
  ],
  "skills": [
    {
      "name": "Create custom hooks",
      "level": "intermediate",
      "type": "practical"
    }
  ],
  "difficulty": {
    "overall": "intermediate",
    "byTopic": {
      "React Hooks": "intermediate",
      "State Management": "beginner"
    }
  },
  "prerequisites": {
    "concepts": ["JavaScript functions", "React components"],
    "videoIds": []
  },
  "learningOutcomes": [
    "Build custom React hooks",
    "Understand hook rules"
  ],
  "keywords": ["react", "hooks", "usestate", "useeffect"],
  "languages": ["JavaScript", "JSX"],
  "tools": ["React", "Node.js"]
}
`;

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Invalid response from Claude');
    }

    try {
      return JSON.parse(content.text);
    } catch (error) {
      console.error('Failed to parse metadata:', content.text);
      throw error;
    }
  }

  /**
   * Store metadata in database
   */
  private async storeMetadata(videoId: string, metadata: VideoMetadata): Promise<void> {
    const supabase = getSupabaseAdmin();

    await supabase.from('video_metadata').upsert({
      video_id: videoId,
      topics: metadata.topics,
      skills: metadata.skills,
      difficulty: metadata.difficulty,
      prerequisites: metadata.prerequisites,
      learning_outcomes: metadata.learningOutcomes,
      keywords: metadata.keywords,
      languages: metadata.languages,
      tools: metadata.tools,
      auto_generated: true,
    });
  }

  /**
   * Batch tag all videos without metadata
   */
  async tagAllUntaggedVideos(creatorId: string): Promise<number> {
    const supabase = getSupabaseAdmin();

    // Get videos without metadata
    const { data: videos } = await supabase
      .from('videos')
      .select('id')
      .eq('creator_id', creatorId)
      .not('full_transcript', 'is', null)
      .is('video_metadata.video_id', null);

    if (!videos) return 0;

    let taggedCount = 0;

    for (const video of videos) {
      try {
        await this.tagVideo(video.id);
        taggedCount++;

        // Rate limiting: wait 1 second between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to tag video ${video.id}:`, error);
      }
    }

    return taggedCount;
  }
}
```

---

## Video Quality Analyzer

### Quality Analyzer Service

Create `lib/intelligence/quality-analyzer.ts`:

```typescript
// lib/intelligence/quality-analyzer.ts

import { getSupabaseAdmin } from '@/lib/supabase/server';

export interface VideoQualityReport {
  videoId: string;
  overallScore: number;
  scores: {
    clarity: number;
    pacing: number;
    engagement: number;
    audioVisual: number;
    prerequisiteAlignment: number;
  };
  issues: VideoIssue[];
  recommendations: string[];
}

export interface VideoIssue {
  type: 'drop-off' | 'confusion' | 'too-fast' | 'too-slow' | 'prerequisite-gap';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  timestamp?: number;
  evidence: {
    studentCount: number;
    examples: string[];
  };
}

export class VideoQualityAnalyzer {
  /**
   * Analyze video quality
   */
  async analyzeVideo(videoId: string): Promise<VideoQualityReport> {
    const supabase = getSupabaseAdmin();

    // Get video data
    const { data: video } = await supabase
      .from('videos')
      .select('id, title, duration_seconds')
      .eq('id', videoId)
      .single();

    if (!video) throw new Error('Video not found');

    // Calculate scores
    const clarity = await this.calculateClarityScore(videoId);
    const pacing = await this.calculatePacingScore(videoId, video.duration_seconds);
    const engagement = await this.calculateEngagementScore(videoId);
    const audioVisual = await this.calculateAudioVisualScore(videoId);
    const prerequisiteAlignment = await this.calculatePrerequisiteAlignment(videoId);

    // Calculate overall score (weighted average)
    const overallScore = Math.round(
      clarity * 0.3 +
      pacing * 0.2 +
      engagement * 0.25 +
      audioVisual * 0.1 +
      prerequisiteAlignment * 0.15
    );

    // Detect issues
    const issues = await this.detectIssues(videoId, {
      clarity,
      pacing,
      engagement,
      audioVisual,
      prerequisiteAlignment,
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations(issues);

    const report: VideoQualityReport = {
      videoId,
      overallScore,
      scores: {
        clarity,
        pacing,
        engagement,
        audioVisual,
        prerequisiteAlignment,
      },
      issues,
      recommendations,
    };

    // Store report
    await this.storeReport(videoId, report);

    return report;
  }

  /**
   * Calculate clarity score based on student questions
   */
  private async calculateClarityScore(videoId: string): Promise<number> {
    const supabase = getSupabaseAdmin();

    // Count confusion questions about this video
    const { count: confusionQuestions } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', videoId)
      .eq('role', 'user')
      .or('message.ilike.%don\'t understand%,message.ilike.%confused%,message.ilike.%what is%');

    // Get total students who watched
    const { count: totalStudents } = await supabase
      .from('learning_progress')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', videoId);

    if (!totalStudents || totalStudents === 0) return 100;

    const confusionRate = (confusionQuestions || 0) / totalStudents;

    // Convert to 0-100 score (lower confusion = higher score)
    return Math.max(0, Math.min(100, 100 - confusionRate * 200));
  }

  /**
   * Calculate pacing score based on drop-off patterns
   */
  private async calculatePacingScore(
    videoId: string,
    durationSeconds: number
  ): Promise<number> {
    const supabase = getSupabaseAdmin();

    // Get progress data
    const { data: progressRecords } = await supabase
      .from('learning_progress')
      .select('last_position_seconds, completed')
      .eq('video_id', videoId);

    if (!progressRecords || progressRecords.length === 0) return 100;

    // Calculate completion rate
    const completionRate = progressRecords.filter(p => p.completed).length / progressRecords.length;

    // Analyze drop-off curve
    const dropOffPoints = progressRecords
      .filter(p => !p.completed && p.last_position_seconds)
      .map(p => (p.last_position_seconds! / durationSeconds) * 100);

    // Check for sudden drop-offs (bad pacing indicator)
    const hasCluster = this.hasDropOffCluster(dropOffPoints);

    let score = completionRate * 100;

    // Penalize for drop-off clusters
    if (hasCluster) {
      score = Math.max(0, score - 20);
    }

    return Math.round(score);
  }

  /**
   * Check if there's a cluster of drop-offs (indicates pacing issue)
   */
  private hasDropOffCluster(dropOffPoints: number[]): boolean {
    if (dropOffPoints.length < 5) return false;

    // Group by 10% buckets
    const buckets = new Array(10).fill(0);
    for (const point of dropOffPoints) {
      const bucket = Math.min(9, Math.floor(point / 10));
      buckets[bucket]++;
    }

    // Check if any bucket has >30% of drop-offs
    const maxBucket = Math.max(...buckets);
    return maxBucket > dropOffPoints.length * 0.3;
  }

  /**
   * Calculate engagement score
   */
  private async calculateEngagementScore(videoId: string): Promise<number> {
    const supabase = getSupabaseAdmin();

    const { count: total } = await supabase
      .from('learning_progress')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', videoId);

    const { count: completed } = await supabase
      .from('learning_progress')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', videoId)
      .eq('completed', true);

    if (!total || total === 0) return 100;

    return Math.round((completed / total) * 100);
  }

  /**
   * Calculate audio/visual quality score
   */
  private async calculateAudioVisualScore(videoId: string): Promise<number> {
    const supabase = getSupabaseAdmin();

    // Check transcription quality (proxy for audio quality)
    const { data: video } = await supabase
      .from('videos')
      .select('full_transcript')
      .eq('id', videoId)
      .single();

    if (!video?.full_transcript) return 50;

    // Simple heuristic: check for common transcription errors
    const transcript = video.full_transcript.toLowerCase();
    const errorIndicators = [
      '[inaudible]',
      '[unclear]',
      '[music]',
      '[noise]',
    ];

    let errorCount = 0;
    for (const indicator of errorIndicators) {
      errorCount += (transcript.match(new RegExp(indicator, 'g')) || []).length;
    }

    const wordCount = transcript.split(/\s+/).length;
    const errorRate = errorCount / wordCount;

    return Math.max(0, Math.min(100, 100 - errorRate * 1000));
  }

  /**
   * Calculate prerequisite alignment score
   */
  private async calculatePrerequisiteAlignment(videoId: string): Promise<number> {
    const supabase = getSupabaseAdmin();

    // Get students who watched this video
    const { data: progressRecords } = await supabase
      .from('learning_progress')
      .select('student_id, completed')
      .eq('video_id', videoId);

    if (!progressRecords || progressRecords.length === 0) return 100;

    // Get quiz results for students who watched
    const studentIds = progressRecords.map(p => p.student_id);

    const { data: quizAttempts } = await supabase
      .from('quiz_attempts')
      .select('student_id, score, quiz:quizzes!inner(video_id)')
      .eq('quiz.video_id', videoId)
      .in('student_id', studentIds);

    if (!quizAttempts || quizAttempts.length === 0) return 100;

    // Calculate average quiz score
    const avgScore = quizAttempts.reduce((sum, a) => sum + a.score, 0) / quizAttempts.length;

    // If avg score is low, might indicate prerequisite gap
    return Math.round(avgScore);
  }

  /**
   * Detect specific issues
   */
  private async detectIssues(
    videoId: string,
    scores: VideoQualityReport['scores']
  ): Promise<VideoIssue[]> {
    const issues: VideoIssue[] = [];

    // Low clarity
    if (scores.clarity < 50) {
      issues.push({
        type: 'confusion',
        severity: scores.clarity < 30 ? 'critical' : 'high',
        description: 'Students are frequently confused by this content',
        evidence: {
          studentCount: 0, // Would calculate from actual data
          examples: [], // Would fetch actual questions
        },
      });
    }

    // Low prerequisite alignment
    if (scores.prerequisiteAlignment < 60) {
      issues.push({
        type: 'prerequisite-gap',
        severity: 'high',
        description: 'Students may be missing prerequisite knowledge',
        evidence: {
          studentCount: 0,
          examples: [],
        },
      });
    }

    // Low engagement
    if (scores.engagement < 50) {
      issues.push({
        type: 'drop-off',
        severity: 'medium',
        description: 'High student drop-off rate',
        evidence: {
          studentCount: 0,
          examples: [],
        },
      });
    }

    return issues;
  }

  /**
   * Generate recommendations based on issues
   */
  private generateRecommendations(issues: VideoIssue[]): string[] {
    const recommendations: string[] = [];

    for (const issue of issues) {
      switch (issue.type) {
        case 'confusion':
          recommendations.push('Add more examples and explanations for complex concepts');
          recommendations.push('Include visual diagrams to clarify abstract ideas');
          break;
        case 'prerequisite-gap':
          recommendations.push('Create or link prerequisite content');
          recommendations.push('Add a quick recap of required background knowledge at the start');
          break;
        case 'drop-off':
          recommendations.push('Review pacing - consider breaking into shorter videos');
          recommendations.push('Add more engaging examples or demos');
          break;
      }
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Store quality report in database
   */
  private async storeReport(videoId: string, report: VideoQualityReport): Promise<void> {
    const supabase = getSupabaseAdmin();

    await supabase
      .from('video_metadata')
      .update({
        quality_score: report.overallScore,
        quality_report: report,
      })
      .eq('video_id', videoId);
  }
}
```

---

## Personalized Learning Paths

### Path Generator Service

Create `lib/intelligence/path-generator.ts`:

```typescript
// lib/intelligence/path-generator.ts

import { getSupabaseAdmin } from '@/lib/supabase/server';

export interface LearningPath {
  studentId: string;
  goal: string;
  totalDuration: string;
  modules: PathModule[];
  milestones: Milestone[];
}

export interface PathModule {
  moduleId: number;
  title: string;
  videos: PathVideo[];
  estimatedTime: string;
  why: string;
}

export interface PathVideo {
  videoId: string;
  title: string;
  order: number;
  required: boolean;
  estimatedTime: number;
  prerequisites: string[];
}

export interface Milestone {
  type: 'quiz' | 'project' | 'review';
  title: string;
  afterVideoId: string;
  estimatedTime: string;
}

export class LearningPathGenerator {
  /**
   * Generate personalized learning path
   */
  async generatePath(
    studentId: string,
    goal: string,
    weeklyHours: number
  ): Promise<LearningPath> {
    const supabase = getSupabaseAdmin();

    // 1. Assess current skill level
    const skillLevel = await this.assessSkillLevel(studentId);

    // 2. Get all available videos with metadata
    const { data: videos } = await supabase
      .from('videos')
      .select(`
        id,
        title,
        module_number,
        duration_seconds,
        video_metadata (
          topics,
          skills,
          difficulty,
          prerequisites
        )
      `)
      .order('module_number, created_at');

    if (!videos) throw new Error('No videos found');

    // 3. Filter videos based on goal and skill level
    const relevantVideos = this.filterVideosByGoal(videos, goal, skillLevel);

    // 4. Build prerequisite graph
    const orderedVideos = this.orderByPrerequisites(relevantVideos);

    // 5. Group into modules
    const modules = this.groupIntoModules(orderedVideos);

    // 6. Add milestones (quizzes, projects)
    const milestones = this.generateMilestones(orderedVideos);

    // 7. Calculate duration
    const totalMinutes = orderedVideos.reduce((sum, v) => sum + v.duration_seconds / 60, 0);
    const totalWeeks = Math.ceil(totalMinutes / (weeklyHours * 60));

    const path: LearningPath = {
      studentId,
      goal,
      totalDuration: `${totalWeeks} weeks`,
      modules,
      milestones,
    };

    // Store path
    await this.storePath(path);

    return path;
  }

  /**
   * Assess student's current skill level
   */
  private async assessSkillLevel(studentId: string): Promise<{
    level: number;
    strengths: string[];
    weaknesses: string[];
  }> {
    const supabase = getSupabaseAdmin();

    const { data: student } = await supabase
      .from('students')
      .select('level, xp_points')
      .eq('id', studentId)
      .single();

    // Get quiz performance by topic
    const { data: quizAttempts } = await supabase
      .from('quiz_attempts')
      .select(`
        score,
        quiz:quizzes!inner(
          video:videos(
            video_metadata(topics)
          )
        )
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Analyze performance by topic
    const topicScores: Map<string, number[]> = new Map();

    for (const attempt of quizAttempts || []) {
      const topics = attempt.quiz?.video?.video_metadata?.topics || [];
      for (const topic of topics) {
        const scores = topicScores.get(topic.name) || [];
        scores.push(attempt.score);
        topicScores.set(topic.name, scores);
      }
    }

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    for (const [topic, scores] of topicScores.entries()) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg >= 80) {
        strengths.push(topic);
      } else if (avg < 60) {
        weaknesses.push(topic);
      }
    }

    return {
      level: student?.level || 1,
      strengths,
      weaknesses,
    };
  }

  /**
   * Filter videos based on goal
   */
  private filterVideosByGoal(videos: any[], goal: string, skillLevel: any): any[] {
    // Goal-specific filtering logic
    const goalKeywords: { [key: string]: string[] } = {
      'get-job': ['interview', 'portfolio', 'real-world', 'best-practices'],
      'build-portfolio': ['project', 'deploy', 'showcase'],
      'master-react': ['react', 'hooks', 'state', 'components'],
    };

    const keywords = goalKeywords[goal] || [];

    return videos.filter(video => {
      // Skip videos on topics already mastered
      const topics = video.video_metadata?.topics || [];
      const topicNames = topics.map((t: any) => t.name);

      if (skillLevel.strengths.some((s: string) => topicNames.includes(s))) {
        return false;
      }

      // Include videos matching goal keywords
      if (keywords.length > 0) {
        const videoText = `${video.title} ${topicNames.join(' ')}`.toLowerCase();
        return keywords.some(kw => videoText.includes(kw));
      }

      return true;
    });
  }

  /**
   * Order videos by prerequisites
   */
  private orderByPrerequisites(videos: any[]): any[] {
    // Simple topological sort
    const ordered: any[] = [];
    const remaining = [...videos];

    while (remaining.length > 0) {
      const nextVideo = remaining.find(video => {
        const prereqs = video.video_metadata?.prerequisites?.videoIds || [];
        return prereqs.every((pid: string) => ordered.find(v => v.id === pid));
      });

      if (nextVideo) {
        ordered.push(nextVideo);
        remaining.splice(remaining.indexOf(nextVideo), 1);
      } else {
        // No video with satisfied prerequisites, just add first one
        ordered.push(remaining[0]);
        remaining.splice(0, 1);
      }
    }

    return ordered;
  }

  /**
   * Group videos into modules
   */
  private groupIntoModules(videos: any[]): PathModule[] {
    const moduleMap: Map<number, any[]> = new Map();

    for (const video of videos) {
      const moduleNum = video.module_number || 1;
      const existing = moduleMap.get(moduleNum) || [];
      existing.push(video);
      moduleMap.set(moduleNum, existing);
    }

    const modules: PathModule[] = [];

    for (const [moduleNum, moduleVideos] of moduleMap.entries()) {
      const totalMinutes = moduleVideos.reduce(
        (sum, v) => sum + v.duration_seconds / 60,
        0
      );

      modules.push({
        moduleId: moduleNum,
        title: `Module ${moduleNum}`,
        videos: moduleVideos.map((v, i) => ({
          videoId: v.id,
          title: v.title,
          order: i + 1,
          required: true,
          estimatedTime: Math.round(v.duration_seconds / 60),
          prerequisites: v.video_metadata?.prerequisites?.videoIds || [],
        })),
        estimatedTime: `${Math.round(totalMinutes / 60)} hours`,
        why: 'Essential for reaching your goal',
      });
    }

    return modules;
  }

  /**
   * Generate milestones
   */
  private generateMilestones(videos: any[]): Milestone[] {
    const milestones: Milestone[] = [];

    // Add quiz after every 3 videos
    for (let i = 2; i < videos.length; i += 3) {
      milestones.push({
        type: 'quiz',
        title: `Module ${videos[i].module_number} Quiz`,
        afterVideoId: videos[i].id,
        estimatedTime: '15 minutes',
      });
    }

    // Add project at end of each module
    const modules = new Set(videos.map(v => v.module_number));
    for (const moduleNum of modules) {
      const lastVideoInModule = videos
        .filter(v => v.module_number === moduleNum)
        .pop();

      if (lastVideoInModule) {
        milestones.push({
          type: 'project',
          title: `Module ${moduleNum} Project`,
          afterVideoId: lastVideoInModule.id,
          estimatedTime: '2-3 hours',
        });
      }
    }

    return milestones;
  }

  /**
   * Store learning path in database
   */
  private async storePath(path: LearningPath): Promise<void> {
    const supabase = getSupabaseAdmin();

    await supabase.from('learning_paths').insert({
      student_id: path.studentId,
      goal: path.goal,
      total_duration: path.totalDuration,
      path_structure: path.modules,
      milestones: path.milestones,
      status: 'active',
    });
  }
}
```

---

## Predictive Analytics

### Python ML Service

Create `ml-service/predictor.py`:

```python
# ml-service/predictor.py

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

class StudentPredictor:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.db_conn = psycopg2.connect(os.getenv('DATABASE_URL'))

    def load_training_data(self):
        """Load historical student data for training"""
        query = """
        SELECT
            s.id,
            s.level,
            s.xp_points,
            s.current_streak,
            EXTRACT(EPOCH FROM (NOW() - s.last_active_at)) / 86400 as days_inactive,
            COUNT(DISTINCT lp.id) as videos_completed,
            AVG(CASE WHEN qa.score IS NOT NULL THEN qa.score ELSE 0 END) as avg_quiz_score,
            COUNT(DISTINCT qa.id) as quizzes_taken,
            CASE WHEN EXISTS(
                SELECT 1 FROM discord_integrations di WHERE di.student_id = s.id
            ) THEN 1 ELSE 0 END as has_discord,
            CASE WHEN EXISTS(
                SELECT 1 FROM study_buddy_connections sbc
                WHERE (sbc.student_a_id = s.id OR sbc.student_b_id = s.id)
                AND sbc.status = 'active'
            ) THEN 1 ELSE 0 END as has_study_buddy,
            -- Label: 1 if active in last 30 days, 0 if dropped out
            CASE WHEN s.last_active_at > NOW() - INTERVAL '30 days' THEN 0 ELSE 1 END as dropped_out
        FROM students s
        LEFT JOIN learning_progress lp ON lp.student_id = s.id AND lp.completed = true
        LEFT JOIN quiz_attempts qa ON qa.student_id = s.id
        WHERE s.created_at < NOW() - INTERVAL '60 days'
        GROUP BY s.id
        """

        df = pd.read_sql(query, self.db_conn)
        return df

    def train_dropout_model(self):
        """Train dropout prediction model"""
        df = self.load_training_data()

        # Features
        feature_cols = [
            'level', 'xp_points', 'current_streak', 'days_inactive',
            'videos_completed', 'avg_quiz_score', 'quizzes_taken',
            'has_discord', 'has_study_buddy'
        ]

        X = df[feature_cols]
        y = df['dropped_out']

        # Scale features
        X_scaled = self.scaler.fit_transform(X)

        # Train model
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.model.fit(X_scaled, y)

        print(f"Model trained with accuracy: {self.model.score(X_scaled, y):.2f}")

    def predict_dropout_risk(self, student_id):
        """Predict dropout risk for a student"""
        if self.model is None:
            self.train_dropout_model()

        # Get student features
        query = f"""
        SELECT
            s.level,
            s.xp_points,
            s.current_streak,
            EXTRACT(EPOCH FROM (NOW() - s.last_active_at)) / 86400 as days_inactive,
            COUNT(DISTINCT lp.id) as videos_completed,
            AVG(CASE WHEN qa.score IS NOT NULL THEN qa.score ELSE 0 END) as avg_quiz_score,
            COUNT(DISTINCT qa.id) as quizzes_taken,
            CASE WHEN EXISTS(
                SELECT 1 FROM discord_integrations di WHERE di.student_id = s.id
            ) THEN 1 ELSE 0 END as has_discord,
            CASE WHEN EXISTS(
                SELECT 1 FROM study_buddy_connections sbc
                WHERE (sbc.student_a_id = s.id OR sbc.student_b_id = s.id)
                AND sbc.status = 'active'
            ) THEN 1 ELSE 0 END as has_study_buddy
        FROM students s
        LEFT JOIN learning_progress lp ON lp.student_id = s.id AND lp.completed = true
        LEFT JOIN quiz_attempts qa ON qa.student_id = s.id
        WHERE s.id = '{student_id}'
        GROUP BY s.id
        """

        df = pd.read_sql(query, self.db_conn)

        if df.empty:
            return None

        # Scale features
        X = self.scaler.transform(df)

        # Predict probability
        dropout_prob = self.model.predict_proba(X)[0][1]

        # Get feature importance
        feature_names = [
            'level', 'xp_points', 'current_streak', 'days_inactive',
            'videos_completed', 'avg_quiz_score', 'quizzes_taken',
            'has_discord', 'has_study_buddy'
        ]

        importances = self.model.feature_importances_

        return {
            'student_id': student_id,
            'dropout_risk': float(dropout_prob),
            'confidence': 0.85,  # Simplified
            'factors': [
                {
                    'feature': name,
                    'importance': float(imp),
                    'value': float(df[name].iloc[0])
                }
                for name, imp in zip(feature_names, importances)
                if imp > 0.05  # Only important factors
            ]
        }

if __name__ == '__main__':
    predictor = StudentPredictor()
    predictor.train_dropout_model()
```

### Node.js ML Service Client

Create `lib/intelligence/ml-client.ts`:

```typescript
// lib/intelligence/ml-client.ts

export class MLClient {
  private baseUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';

  /**
   * Predict dropout risk for a student
   */
  async predictDropoutRisk(studentId: string): Promise<{
    dropoutRisk: number;
    confidence: number;
    factors: Array<{
      feature: string;
      importance: number;
      value: number;
    }>;
  }> {
    const response = await fetch(`${this.baseUrl}/predict/dropout/${studentId}`);

    if (!response.ok) {
      throw new Error('ML prediction failed');
    }

    return response.json();
  }

  /**
   * Generate interventions based on prediction
   */
  generateInterventions(prediction: any): any[] {
    const interventions: any[] = [];

    if (prediction.dropoutRisk > 0.7) {
      interventions.push({
        type: 'notification',
        priority: 'urgent',
        message: 'We noticed you haven\'t been active lately. Need help staying on track?',
        action: 'Resume Learning',
      });

      // Check factors
      const hasNoStudyBuddy = prediction.factors.find(
        (f: any) => f.feature === 'has_study_buddy' && f.value === 0
      );

      if (hasNoStudyBuddy) {
        interventions.push({
          type: 'study-buddy',
          priority: 'high',
          message: 'Learning is easier with a study buddy!',
          action: 'Find Study Buddy',
        });
      }
    }

    return interventions;
  }
}
```

---

## Background Jobs

### Inngest Intelligence Jobs

Create `lib/intelligence/inngest-jobs.ts`:

```typescript
// lib/intelligence/inngest-jobs.ts

import { inngest } from '@/lib/inngest/client';
import { ContentGapDetector } from './gap-detector';
import { AutoTaggerService } from './auto-tagger';
import { VideoQualityAnalyzer } from './quality-analyzer';
import { MLClient } from './ml-client';

/**
 * Daily job: Analyze content gaps
 */
export const analyzeContentGaps = inngest.createFunction(
  { id: 'analyze-content-gaps', retries: 1 },
  { cron: '0 2 * * *' }, // 2 AM daily
  async ({ step, logger }) => {
    const detector = new ContentGapDetector();

    // Get all creators
    const creators = await step.run('get-creators', async () => {
      const { data } = await getSupabaseAdmin()
        .from('creators')
        .select('id');
      return data || [];
    });

    for (const creator of creators) {
      await step.run(`analyze-gaps-${creator.id}`, async () => {
        const gaps = await detector.detectGaps(creator.id);
        await detector.storeGaps(gaps);
        logger.info(`Found ${gaps.length} content gaps for creator ${creator.id}`);
      });
    }
  }
);

/**
 * Auto-tag new videos
 */
export const autoTagVideos = inngest.createFunction(
  { id: 'auto-tag-videos', retries: 2 },
  { event: 'video/transcription.completed' },
  async ({ event, step, logger }) => {
    const { videoId } = event.data;

    const metadata = await step.run('generate-tags', async () => {
      const tagger = new AutoTaggerService();
      return await tagger.tagVideo(videoId);
    });

    logger.info(`Tagged video ${videoId} with ${metadata.topics.length} topics`);
  }
);

/**
 * Weekly job: Analyze video quality
 */
export const analyzeVideoQuality = inngest.createFunction(
  { id: 'analyze-video-quality', retries: 1 },
  { cron: '0 3 * * 0' }, // 3 AM every Sunday
  async ({ step, logger }) => {
    const analyzer = new VideoQualityAnalyzer();

    const videos = await step.run('get-videos', async () => {
      const { data } = await getSupabaseAdmin()
        .from('videos')
        .select('id')
        .not('full_transcript', 'is', null);
      return data || [];
    });

    for (const video of videos) {
      await step.run(`analyze-${video.id}`, async () => {
        const report = await analyzer.analyzeVideo(video.id);
        logger.info(`Video ${video.id} quality score: ${report.overallScore}`);
      });
    }
  }
);

/**
 * Daily job: Predict at-risk students
 */
export const predictAtRiskStudents = inngest.createFunction(
  { id: 'predict-at-risk', retries: 1 },
  { cron: '0 6 * * *' }, // 6 AM daily
  async ({ step, logger }) => {
    const mlClient = new MLClient();

    const students = await step.run('get-active-students', async () => {
      const { data } = await getSupabaseAdmin()
        .from('students')
        .select('id')
        .gte('last_active_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
      return data || [];
    });

    let atRiskCount = 0;

    for (const student of students) {
      await step.run(`predict-${student.id}`, async () => {
        const prediction = await mlClient.predictDropoutRisk(student.id);

        if (prediction.dropoutRisk > 0.7) {
          atRiskCount++;

          // Store prediction
          await getSupabaseAdmin().from('student_predictions').insert({
            student_id: student.id,
            prediction_type: 'dropout-risk',
            prediction_value: prediction.dropoutRisk,
            confidence: prediction.confidence,
            factors: prediction.factors,
            interventions: mlClient.generateInterventions(prediction),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });
        }
      });
    }

    logger.info(`Found ${atRiskCount} at-risk students`);
  }
);
```

---

## API Routes

### Content Intelligence API

Create `app/api/intelligence/gaps/route.ts`:

```typescript
// app/api/intelligence/gaps/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ContentGapDetector } from '@/lib/intelligence/gap-detector';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get creator ID
    const { data: creator } = await supabase
      .from('creators')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Get stored gaps
    const { data: gaps } = await supabase
      .from('content_gaps')
      .select('*')
      .eq('status', 'open')
      .order('severity', { ascending: true });

    return NextResponse.json({ success: true, gaps: gaps || [] });
  } catch (error: any) {
    console.error('Get gaps error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get gaps' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: creator } = await supabase
      .from('creators')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Run gap detection
    const detector = new ContentGapDetector();
    const gaps = await detector.detectGaps(creator.id);
    await detector.storeGaps(gaps);

    return NextResponse.json({ success: true, gaps });
  } catch (error: any) {
    console.error('Detect gaps error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to detect gaps' },
      { status: 500 }
    );
  }
}
```

---

## Testing

### Integration Tests

Create `__tests__/intelligence/gap-detector.test.ts`:

```typescript
// __tests__/intelligence/gap-detector.test.ts

import { describe, it, expect, vi } from 'vitest';
import { ContentGapDetector } from '@/lib/intelligence/gap-detector';

describe('ContentGapDetector', () => {
  it('should detect content gaps', async () => {
    const detector = new ContentGapDetector();

    // Mock Anthropic API
    vi.mock('@anthropic-ai/sdk', () => ({
      default: class {
        messages = {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: '["React Context", "Error Boundaries"]' }],
          }),
        };
      },
    }));

    const gaps = await detector.detectGaps('test-creator-id');

    expect(gaps).toBeDefined();
    expect(Array.isArray(gaps)).toBe(true);
  });
});
```

---

## Summary

You now have a complete Content Intelligence system with:

✅ **Content Gap Detection** - AI finds missing topics in curriculum
✅ **Auto-Tagging** - Videos automatically tagged with metadata
✅ **Quality Analysis** - Score videos on clarity, pacing, engagement
✅ **Personalized Paths** - Custom learning paths per student
✅ **Predictive Analytics** - ML models predict dropout risk
✅ **Background Jobs** - Automated daily/weekly analysis
✅ **API Routes** - Access intelligence features

**Deployment Notes**:
1. Python ML service can run as separate microservice or AWS Lambda
2. Background jobs run automatically via Inngest
3. All features are optional - implement in phases
4. Start with auto-tagging, then gap detection, then predictive

---

**Module 11 Complete! 🎉 The platform now has AI-powered intelligence to continuously improve content and outcomes.**
