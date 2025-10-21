/**
 * Quiz Service
 * Database operations for quizzes and quiz attempts
 */

import { supabase } from '@/lib/utils/supabase-client';
import { logger } from '@/lib/infrastructure/monitoring/logger';
import { Quiz, QuizAttempt, QuizQuestion } from '@/types/database';
import { awardXP } from '@/lib/progress/gamification-engine';

// =====================================================
// Types
// =====================================================

export interface QuizResult {
  attempt_id: string;
  quiz_id: string;
  student_id: string;
  score: number;
  passed: boolean;
  total_points: number;
  earned_points: number;
  percentage: number;
  feedback: QuestionFeedback[];
  time_taken_seconds?: number;
  xp_awarded: number;
}

export interface QuestionFeedback {
  question_id: string;
  question: string;
  student_answer: string | string[];
  correct_answer: string | string[];
  is_correct: boolean;
  points_earned: number;
  points_possible: number;
  explanation: string;
}

export interface QuizAnalytics {
  quiz_id: string;
  total_attempts: number;
  unique_students: number;
  avg_score: number;
  pass_rate: number;
  avg_time_seconds: number;
  question_stats: QuestionStats[];
}

export interface QuestionStats {
  question_id: string;
  question: string;
  correct_count: number;
  incorrect_count: number;
  accuracy_rate: number;
}

// =====================================================
// Quiz CRUD Operations
// =====================================================

/**
 * Create a new quiz
 */
export async function createQuiz(quizData: Partial<Quiz>): Promise<Quiz> {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .insert(quizData)
      .select()
      .single();

    if (error) throw error;

    logger.info('Quiz created', { quiz_id: data.id });
    return data;
  } catch (error) {
    logger.error('Failed to create quiz', { error });
    throw error;
  }
}

/**
 * Get quiz by ID
 */
export async function getQuiz(quizId: string): Promise<Quiz | null> {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Failed to fetch quiz', { error, quiz_id: quizId });
    return null;
  }
}

/**
 * Get all quizzes for a creator
 */
export async function getCreatorQuizzes(creatorId: string): Promise<Quiz[]> {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Failed to fetch creator quizzes', { error, creator_id: creatorId });
    return [];
  }
}

/**
 * Update a quiz
 */
export async function updateQuiz(
  quizId: string,
  updates: Partial<Quiz>
): Promise<Quiz | null> {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .update(updates)
      .eq('id', quizId)
      .select()
      .single();

    if (error) throw error;

    logger.info('Quiz updated', { quiz_id: quizId });
    return data;
  } catch (error) {
    logger.error('Failed to update quiz', { error, quiz_id: quizId });
    return null;
  }
}

/**
 * Delete a quiz
 */
export async function deleteQuiz(quizId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (error) throw error;

    logger.info('Quiz deleted', { quiz_id: quizId });
    return true;
  } catch (error) {
    logger.error('Failed to delete quiz', { error, quiz_id: quizId });
    return false;
  }
}

// =====================================================
// Quiz Attempt Operations
// =====================================================

/**
 * Submit a quiz attempt and get immediate results
 */
