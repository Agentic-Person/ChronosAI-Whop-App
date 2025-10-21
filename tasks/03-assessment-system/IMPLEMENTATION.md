# Module 3: Assessment System - Implementation Guide

## Prerequisites

Before implementing assessments:
- [ ] Module 1 (RAG Chat) - for Claude API integration patterns
- [ ] Module 2 (Video Processing) - videos must have transcripts
- [ ] Database tables created (quizzes, quiz_questions, quiz_attempts, projects, project_submissions)
- [ ] Claude API key configured

## Phase 1: AI Quiz Generation

### Step 1.1: Create Quiz Generator Service

```typescript
// lib/assessments/quiz-generator.ts

import Anthropic from '@anthropic-ai/sdk';
import { getSupabaseAdmin } from '@/lib/infrastructure/database/connection-pool';
import type { Quiz, QuizQuestion, QuizConfig } from '@/types/assessments';

const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export class QuizGenerator {
  /**
   * Generate quiz from video transcript
   */
  async generateQuiz(config: QuizConfig): Promise<Quiz> {
    console.log('Generating quiz for video:', config.videoId);

    // 1. Fetch video and transcript
    const video = await this.getVideoWithTranscript(config.videoId);

    if (!video.full_transcript) {
      throw new Error('Video has no transcript. Process video first.');
    }

    // 2. Generate questions using Claude
    const questions = await this.generateQuestions(
      video.full_transcript,
      video.title,
      config
    );

    // 3. Store quiz in database
    const quiz = await this.saveQuiz(config, questions);

    return quiz;
  }

  /**
   * Generate questions using Claude API
   */
  private async generateQuestions(
    transcript: string,
    videoTitle: string,
    config: QuizConfig
  ): Promise<QuizQuestion[]> {
    const prompt = this.buildQuizPrompt(transcript, videoTitle, config);

    const response = await claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // Parse JSON response
    const questionsData = this.parseQuizResponse(textContent);

    return questionsData;
  }

  /**
   * Build prompt for Claude
   */
  private buildQuizPrompt(
    transcript: string,
    videoTitle: string,
    config: QuizConfig
  ): string {
    const typeDistribution = this.calculateTypeDistribution(config);

    return `
You are an expert educator creating assessment questions from video content.

Video Title: "${videoTitle}"
Video Transcript:
${transcript.substring(0, 8000)} ${transcript.length > 8000 ? '... (truncated)' : ''}

Create a ${config.questionCount}-question quiz with:
- ${typeDistribution.multipleChoice} multiple choice questions
- ${typeDistribution.trueFalse} true/false questions
${typeDistribution.shortAnswer > 0 ? `- ${typeDistribution.shortAnswer} short answer questions` : ''}

Difficulty: ${config.difficulty}

Requirements:
1. Questions must be directly answerable from the video content
2. Cover different parts of the video (not just the beginning)
3. Test understanding, not just memorization
4. Multiple choice should have 4 options with clear distractors
5. Include an explanation for each question

Return ONLY a JSON array with this exact structure:
[
  {
    "type": "multiple-choice",
    "question": "What is the main concept explained in the video?",
    "difficulty": "easy",
    "options": [
      { "id": "A", "text": "Option A", "correct": true },
      { "id": "B", "text": "Option B", "correct": false },
      { "id": "C", "text": "Option C", "correct": false },
      { "id": "D", "text": "Option D", "correct": false }
    ],
    "explanation": "The video clearly states that..."
  },
  {
    "type": "true-false",
    "question": "The instructor mentioned that X is always Y.",
    "difficulty": "medium",
    "options": [
      { "id": "true", "text": "True", "correct": false },
      { "id": "false", "text": "False", "correct": true }
    ],
    "explanation": "This is false because..."
  }
]

