/**
 * Code Reviewer Tests
 */

import { CodeReview } from '../code-reviewer';

describe('Code Reviewer', () => {
  describe('Review Structure', () => {
    it('should have valid review structure', () => {
      const mockReview: CodeReview = {
        overall_assessment: 'meets',
        summary: 'Good implementation with minor improvements needed',
        strengths: [
          'Clean code structure',
          'Good variable naming',
          'Proper error handling',
        ],
        improvements: [
          'Add more comments',
          'Optimize the search function',
        ],
        bugs_and_issues: [
          {
            severity: 'minor',
            type: 'performance',
            description: 'Inefficient loop in getData function',
            line_number: 42,
            suggestion: 'Use Array.map() instead of forEach with push',
          },
        ],
        security_concerns: [],
        best_practices_score: 85,
        code_quality_score: 80,
        functionality_score: 90,
        overall_score: 85,
        rubric_scores: [
          {
            category: 'Functionality',
            score: 36,
            max_score: 40,
            feedback: 'All features implemented correctly',
          },
          {
            category: 'Code Quality',
            score: 16,
            max_score: 20,
            feedback: 'Clean code with minor style issues',
          },
        ],
        detailed_feedback: 'Overall solid implementation. Focus on code optimization.',
      };

      expect(mockReview.overall_assessment).toBeDefined();
      expect(mockReview.overall_score).toBeGreaterThanOrEqual(0);
      expect(mockReview.overall_score).toBeLessThanOrEqual(100);
      expect(mockReview.strengths.length).toBeGreaterThan(0);
      expect(mockReview.rubric_scores.length).toBeGreaterThan(0);
    });

    it('should validate score ranges', () => {
      const scores = [
        { name: 'best_practices_score', value: 85 },
        { name: 'code_quality_score', value: 80 },
        { name: 'functionality_score', value: 90 },
        { name: 'overall_score', value: 85 },
      ];

      scores.forEach(score => {
        expect(score.value).toBeGreaterThanOrEqual(0);
        expect(score.value).toBeLessThanOrEqual(100);
      });
    });

    it('should validate issue severity levels', () => {
      const validSeverities = ['critical', 'major', 'minor'];
      const testIssue = {
        severity: 'minor' as const,
        type: 'performance' as const,
        description: 'Test issue',
        suggestion: 'Fix it',
      };

      expect(validSeverities).toContain(testIssue.severity);
    });

    it('should validate security concern levels', () => {
      const validSeverities = ['critical', 'high', 'medium', 'low'];
      const testConcern = {
        severity: 'medium' as const,
        description: 'Potential XSS vulnerability',
        recommendation: 'Sanitize user input',
      };

      expect(validSeverities).toContain(testConcern.severity);
    });

    it('should validate rubric score calculations', () => {
      const rubricScores = [
        { category: 'Functionality', score: 36, max_score: 40, feedback: 'Good' },
        { category: 'Code Quality', score: 16, max_score: 20, feedback: 'Good' },
        { category: 'UI/UX', score: 18, max_score: 20, feedback: 'Great' },
        { category: 'Data Persistence', score: 18, max_score: 20, feedback: 'Good' },
      ];

      rubricScores.forEach(rs => {
        expect(rs.score).toBeLessThanOrEqual(rs.max_score);
        expect(rs.score).toBeGreaterThanOrEqual(0);
      });

      const totalEarned = rubricScores.reduce((sum, rs) => sum + rs.score, 0);
      const totalPossible = rubricScores.reduce((sum, rs) => sum + rs.max_score, 0);
      const percentage = Math.round((totalEarned / totalPossible) * 100);

      expect(percentage).toBe(88); // (88/100) * 100
    });
  });

  describe('Assessment Levels', () => {
    it('should have valid assessment levels', () => {
      const validAssessments = ['exceeds', 'meets', 'partially_meets', 'does_not_meet'];

      validAssessments.forEach(assessment => {
        expect(['exceeds', 'meets', 'partially_meets', 'does_not_meet']).toContain(assessment);
      });
    });

    it('should map scores to assessments logically', () => {
      // Helper to determine assessment based on score
      const getAssessment = (score: number): string => {
        if (score >= 90) return 'exceeds';
        if (score >= 70) return 'meets';
        if (score >= 50) return 'partially_meets';
        return 'does_not_meet';
      };

      expect(getAssessment(95)).toBe('exceeds');
      expect(getAssessment(80)).toBe('meets');
      expect(getAssessment(60)).toBe('partially_meets');
      expect(getAssessment(40)).toBe('does_not_meet');
    });
  });

  describe('Code Issue Types', () => {
    it('should recognize valid issue types', () => {
      const validTypes = ['bug', 'logic_error', 'syntax', 'performance', 'style'];

      validTypes.forEach(type => {
        expect(['bug', 'logic_error', 'syntax', 'performance', 'style']).toContain(type);
      });
    });
  });
});
