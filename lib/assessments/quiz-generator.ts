/**
 * AI Quiz Generator
 * Uses Claude API to generate quizzes from video content
 *
 * Features:
 * - Generate multiple choice, true/false, short answer questions
 * - Extract key concepts from transcripts
 * - Difficulty levels (beginner, intermediate, advanced)
 * - Automatic answer key generation
 * - Relevance validation
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/utils/supabase-client';
import { logger } from '@/lib/infrastructure/monitoring/logger';
import { Quiz, QuizQuestion } from '@/types/database';

// Initialize Claude client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// =====================================================
// Types
// =====================================================

export interface QuizOptions {
  questionCount: number; // 5-20
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  questionTypes: ('multiple_choice' | 'true_false' | 'short_answer' | 'code_challenge')[];
  focusTopics?: string[]; // Optional topic filtering
  passingScore?: number; // Default 70%
  timeLimitMinutes?: number; // Optional time limit
}

export interface GeneratedQuestion {
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'code-challenge';
  question: string;
  options?: string[]; // For MC and T/F
  correct_answer: string | string[];
  explanation: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  topic?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
}

export interface AnswerKey {
  quiz_id: string;
  answers: {
    question_id: string;
    correct_answer: string | string[];
    explanation: string;
  }[];
}

// =====================================================
// Main Functions
// =====================================================

/**
 * Generate a quiz from video content using Claude AI
 */
export async function generateQuiz(
  videoIds: string[],
  options: QuizOptions,
  creatorId: string
): Promise<Quiz> {
  try {
    logger.info('Generating quiz', { videoIds, options, creatorId });

    // 1. Fetch video transcripts
    const transcripts = await fetchVideoTranscripts(videoIds);

    if (transcripts.length === 0) {
      throw new Error('No transcripts available for selected videos');
    }

    // 2. Extract key concepts (optional preprocessing)
    const concepts = options.focusTopics
      ? options.focusTopics
      : await extractKeyConcepts(transcripts, options.difficulty);

    // 3. Generate questions using Claude
    const questions = await generateQuestions(
      transcripts,
      concepts,
      options
    );

    // 4. Validate questions
    const validation = await validateQuestions(questions);

    if (!validation.valid) {
      throw new Error(`Quiz validation failed: ${validation.issues.join(', ')}`);
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      logger.warn('Quiz generation warnings', { warnings: validation.warnings });
    }

    // 5. Create quiz in database
    const quiz = await createQuizInDatabase(
      {
        creator_id: creatorId,
        title: `Quiz: ${options.difficulty} - ${new Date().toLocaleDateString()}`,
        description: `Auto-generated quiz covering ${concepts.slice(0, 3).join(', ')}`,
        video_ids: videoIds,
        difficulty: mapDifficultyToQuizDifficulty(options.difficulty),
        questions: questions.map((q, idx) => ({
          id: `q_${idx + 1}`,
          type: q.type,
          question: q.question,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          points: q.points,
        })),
        passing_score: options.passingScore || 70,
        time_limit_minutes: options.timeLimitMinutes,
      }
    );

    logger.info('Quiz generated successfully', { quiz_id: quiz.id });

    return quiz;
  } catch (error) {
    logger.error('Quiz generation failed', { error, videoIds, options });
    throw error;
  }
}

/**
 * Validate quiz questions for quality and correctness
 */
export async function validateQuestions(
  questions: GeneratedQuestion[]
): Promise<ValidationResult> {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check minimum question count
  if (questions.length < 3) {
    issues.push('Quiz must have at least 3 questions');
  }

  // Validate each question
  questions.forEach((q, idx) => {
    const qNum = idx + 1;

    // Check question text
    if (!q.question || q.question.trim().length < 10) {
      issues.push(`Question ${qNum}: Question text too short or empty`);
    }

    // Check question type specific validations
    if (q.type === 'multiple-choice') {
      if (!q.options || q.options.length < 2) {
        issues.push(`Question ${qNum}: Multiple choice needs at least 2 options`);
      }
      if (q.options && q.options.length < 4) {
        warnings.push(`Question ${qNum}: Multiple choice ideally has 4 options`);
      }
      if (!q.options?.includes(q.correct_answer as string)) {
        issues.push(`Question ${qNum}: Correct answer not in options`);
      }
    }

    if (q.type === 'true-false') {
      if (!['True', 'False', 'true', 'false'].includes(q.correct_answer as string)) {
        issues.push(`Question ${qNum}: True/False answer must be 'True' or 'False'`);
      }
    }

    // Check explanation
    if (!q.explanation || q.explanation.length < 10) {
      warnings.push(`Question ${qNum}: Explanation is too short`);
    }

    // Check points
    if (!q.points || q.points < 1) {
      issues.push(`Question ${qNum}: Points must be at least 1`);
    }
  });

  // Check for duplicate questions
  const questionTexts = questions.map(q => q.question.toLowerCase());
  const duplicates = questionTexts.filter((text, idx) => questionTexts.indexOf(text) !== idx);
  if (duplicates.length > 0) {
    warnings.push('Some questions appear to be duplicates');
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings,
  };
}

/**
 * Generate answer key for a quiz
 */