export async function submitQuizAttempt(
  quizId: string,
  studentId: string,
  answers: Record<string, any>,
  timeSpentSeconds?: number
): Promise<QuizResult> {
  try {
    // 1. Get quiz details
    const quiz = await getQuiz(quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    // 2. Grade the attempt
    const gradeResult = await gradeQuizAnswers(quiz, answers);

    // 3. Determine if passed
    const passed = gradeResult.percentage >= quiz.passing_score;

    // 4. Save attempt to database
    const { data: attempt, error } = await supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: quizId,
        student_id: studentId,
        answers,
        score: gradeResult.score,
        passed,
        feedback: gradeResult.feedback,
        time_spent_seconds: timeSpentSeconds,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 5. Award XP if passed (only on first pass)
    let xpAwarded = 0;
    if (passed) {
      const previousPasses = await getPreviousPassedAttempts(studentId, quizId);
      if (previousPasses === 0) {
        // Award XP based on difficulty
        const xpMap = {
          easy: 100,
          medium: 150,
          hard: 200,
        };
        xpAwarded = xpMap[quiz.difficulty] || 100;
        await awardXP(studentId, xpAwarded, 'quiz_completed', {
          quiz_id: quizId,
          score: gradeResult.score,
        });
      }
    }

    logger.info('Quiz attempt submitted', {
      attempt_id: attempt.id,
      student_id: studentId,
      quiz_id: quizId,
      score: gradeResult.score,
      passed,
    });

    return {
      attempt_id: attempt.id,
      quiz_id: quizId,
      student_id: studentId,
      score: gradeResult.score,
      passed,
      total_points: gradeResult.totalPoints,
      earned_points: gradeResult.earnedPoints,
      percentage: gradeResult.percentage,
      feedback: gradeResult.feedback,
      time_taken_seconds: timeSpentSeconds,
      xp_awarded: xpAwarded,
    };
  } catch (error) {
    logger.error('Failed to submit quiz attempt', { error, quiz_id: quizId, student_id: studentId });
    throw error;
  }
}

/**
 * Grade a quiz attempt
 */
export async function gradeAttempt(attemptId: string): Promise<QuizResult | null> {
  try {
    // Get attempt details
    const { data: attempt, error } = await supabase
      .from('quiz_attempts')
      .select('*, quizzes(*)')
      .eq('id', attemptId)
      .single();

    if (error) throw error;

    // If already graded, return existing result
    if (attempt.feedback) {
      return {
        attempt_id: attempt.id,
        quiz_id: attempt.quiz_id,
        student_id: attempt.student_id,
        score: attempt.score,
        passed: attempt.passed,
        total_points: calculateTotalPoints(attempt.quizzes.questions),
        earned_points: attempt.score,
        percentage: Math.round((attempt.score / calculateTotalPoints(attempt.quizzes.questions)) * 100),
        feedback: attempt.feedback,
        time_taken_seconds: attempt.time_spent_seconds,
        xp_awarded: 0, // Already awarded during submission
      };
    }

    // Grade it
    const gradeResult = await gradeQuizAnswers(attempt.quizzes, attempt.answers);

    // Update attempt with grading
    await supabase
      .from('quiz_attempts')
      .update({
        score: gradeResult.score,
        feedback: gradeResult.feedback,
      })
      .eq('id', attemptId);

    return {
      attempt_id: attemptId,
      quiz_id: attempt.quiz_id,
      student_id: attempt.student_id,
      score: gradeResult.score,
      passed: attempt.passed,
      total_points: gradeResult.totalPoints,
      earned_points: gradeResult.earnedPoints,
      percentage: gradeResult.percentage,
      feedback: gradeResult.feedback,
      time_taken_seconds: attempt.time_spent_seconds,
      xp_awarded: 0,
    };
  } catch (error) {
    logger.error('Failed to grade attempt', { error, attempt_id: attemptId });
    return null;
  }
}

/**
 * Get quiz results for a student
 */
export async function getQuizResults(
  studentId: string,
  quizId: string
): Promise<QuizResult[]> {
  try {
    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select('*, quizzes(*)')
      .eq('student_id', studentId)
      .eq('quiz_id', quizId)
      .order('completed_at', { ascending: false });

    if (error) throw error;

    if (!attempts || attempts.length === 0) return [];

    return attempts.map(attempt => {
      const totalPoints = calculateTotalPoints(attempt.quizzes.questions);
      const percentage = Math.round((attempt.score / totalPoints) * 100);

      return {
        attempt_id: attempt.id,
        quiz_id: attempt.quiz_id,
        student_id: attempt.student_id,
        score: attempt.score,
        passed: attempt.passed,
        total_points: totalPoints,
        earned_points: attempt.score,
        percentage,
        feedback: attempt.feedback || [],
        time_taken_seconds: attempt.time_spent_seconds,
        xp_awarded: 0,
      };
    });
  } catch (error) {
    logger.error('Failed to get quiz results', { error, student_id: studentId, quiz_id: quizId });
    return [];
  }
}

/**
 * Get analytics for a quiz
 */
export async function getQuizAnalytics(quizId: string): Promise<QuizAnalytics | null> {
  try {
    // Get quiz
    const quiz = await getQuiz(quizId);
    if (!quiz) return null;

    // Get all attempts
    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select('student_id, score, passed, time_spent_seconds, answers')
      .eq('quiz_id', quizId);

    if (error) throw error;

    if (!attempts || attempts.length === 0) {
      return {
        quiz_id: quizId,
        total_attempts: 0,
        unique_students: 0,
        avg_score: 0,
        pass_rate: 0,
        avg_time_seconds: 0,
        question_stats: [],
      };
    }

    // Calculate metrics
    const uniqueStudents = new Set(attempts.map(a => a.student_id)).size;
    const avgScore = Math.round(
      attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length
    );
    const passedCount = attempts.filter(a => a.passed).length;
    const passRate = Math.round((passedCount / attempts.length) * 100);
    const avgTime = Math.round(
      attempts
        .filter(a => a.time_spent_seconds)
        .reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0) /
      attempts.filter(a => a.time_spent_seconds).length
    );

    // Calculate per-question stats
    const questionStats = calculateQuestionStats(quiz.questions, attempts);

    return {
      quiz_id: quizId,
      total_attempts: attempts.length,
      unique_students: uniqueStudents,
      avg_score: avgScore,
      pass_rate: passRate,
      avg_time_seconds: avgTime || 0,
      question_stats: questionStats,
    };
  } catch (error) {
    logger.error('Failed to get quiz analytics', { error, quiz_id: quizId });
    return null;
  }
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Grade quiz answers and generate feedback
 */
async function gradeQuizAnswers(
  quiz: Quiz,
  answers: Record<string, any>
): Promise<{
  score: number;
  totalPoints: number;
  earnedPoints: number;
  percentage: number;
  feedback: QuestionFeedback[];
}> {
  const feedback: QuestionFeedback[] = [];
  let earnedPoints = 0;
  const totalPoints = calculateTotalPoints(quiz.questions);

  for (const question of quiz.questions) {
    const studentAnswer = answers[question.id];
    const isCorrect = checkAnswer(question, studentAnswer);
    const pointsEarned = isCorrect ? question.points : 0;

    earnedPoints += pointsEarned;

    feedback.push({
      question_id: question.id,
      question: question.question,
      student_answer: studentAnswer,
      correct_answer: question.correct_answer,
      is_correct: isCorrect,
      points_earned: pointsEarned,
      points_possible: question.points,
      explanation: question.explanation || '',
    });
  }

  const percentage = Math.round((earnedPoints / totalPoints) * 100);

  return {
    score: earnedPoints,
    totalPoints,
    earnedPoints,
    percentage,
    feedback,
  };
}

/**
 * Check if an answer is correct
 */
function checkAnswer(question: QuizQuestion, studentAnswer: any): boolean {
  if (!studentAnswer) return false;

  const correctAnswer = question.correct_answer;

  switch (question.type) {
    case 'multiple-choice':
    case 'true-false':
      return studentAnswer.toLowerCase().trim() ===
             (correctAnswer as string).toLowerCase().trim();

    case 'short-answer':
      // For short answer, check if key terms are present
      const answerLower = studentAnswer.toLowerCase();
      const correctLower = (correctAnswer as string).toLowerCase();

      // Simple keyword matching - can be improved with AI
      const keywords = correctLower.split(' ').filter(w => w.length > 3);
      const matchCount = keywords.filter(k => answerLower.includes(k)).length;

      return matchCount >= Math.ceil(keywords.length * 0.6); // 60% keyword match

    case 'code-challenge':
      // For code, just check if the answer contains key elements
      // In production, this should use an actual code execution/validation
      return studentAnswer.toString().length > 10;

    default:
      return false;
  }
}

/**
 * Calculate total points for a quiz
 */
function calculateTotalPoints(questions: QuizQuestion[]): number {
  return questions.reduce((sum, q) => sum + q.points, 0);
}

/**
 * Get count of previous passed attempts
 */
async function getPreviousPassedAttempts(
  studentId: string,
  quizId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('quiz_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('quiz_id', quizId)
    .eq('passed', true);

  if (error) return 0;
  return count || 0;
}

/**
 * Calculate per-question statistics
 */
function calculateQuestionStats(
  questions: QuizQuestion[],
  attempts: any[]
): QuestionStats[] {
  return questions.map(question => {
    let correctCount = 0;
    let incorrectCount = 0;

    attempts.forEach(attempt => {
      const studentAnswer = attempt.answers[question.id];
      const isCorrect = checkAnswer(question, studentAnswer);

      if (isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    });

    const totalAnswered = correctCount + incorrectCount;
    const accuracyRate = totalAnswered > 0
      ? Math.round((correctCount / totalAnswered) * 100)
      : 0;

    return {
      question_id: question.id,
      question: question.question,
      correct_count: correctCount,
      incorrect_count: incorrectCount,
      accuracy_rate: accuracyRate,
    };
  });
}