Important: Return ONLY valid JSON, no explanatory text before or after.
`;
  }

  /**
   * Calculate how many of each question type
   */
  private calculateTypeDistribution(config: QuizConfig): {
    multipleChoice: number;
    trueFalse: number;
    shortAnswer: number;
  } {
    const total = config.questionCount;
    const types = config.questionTypes || ['multiple-choice', 'true-false'];

    let multipleChoice = 0;
    let trueFalse = 0;
    let shortAnswer = 0;

    if (types.includes('multiple-choice')) {
      multipleChoice = Math.ceil(total * 0.7); // 70%
    }

    if (types.includes('true-false')) {
      trueFalse = Math.ceil(total * 0.2); // 20%
    }

    if (types.includes('short-answer')) {
      shortAnswer = Math.ceil(total * 0.1); // 10%
    }

    // Adjust to exact total
    const sum = multipleChoice + trueFalse + shortAnswer;
    if (sum > total) {
      multipleChoice = total - trueFalse - shortAnswer;
    }

    return { multipleChoice, trueFalse, shortAnswer };
  }

  /**
   * Parse Claude's JSON response
   */
  private parseQuizResponse(response: string): QuizQuestion[] {
    // Extract JSON from response (Claude might add explanations)
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse quiz response - no JSON found');
    }

    try {
      const questions = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (!Array.isArray(questions)) {
        throw new Error('Response is not an array');
      }

      return questions.map((q, index) => ({
        question_type: q.type,
        question_text: q.question,
        question_order: index + 1,
        difficulty: q.difficulty,
        options: q.options,
        explanation: q.explanation,
      }));
    } catch (error) {
      console.error('JSON parse error:', error);
      console.error('Response:', response);
      throw new Error('Failed to parse quiz JSON');
    }
  }

  /**
   * Get video with transcript
   */
  private async getVideoWithTranscript(videoId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Video not found');

    return data;
  }

  /**
   * Save quiz to database
   */
  private async saveQuiz(
    config: QuizConfig,
    questions: QuizQuestion[]
  ): Promise<Quiz> {
    const supabase = getSupabaseAdmin();

    // Create quiz record
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        creator_id: config.creatorId,
        video_id: config.videoId,
        title: config.title || `Quiz: ${config.videoTitle}`,
        description: config.description || '',
        question_count: questions.length,
        passing_score: config.passingScore || 70,
        time_limit: config.timeLimit,
        allow_retakes: config.allowRetakes !== false,
        show_answers_when: config.showAnswersAfter || 'immediate',
      })
      .select()
      .single();

    if (quizError) throw quizError;

    // Create question records
    const questionRecords = questions.map((q) => ({
      ...q,
      quiz_id: quiz.id,
    }));

    const { error: questionsError } = await supabase
      .from('quiz_questions')
      .insert(questionRecords);

    if (questionsError) throw questionsError;

    return quiz;
  }
}

export const quizGenerator = new QuizGenerator();
```

### Step 1.2: Create Quiz Generation API Route

```typescript
// app/api/quizzes/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { quizGenerator } from '@/lib/assessments/quiz-generator';
import { withRateLimit } from '@/lib/infrastructure/rate-limiting/rate-limiter';

async function handler(req: NextRequest) {
  try {
    const config = await req.json();

    // Validate required fields
    if (!config.videoId || !config.creatorId) {
      return NextResponse.json(
        { error: 'Missing required fields: videoId, creatorId' },
        { status: 400 }
      );
    }

    // Generate quiz
    const quiz = await quizGenerator.generateQuiz(config);

    return NextResponse.json({
      success: true,
      quiz,
      message: `Generated ${quiz.question_count} questions`,
    });
  } catch (error) {
    console.error('Quiz generation error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Quiz generation failed',
      },
      { status: 500 }
    );
  }
}

// Rate limit: 5 quizzes per hour
export const POST = withRateLimit(handler, 'quizGeneration');
```

### Step 1.3: Quiz Generator UI Component