export async function generateAnswerKey(quiz: Quiz): Promise<AnswerKey> {
  return {
    quiz_id: quiz.id,
    answers: quiz.questions.map(q => ({
      question_id: q.id,
      correct_answer: q.correct_answer,
      explanation: q.explanation || '',
    })),
  };
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Fetch video transcripts from database
 */
async function fetchVideoTranscripts(videoIds: string[]): Promise<Array<{
  video_id: string;
  title: string;
  transcript: string;
  difficulty_level?: string;
}>> {
  const { data: videos, error } = await supabase
    .from('videos')
    .select('id, title, transcript, difficulty_level')
    .in('id', videoIds)
    .eq('transcript_processed', true);

  if (error) {
    throw new Error(`Failed to fetch video transcripts: ${error.message}`);
  }

  if (!videos || videos.length === 0) {
    return [];
  }

  return videos.map(v => ({
    video_id: v.id,
    title: v.title,
    transcript: v.transcript || '',
    difficulty_level: v.difficulty_level,
  }));
}

/**
 * Extract key concepts from transcripts using Claude
 */
async function extractKeyConcepts(
  transcripts: Array<{ title: string; transcript: string }>,
  difficulty: string
): Promise<string[]> {
  const combinedTranscript = transcripts
    .map(t => `[${t.title}]\n${t.transcript}`)
    .join('\n\n');

  const prompt = `Analyze this educational content and extract the 5-10 most important concepts or topics covered.
Focus on ${difficulty}-level concepts.

Content:
${combinedTranscript.slice(0, 8000)} ${combinedTranscript.length > 8000 ? '...(truncated)' : ''}

Return ONLY a JSON array of concept strings, e.g., ["React Hooks", "State Management", "Component Lifecycle"]`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      // Parse JSON array from response
      const match = content.text.match(/\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }
    }

    // Fallback to basic extraction
    return ['General Concepts'];
  } catch (error) {
    logger.error('Concept extraction failed', { error });
    return ['General Concepts'];
  }
}

/**
 * Generate quiz questions using Claude AI
 */
async function generateQuestions(
  transcripts: Array<{ title: string; transcript: string }>,
  concepts: string[],
  options: QuizOptions
): Promise<GeneratedQuestion[]> {
  const combinedTranscript = transcripts
    .map(t => `[Video: ${t.title}]\n${t.transcript}`)
    .join('\n\n---\n\n');

  // Build prompt
  const prompt = buildQuizGenerationPrompt(
    combinedTranscript,
    concepts,
    options
  );

  // Call Claude API
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: prompt,
    }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Parse JSON response
  const match = content.text.match(/\[[\s\S]*\]/);
  if (!match) {
    throw new Error('Could not parse quiz questions from Claude response');
  }

  const questions: GeneratedQuestion[] = JSON.parse(match[0]);

  // Ensure we have the right number of questions
  return questions.slice(0, options.questionCount);
}

/**
 * Build the prompt for quiz generation
 */
function buildQuizGenerationPrompt(
  transcript: string,
  concepts: string[],
  options: QuizOptions
): string {
  const questionTypeInstructions = options.questionTypes.map(type => {
    switch (type) {
      case 'multiple_choice':
        return 'Multiple choice questions with 4 options';
      case 'true_false':
        return 'True/False questions';
      case 'short_answer':
        return 'Short answer questions (1-3 sentences)';
      case 'code_challenge':
        return 'Code challenges or code analysis questions';
      default:
        return '';
    }
  }).join(', ');

  return `Generate a ${options.difficulty} level quiz with ${options.questionCount} questions based on these video transcripts.

Key concepts to cover: ${concepts.join(', ')}

Video Content:
${transcript.slice(0, 10000)}${transcript.length > 10000 ? '\n...(content truncated for brevity)' : ''}

Requirements:
- Question types: ${questionTypeInstructions}
- Difficulty: ${options.difficulty}
- Each question should test understanding, not just memorization
- Provide clear, unambiguous questions
- Include detailed explanations for each answer
- Distribute points (5-15 per question based on difficulty)

Return ONLY a JSON array of questions in this exact format:
[
  {
    "type": "multiple-choice" | "true-false" | "short-answer" | "code-challenge",
    "question": "The question text",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"], // For MC and T/F only
    "correct_answer": "The correct answer",
    "explanation": "Why this answer is correct and others are wrong",
    "points": 10,
    "difficulty": "easy" | "medium" | "hard",
    "topic": "React Hooks" // The concept being tested
  }
]

Be constructive and educational in explanations. Make questions clear and fair.`;
}

/**
 * Map difficulty levels between systems
 */
function mapDifficultyToQuizDifficulty(
  difficulty: 'beginner' | 'intermediate' | 'advanced'
): 'easy' | 'medium' | 'hard' {
  const map: Record<string, 'easy' | 'medium' | 'hard'> = {
    beginner: 'easy',
    intermediate: 'medium',
    advanced: 'hard',
  };
  return map[difficulty];
}

/**
 * Create quiz in database
 */
async function createQuizInDatabase(quizData: Partial<Quiz>): Promise<Quiz> {
  const { data, error } = await supabase
    .from('quizzes')
    .insert(quizData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create quiz: ${error.message}`);
  }

  return data;
}

/**
 * Get quiz statistics for a creator
 */
export async function getQuizStatistics(creatorId: string): Promise<{
  total_quizzes: number;
  total_attempts: number;
  avg_score: number;
  pass_rate: number;
}> {
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('id')
    .eq('creator_id', creatorId);

  if (!quizzes || quizzes.length === 0) {
    return {
      total_quizzes: 0,
      total_attempts: 0,
      avg_score: 0,
      pass_rate: 0,
    };
  }

  const quizIds = quizzes.map(q => q.id);

  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('score, passed')
    .in('quiz_id', quizIds);

  if (!attempts || attempts.length === 0) {
    return {
      total_quizzes: quizzes.length,
      total_attempts: 0,
      avg_score: 0,
      pass_rate: 0,
    };
  }

  const totalScore = attempts.reduce((sum, a) => sum + a.score, 0);
  const passedCount = attempts.filter(a => a.passed).length;

  return {
    total_quizzes: quizzes.length,
    total_attempts: attempts.length,
    avg_score: Math.round(totalScore / attempts.length),
    pass_rate: Math.round((passedCount / attempts.length) * 100),
  };
}
