/**
 * Quiz Generator Tests
 */

import { validateQuestions, GeneratedQuestion } from '../quiz-generator';

describe('Quiz Generator', () => {
  describe('validateQuestions', () => {
    it('should validate valid questions', async () => {
      const questions: GeneratedQuestion[] = [
        {
          type: 'multiple-choice',
          question: 'What is React?',
          options: ['Library', 'Framework', 'Language', 'Tool'],
          correct_answer: 'Library',
          explanation: 'React is a JavaScript library for building user interfaces',
          points: 10,
          difficulty: 'easy',
          topic: 'React Basics',
        },
        {
          type: 'true-false',
          question: 'React uses a virtual DOM',
          options: ['True', 'False'],
          correct_answer: 'True',
          explanation: 'React uses a virtual DOM for efficient updates',
          points: 5,
          difficulty: 'easy',
          topic: 'React Basics',
        },
        {
          type: 'short-answer',
          question: 'Explain the concept of state in React',
          correct_answer: 'State is an object that holds data that may change over the component lifecycle',
          explanation: 'State represents dynamic data in React components',
          points: 15,
          difficulty: 'medium',
          topic: 'React State',
        },
      ];

      const result = await validateQuestions(questions);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should reject quiz with too few questions', async () => {
      const questions: GeneratedQuestion[] = [
        {
          type: 'multiple-choice',
          question: 'What is React?',
          options: ['Library', 'Framework', 'Language', 'Tool'],
          correct_answer: 'Library',
          explanation: 'React is a JavaScript library',
          points: 10,
          difficulty: 'easy',
        },
      ];

      const result = await validateQuestions(questions);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Quiz must have at least 3 questions');
    });

    it('should reject multiple choice with wrong answer', async () => {
      const questions: GeneratedQuestion[] = [
        {
          type: 'multiple-choice',
          question: 'What is React?',
          options: ['Framework', 'Language', 'Tool'],
          correct_answer: 'Library', // Not in options!
          explanation: 'React is a library',
          points: 10,
          difficulty: 'easy',
        },
        {
          type: 'multiple-choice',
          question: 'Question 2',
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 'A',
          explanation: 'Explanation',
          points: 10,
          difficulty: 'easy',
        },
        {
          type: 'multiple-choice',
          question: 'Question 3',
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 'A',
          explanation: 'Explanation',
          points: 10,
          difficulty: 'easy',
        },
      ];

      const result = await validateQuestions(questions);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('Correct answer not in options'))).toBe(true);
    });

    it('should reject questions with invalid true/false answers', async () => {
      const questions: GeneratedQuestion[] = [
        {
          type: 'true-false',
          question: 'Is this valid?',
          options: ['True', 'False'],
          correct_answer: 'Maybe', // Invalid!
          explanation: 'Explanation',
          points: 5,
          difficulty: 'easy',
        },
        {
          type: 'true-false',
          question: 'Question 2',
          options: ['True', 'False'],
          correct_answer: 'True',
          explanation: 'Explanation',
          points: 5,
          difficulty: 'easy',
        },
        {
          type: 'true-false',
          question: 'Question 3',
          options: ['True', 'False'],
          correct_answer: 'False',
          explanation: 'Explanation',
          points: 5,
          difficulty: 'easy',
        },
      ];

      const result = await validateQuestions(questions);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('True/False answer'))).toBe(true);
    });

    it('should warn about short explanations', async () => {
      const questions: GeneratedQuestion[] = [
        {
          type: 'multiple-choice',
          question: 'What is the capital of France?',
          options: ['London', 'Berlin', 'Paris', 'Madrid'],
          correct_answer: 'Paris',
          explanation: 'Paris', // Too short!
          points: 10,
          difficulty: 'easy',
        },
        {
          type: 'multiple-choice',
          question: 'Question 2',
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 'A',
          explanation: 'A detailed explanation here',
          points: 10,
          difficulty: 'easy',
        },
        {
          type: 'multiple-choice',
          question: 'Question 3',
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 'A',
          explanation: 'Another detailed explanation',
          points: 10,
          difficulty: 'easy',
        },
      ];

      const result = await validateQuestions(questions);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('Explanation is too short'))).toBe(true);
    });

    it('should reject questions with invalid points', async () => {
      const questions: GeneratedQuestion[] = [
        {
          type: 'multiple-choice',
          question: 'Question 1',
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 'A',
          explanation: 'Explanation here',
          points: 0, // Invalid!
          difficulty: 'easy',
        },
        {
          type: 'multiple-choice',
          question: 'Question 2',
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 'A',
          explanation: 'Explanation',
          points: 10,
          difficulty: 'easy',
        },
        {
          type: 'multiple-choice',
          question: 'Question 3',
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 'A',
          explanation: 'Explanation',
          points: 10,
          difficulty: 'easy',
        },
      ];

      const result = await validateQuestions(questions);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('Points must be at least 1'))).toBe(true);
    });
  });
});