```typescript
// components/assessments/QuizGenerator.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export function QuizGenerator({
  videoId,
  videoTitle,
  creatorId,
  onQuizCreated,
}: {
  videoId: string;
  videoTitle: string;
  creatorId: string;
  onQuizCreated: (quiz: any) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [config, setConfig] = useState({
    questionCount: 10,
    difficulty: 'mixed',
    passingScore: 70,
    timeLimit: null,
    allowRetakes: true,
  });

  const handleGenerate = async () => {
    setGenerating(true);

    try {
      const response = await fetch('/api/quizzes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          videoTitle,
          creatorId,
          ...config,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      onQuizCreated(data.quiz);
    } catch (error) {
      console.error('Failed to generate quiz:', error);
      alert(error.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Generate Quiz</h2>

      <div className="space-y-4">
        {/* Question count */}
        <div>
          <Label>Number of Questions</Label>
          <Select
            value={config.questionCount.toString()}
            onChange={(e) =>
              setConfig({ ...config, questionCount: Number(e.target.value) })
            }
          >
            <option value="5">5 questions</option>
            <option value="10">10 questions (recommended)</option>
            <option value="15">15 questions</option>
            <option value="20">20 questions</option>
          </Select>
        </div>

        {/* Difficulty */}
        <div>
          <Label>Difficulty</Label>
          <Select
            value={config.difficulty}
            onChange={(e) =>
              setConfig({ ...config, difficulty: e.target.value })
            }
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="mixed">Mixed (Recommended)</option>
          </Select>
        </div>

        {/* Passing score */}
        <div>
          <Label>Passing Score (%)</Label>
          <Input
            type="number"
            min="50"
            max="100"
            value={config.passingScore}
            onChange={(e) =>
              setConfig({ ...config, passingScore: Number(e.target.value) })
            }
          />
        </div>

        {/* Time limit */}
        <div>
          <Label>Time Limit (optional)</Label>
          <Input
            type="number"
            placeholder="Minutes (leave empty for no limit)"
            value={config.timeLimit || ''}
            onChange={(e) =>
              setConfig({
                ...config,
                timeLimit: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>

        {/* Allow retakes */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="allow-retakes"
            checked={config.allowRetakes}
            onChange={(e) =>
              setConfig({ ...config, allowRetakes: e.target.checked })
            }
          />
          <Label htmlFor="allow-retakes">Allow students to retake quiz</Label>
        </div>

        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Quiz...
            </>
          ) : (
            'Generate Quiz with AI'
          )}
        </Button>
      </div>
    </div>
  );
}
```

## Phase 2: Quiz Taking Experience

### Step 2.1: Quiz Taking Service

```typescript
// lib/assessments/quiz-taker.ts

import { getSupabaseAdmin } from '@/lib/infrastructure/database/connection-pool';
import type { Quiz, QuizAttempt } from '@/types/assessments';

export class QuizTaker {
  /**
   * Start a new quiz attempt
   */
  async startQuiz(quizId: string, studentId: string): Promise<{
    quiz: Quiz;
    questions: any[];
    attemptId: string;
  }> {
    const supabase = getSupabaseAdmin();

    // Get quiz with questions
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('*, quiz_questions(*)')
      .eq('id', quizId)
      .single();

    if (!quiz) throw new Error('Quiz not found');

    // Check previous attempts
    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    const attemptNumber = (attempts?.length || 0) + 1;

    // Check if retakes allowed
    if (!quiz.allow_retakes && attempts && attempts.length > 0) {
      throw new Error('Retakes not allowed for this quiz');
    }

    // Create attempt record (with status 'in_progress')
    const { data: attempt, error } = await supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: quizId,
        student_id: studentId,
        started_at: new Date().toISOString(),
        attempt_number: attemptNumber,
        answers: {},
        score: 0,
        passed: false,
      })
      .select()
      .single();

    if (error) throw error;

    // Return quiz data WITHOUT correct answers
    const questionsForStudent = quiz.quiz_questions.map((q) => ({
      id: q.id,
      question_type: q.question_type,
      question_text: q.question_text,
      question_order: q.question_order,
      difficulty: q.difficulty,
      options: q.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        // Remove 'correct' field
      })),
    }));

    return {
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        question_count: quiz.question_count,
        passing_score: quiz.passing_score,
        time_limit: quiz.time_limit,
      },
      questions: questionsForStudent,
      attemptId: attempt.id,
    };
  }

  /**
   * Submit quiz and calculate score
   */
  async submitQuiz(
    attemptId: string,
    answers: Record<string, string>
  ): Promise<QuizAttempt> {
    const supabase = getSupabaseAdmin();

    // Get attempt and quiz
    const { data: attempt } = await supabase
      .from('quiz_attempts')
      .select('*, quiz:quizzes(*, quiz_questions(*))')
      .eq('id', attemptId)
      .single();

    if (!attempt) throw new Error('Attempt not found');

    const quiz = attempt.quiz;
    const questions = quiz.quiz_questions;

    // Calculate score
    let correctCount = 0;
    const gradedAnswers: Record<string, any> = {};

    questions.forEach((question) => {
      const studentAnswer = answers[question.id];
      const correctOption = question.options.find((opt) => opt.correct);

      const isCorrect =
        question.question_type === 'true-false'
          ? studentAnswer === (correctOption.id === 'true' ? 'true' : 'false')
          : studentAnswer === correctOption.id;

      if (isCorrect) {
        correctCount++;
      }

      gradedAnswers[question.id] = {
        answer: studentAnswer,
        correct: isCorrect,
        correctAnswer: correctOption.id,
        explanation: question.explanation,
      };
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= quiz.passing_score;

    // Update attempt
    const { data: updatedAttempt, error } = await supabase
      .from('quiz_attempts')
      .update({
        answers: gradedAnswers,
        score,
        passed,
        completed_at: new Date().toISOString(),
        time_spent: Math.floor(
          (new Date().getTime() - new Date(attempt.started_at).getTime()) / 1000
        ),
      })
      .eq('id', attemptId)
      .select()
      .single();

    if (error) throw error;

    // Award XP if passed
    if (passed) {
      await this.awardXP(attempt.student_id, 100); // QUIZ_PASSED XP
    }

    return updatedAttempt;
  }

  /**
   * Award XP to student
   */
  private async awardXP(studentId: string, xp: number): Promise<void> {
    await getSupabaseAdmin().rpc('add_student_xp', {
      student_id: studentId,
      xp_amount: xp,
    });
  }
}

export const quizTaker = new QuizTaker();
```

