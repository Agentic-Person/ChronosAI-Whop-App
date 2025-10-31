/**
 * Knowledge Gap Detector
 * Uses AI to identify knowledge gaps in curriculum and student understanding
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { getClaudeModel } from '@/lib/config/ai-models';

export interface KnowledgeGap {
  concept: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: {
    mentionedInVideos: number;
    questionsAsked: number;
    prerequisiteFor: string[];
    confusedStudents: number;
  };
  recommendations: string[];
}

export interface ConceptWeakness {
  concept: string;
  students_affected: number;
  avg_score: number;
  common_mistakes: string[];
}

export interface ConfusionPattern {
  topic: string;
  question_count: number;
  example_questions: string[];
  video_ids: string[];
}

export interface Recommendation {
  type: 'review_video' | 'practice_quiz' | 'read_documentation' | 'study_buddy';
  title: string;
  description: string;
  resources: {
    video_id?: string;
    quiz_id?: string;
    url?: string;
  };
  priority: number; // 1-5
}

export class GapDetector {
  private anthropic: Anthropic;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is required for Gap Detector');
    }
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Detect knowledge gaps for a specific student
   */
  async detectGaps(studentId: string): Promise<KnowledgeGap[]> {
    const supabase = createClient();

    // Get student's quiz failures
    const weaknesses = await this.analyzeQuizFailures(studentId);

    // Get student's chat questions showing confusion
    const confusionPatterns = await this.analyzeChatQuestions(studentId);

    // Combine into knowledge gaps
    const gaps: KnowledgeGap[] = [];

    // Process quiz failures
    for (const weakness of weaknesses) {
      gaps.push({
        concept: weakness.concept,
        severity: this.calculateSeverity(weakness.avg_score, weakness.students_affected),
        evidence: {
          mentionedInVideos: 0,
          questionsAsked: 0,
          prerequisiteFor: [],
          confusedStudents: weakness.students_affected,
        },
        recommendations: await this.generateRecommendations(weakness.concept, studentId),
      });
    }

    // Process confusion patterns
    for (const pattern of confusionPatterns) {
      const existing = gaps.find(g => g.concept === pattern.topic);
      if (existing) {
        existing.evidence.questionsAsked += pattern.question_count;
        existing.evidence.mentionedInVideos = pattern.video_ids.length;
      } else {
        gaps.push({
          concept: pattern.topic,
          severity: this.calculateSeverityFromQuestions(pattern.question_count),
          evidence: {
            mentionedInVideos: pattern.video_ids.length,
            questionsAsked: pattern.question_count,
            prerequisiteFor: [],
            confusedStudents: 1,
          },
          recommendations: await this.generateRecommendations(pattern.topic, studentId),
        });
      }
    }

    // Sort by severity
    gaps.sort((a, b) => {
      const severityOrder: Record<string, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
      };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    // Store gaps in database
    await this.storeGaps(studentId, gaps);

    return gaps;
  }

  /**
   * Analyze quiz failures to identify weak concepts
   */
  async analyzeQuizFailures(studentId: string): Promise<ConceptWeakness[]> {
    const supabase = createClient();

    // Get failed quiz attempts (score < 60%)
    const { data: failedAttempts } = await supabase
      .from('quiz_attempts')
      .select(`
        id,
        score,
        answers,
        quiz:quizzes!inner(
          id,
          title,
          questions,
          video:videos(id, title)
        )
      `)
      .eq('student_id', studentId)
      .lt('score', 60)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!failedAttempts || failedAttempts.length === 0) {
      return [];
    }

    // Use AI to extract concepts from failed questions
    const weaknesses: Map<string, ConceptWeakness> = new Map();

    for (const attempt of failedAttempts) {
      try {
        const concepts = await this.extractConceptsFromQuiz(
          attempt.quiz.title,
          attempt.quiz.questions,
          attempt.answers
        );

        for (const concept of concepts) {
          const existing = weaknesses.get(concept);
          if (existing) {
            existing.students_affected += 1;
            existing.avg_score = (existing.avg_score + attempt.score) / 2;
          } else {
            weaknesses.set(concept, {
              concept,
              students_affected: 1,
              avg_score: attempt.score,
              common_mistakes: [],
            });
          }
        }
      } catch (error) {
        console.error('Failed to extract concepts from quiz:', error);
      }
    }

    return Array.from(weaknesses.values());
  }

  /**
   * Extract concepts from quiz using AI
   */
  private async extractConceptsFromQuiz(
    quizTitle: string,
    questions: any[],
    answers: any[]
  ): Promise<string[]> {
    const prompt = `Analyze this quiz and identify the core programming/learning concepts being tested.

Quiz Title: ${quizTitle}

Questions: ${JSON.stringify(questions.slice(0, 5))}

Return ONLY a JSON array of concept names (max 5), like:
["React Hooks", "State Management", "useEffect Dependencies"]`;

    try {
      const response = await this.anthropic.messages.create({
        model: getClaudeModel(),
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') return [];

      const concepts = JSON.parse(content.text);
      return Array.isArray(concepts) ? concepts : [];
    } catch (error) {
      console.error('Failed to extract concepts:', error);
      return [];
    }
  }

  /**
   * Analyze chat questions to find confusion patterns
   */
  async analyzeChatQuestions(studentId: string): Promise<ConfusionPattern[]> {
    const supabase = createClient();

    // Get recent chat questions from student
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('message, video_id, created_at')
      .eq('student_id', studentId)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!messages || messages.length === 0) {
      return [];
    }

    // Filter confusion signals
    const confusionKeywords = [
      "don't understand",
      'confused',
      'what is',
      'why does',
      'how do',
      "doesn't make sense",
      'stuck on',
      'help with',
    ];

    const confusedMessages = messages.filter((msg) =>
      confusionKeywords.some((kw) => msg.message.toLowerCase().includes(kw))
    );

    if (confusedMessages.length === 0) {
      return [];
    }

    // Use AI to extract topics
    const topics = await this.extractTopicsFromQuestions(
      confusedMessages.map((m) => m.message)
    );

    // Group by topic
    const patterns: Map<string, ConfusionPattern> = new Map();

    for (const msg of confusedMessages) {
      const matchedTopic = topics.find((t) =>
        msg.message.toLowerCase().includes(t.toLowerCase())
      );

      if (matchedTopic) {
        const existing = patterns.get(matchedTopic);
        if (existing) {
          existing.question_count += 1;
          existing.example_questions.push(msg.message);
          if (msg.video_id && !existing.video_ids.includes(msg.video_id)) {
            existing.video_ids.push(msg.video_id);
          }
        } else {
          patterns.set(matchedTopic, {
            topic: matchedTopic,
            question_count: 1,
            example_questions: [msg.message],
            video_ids: msg.video_id ? [msg.video_id] : [],
          });
        }
      }
    }

    return Array.from(patterns.values());
  }

  /**
   * Extract topics from student questions using AI
   */
  private async extractTopicsFromQuestions(questions: string[]): Promise<string[]> {
    const prompt = `Analyze these student questions and identify the main programming/learning topics they're confused about.

Questions:
${questions.slice(0, 20).join('\n')}

Return ONLY a JSON array of topic names (max 5), like:
["React Hooks", "Async/Await", "CSS Flexbox"]`;

    try {
      const response = await this.anthropic.messages.create({
        model: getClaudeModel(),
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') return [];

      const topics = JSON.parse(content.text);
      return Array.isArray(topics) ? topics : [];
    } catch (error) {
      console.error('Failed to extract topics:', error);
      return [];
    }
  }

  /**
   * Generate recommendations for closing a knowledge gap
   */
  private async generateRecommendations(
    concept: string,
    studentId: string
  ): Promise<string[]> {
    const supabase = createClient();

    const recommendations: string[] = [];

    // Find videos covering this concept
    const { data: videos } = await supabase
      .from('videos')
      .select('id, title')
      .ilike('title', `%${concept}%`)
      .limit(3);

    if (videos && videos.length > 0) {
      recommendations.push(`Review video: "${videos[0].title}"`);
    }

    // Generic recommendations
    recommendations.push(`Practice more problems related to ${concept}`);
    recommendations.push(`Ask your instructor or study buddy about ${concept}`);

    return recommendations;
  }

  /**
   * Calculate severity from quiz score
   */
  private calculateSeverity(
    avgScore: number,
    studentsAffected: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (avgScore < 40) return 'critical';
    if (avgScore < 50 || studentsAffected > 5) return 'high';
    if (avgScore < 60) return 'medium';
    return 'low';
  }

  /**
   * Calculate severity from question count
   */
  private calculateSeverityFromQuestions(
    questionCount: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (questionCount >= 10) return 'critical';
    if (questionCount >= 5) return 'high';
    if (questionCount >= 3) return 'medium';
    return 'low';
  }

  /**
   * Store knowledge gaps in database
   */
  private async storeGaps(studentId: string, gaps: KnowledgeGap[]): Promise<void> {
    const supabase = createClient();

    // Clear old gaps for this student
    await supabase
      .from('knowledge_gaps')
      .delete()
      .eq('student_id', studentId)
      .eq('status', 'open');

    // Insert new gaps
    if (gaps.length > 0) {
      const records = gaps.map((gap) => ({
        student_id: studentId,
        concept: gap.concept,
        severity: gap.severity,
        evidence: gap.evidence,
        recommendations: gap.recommendations,
        status: 'open',
      }));

      await supabase.from('knowledge_gaps').insert(records);
    }
  }

  /**
   * Get recommendations for remediating a gap
   */
  async recommendRemediation(gap: KnowledgeGap, studentId: string): Promise<Recommendation[]> {
    const supabase = createClient();
    const recommendations: Recommendation[] = [];

    // Find relevant videos
    const { data: videos } = await supabase
      .from('videos')
      .select('id, title')
      .ilike('title', `%${gap.concept}%`)
      .limit(2);

    if (videos && videos.length > 0) {
      for (const video of videos) {
        recommendations.push({
          type: 'review_video',
          title: `Review: ${video.title}`,
          description: `Watch this video again to strengthen understanding of ${gap.concept}`,
          resources: { video_id: video.id },
          priority: gap.severity === 'critical' ? 5 : gap.severity === 'high' ? 4 : 3,
        });
      }
    }

    // Recommend practice quiz
    if (gap.severity === 'high' || gap.severity === 'critical') {
      recommendations.push({
        type: 'practice_quiz',
        title: `Practice Quiz: ${gap.concept}`,
        description: `Test your understanding with targeted practice questions`,
        resources: {},
        priority: 4,
      });
    }

    // Recommend study buddy if struggling
    if (gap.severity === 'critical') {
      recommendations.push({
        type: 'study_buddy',
        title: 'Find a Study Buddy',
        description: `Connect with a peer to work through ${gap.concept} together`,
        resources: {},
        priority: 3,
      });
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }
}