### Step 2.2: Quiz Taking UI

```typescript
// components/assessments/QuizTaker.tsx

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export function QuizTaker({ quizId, studentId }: { quizId: string; studentId: string }) {
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attemptId, setAttemptId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    startQuiz();
  }, []);

  useEffect(() => {
    if (quiz?.time_limit && !submitted) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSubmit(); // Auto-submit when time runs out
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [quiz, submitted]);

  const startQuiz = async () => {
    const response = await fetch(`/api/quizzes/${quizId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    });

    const data = await response.json();
    setQuiz(data.quiz);
    setQuestions(data.questions);
    setAttemptId(data.attemptId);

    if (data.quiz.time_limit) {
      setTimeLeft(data.quiz.time_limit * 60); // Convert to seconds
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers({
      ...answers,
      [questionId]: answer,
    });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    const response = await fetch(`/api/quizzes/attempts/${attemptId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });

    const data = await response.json();
    setResult(data.result);
    setSubmitted(true);
  };

  if (!quiz || !questions.length) {
    return <div>Loading quiz...</div>;
  }

  if (submitted && result) {
    return (
      <QuizResults
        result={result}
        quiz={quiz}
        questions={questions}
        answers={result.answers}
      />
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">{quiz.title}</h1>
          {timeLeft !== null && (
            <div className="flex items-center gap-2 text-orange-600">
              <Clock className="w-5 h-5" />
              <span className="font-mono font-bold">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}
        </div>

        <Progress value={progress} className="h-2" />
        <p className="text-sm text-gray-600 mt-2">
          Question {currentQuestion + 1} of {questions.length}
        </p>
      </div>

      {/* Question */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-500">
              {question.difficulty?.toUpperCase()}
            </span>
          </div>
          <h2 className="text-lg font-semibold">{question.question_text}</h2>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleAnswer(question.id, option.id)}
              className={`
                w-full p-4 rounded-lg border-2 text-left transition-all
                ${
                  answers[question.id] === option.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center
                    ${
                      answers[question.id] === option.id
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }
                  `}
                >
                  {answers[question.id] === option.id && (
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  )}
                </div>
                <span>{option.text}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>

          {currentQuestion === questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length !== questions.length}
            >
              Submit Quiz
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!answers[question.id]}
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function QuizResults({ result, quiz, questions, answers }) {
  const passed = result.score >= quiz.passing_score;

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Score card */}
      <div className="bg-white rounded-lg shadow p-8 text-center mb-6">
        {passed ? (
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        ) : (
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        )}

        <h1 className="text-3xl font-bold mb-2">
          {passed ? 'Congratulations!' : 'Not Quite There'}
        </h1>

        <p className="text-6xl font-bold my-6">
          {result.score}%
        </p>

        <p className="text-gray-600 mb-4">
          {passed
            ? `You passed! Passing score was ${quiz.passing_score}%`
            : `You need ${quiz.passing_score}% to pass. Try again!`}
        </p>

        {passed && (
          <p className="text-blue-600 font-semibold">
            +100 XP Earned
          </p>
        )}
      </div>

      {/* Question review */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold mb-4">Review Answers</h2>

        {questions.map((question, index) => {
          const answer = answers[question.id];

          return (
            <div
              key={question.id}
              className={`
                bg-white rounded-lg shadow p-6
                ${answer.correct ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'}
              `}
            >
              <div className="flex items-start gap-3 mb-4">
                {answer.correct ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-1" />
                )}
                <div className="flex-1">
                  <p className="font-semibold mb-2">{question.question_text}</p>

                  <p className="text-sm text-gray-600 mb-2">
                    Your answer: <span className="font-medium">{answer.answer}</span>
                    {!answer.correct && (
                      <>
                        <br />
                        Correct answer: <span className="font-medium text-green-600">{answer.correctAnswer}</span>
                      </>
                    )}
                  </p>

                  {answer.explanation && (
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                      <p className="text-sm">{answer.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Retry button */}
      {!passed && quiz.allow_retakes && (
        <div className="mt-8 text-center">
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
```

## Phase 3: Project Management

### Step 3.1: Project Template Builder

```typescript
// components/assessments/ProjectTemplateBuilder.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';

export function ProjectTemplateBuilder({
  creatorId,
  onSave,
}: {
  creatorId: string;
  onSave: (template: any) => void;
}) {
  const [template, setTemplate] = useState({
    title: '',
    description: '',
    requirements: [''],
    deliverables: [''],
    estimatedHours: 5,
    difficulty: 'intermediate',
    rubric: [
      {
        category: 'Functionality',
        description: 'Does the project work as intended?',
        maxPoints: 40,
        levels: [
          { points: 40, description: 'Exceptional - All features work perfectly' },
          { points: 30, description: 'Proficient - Most features work with minor bugs' },
          { points: 20, description: 'Developing - Basic features work' },
          { points: 0, description: 'Incomplete - Does not meet requirements' },
        ],
      },
    ],
    totalPoints: 100,
    passingScore: 70,
  });

  const handleSave = async () => {
    const response = await fetch('/api/projects/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...template,
        creator_id: creatorId,
      }),
    });

    const data = await response.json();
    onSave(data.template);
  };

  return (
    <div className="space-y-6">
      {/* Basic info */}
      <div>
        <label className="block text-sm font-medium mb-2">Project Title</label>
        <Input
          value={template.title}
          onChange={(e) => setTemplate({ ...template, title: e.target.value })}
          placeholder="Build a Todo App"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <Textarea
          value={template.description}
          onChange={(e) => setTemplate({ ...template, description: e.target.value })}
          rows={4}
          placeholder="Create a fully functional todo application..."
        />
      </div>

      {/* Requirements */}
      <div>
        <label className="block text-sm font-medium mb-2">Requirements</label>
        {template.requirements.map((req, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <Input
              value={req}
              onChange={(e) => {
                const newReqs = [...template.requirements];
                newReqs[index] = e.target.value;
                setTemplate({ ...template, requirements: newReqs });
              }}
              placeholder="Use React hooks"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const newReqs = template.requirements.filter((_, i) => i !== index);
                setTemplate({ ...template, requirements: newReqs });
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setTemplate({
              ...template,
              requirements: [...template.requirements, ''],
            })
          }
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Requirement
        </Button>
      </div>

      {/* Rubric */}
      <div>
        <label className="block text-sm font-medium mb-4">Grading Rubric</label>
        {template.rubric.map((criteria, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4 mb-4">
            <Input
              value={criteria.category}
              onChange={(e) => {
                const newRubric = [...template.rubric];
                newRubric[index].category = e.target.value;
                setTemplate({ ...template, rubric: newRubric });
              }}
              className="mb-2"
              placeholder="Category name"
            />
            <Input
              type="number"
              value={criteria.maxPoints}
              onChange={(e) => {
                const newRubric = [...template.rubric];
                newRubric[index].maxPoints = Number(e.target.value);
                setTemplate({ ...template, rubric: newRubric });
              }}
              className="mb-2"
              placeholder="Max points"
            />
            {/* Levels... */}
          </div>
        ))}
      </div>

      <Button onClick={handleSave} className="w-full">
        Save Project Template
      </Button>
    </div>
  );
}
```

---

**Implementation continues with Project Submissions, AI Grading, and Testing in additional sections...**

This guide provides the core quiz generation and taking functionality. The full implementation would include:
- Project submission workflow
- AI-assisted grading
- Analytics dashboards
- Testing strategies

**Next**: Complete remaining modules (5, 7, 9, 10, 11)!
