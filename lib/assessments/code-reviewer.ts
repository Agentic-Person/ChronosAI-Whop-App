/**
 * AI Code Reviewer
 * Uses Claude API to review student code submissions
 *
 * Features:
 * - Analyze code for best practices
 * - Identify bugs and security issues
 * - Suggest improvements
 * - Provide constructive feedback
 * - Generate rubric scores
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/utils/supabase-client';
import { logger } from '@/lib/infrastructure/monitoring/logger';
import { ProjectTemplate, RubricItem } from './project-templates';

// Initialize Claude client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// =====================================================
// Types
// =====================================================

export interface CodeReview {
  overall_assessment: 'exceeds' | 'meets' | 'partially_meets' | 'does_not_meet';
  summary: string;
  strengths: string[];
  improvements: string[];
  bugs_and_issues: CodeIssue[];
  security_concerns: SecurityConcern[];
  best_practices_score: number; // 0-100
  code_quality_score: number; // 0-100
  functionality_score: number; // 0-100
  overall_score: number; // 0-100
  rubric_scores: RubricScore[];
  detailed_feedback: string;
}

export interface CodeIssue {
  severity: 'critical' | 'major' | 'minor';
  type: 'bug' | 'logic_error' | 'syntax' | 'performance' | 'style';
  description: string;
  line_number?: number;
  suggestion?: string;
}

export interface SecurityConcern {
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

export interface RubricScore {
  category: string;
  score: number;
  max_score: number;
  feedback: string;
}

export interface ProjectSubmission {
  id: string;
  project_id: string;
  student_id: string;
  code: string;
  files?: Array<{ filename: string; url: string; content?: string }>;
  notes?: string;
  demo_url?: string;
}

export interface ReviewOptions {
  language: string;
  acceptanceCriteria: string[];
  rubric: RubricItem[];
  projectTitle: string;
  projectDescription?: string;
}

// =====================================================
// Main Functions
// =====================================================

/**
 * Review submitted code using Claude AI
 */
export async function reviewCode(
  code: string,
  options: ReviewOptions
): Promise<CodeReview> {
  try {
    logger.info('Starting code review', {
      language: options.language,
      project: options.projectTitle,
    });

    // Build review prompt
    const prompt = buildCodeReviewPrompt(code, options);

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
    const match = content.text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('Could not parse code review from Claude response');
    }

    const review: CodeReview = JSON.parse(match[0]);

    logger.info('Code review completed', {
      overall_score: review.overall_score,
      assessment: review.overall_assessment,
    });

    return review;
  } catch (error) {
    logger.error('Code review failed', { error });
    throw error;
  }
}

/**
 * Generate constructive feedback from review
 */
export async function generateFeedback(review: CodeReview): Promise<string> {
  const sections: string[] = [];

  // Overall Assessment
  sections.push(`## Overall Assessment: ${review.overall_assessment.replace(/_/g, ' ').toUpperCase()}`);
  sections.push(review.summary);
  sections.push('');

  // Scores
  sections.push('## Scores');
  sections.push(`- Overall: ${review.overall_score}/100`);
  sections.push(`- Code Quality: ${review.code_quality_score}/100`);
  sections.push(`- Best Practices: ${review.best_practices_score}/100`);
  sections.push(`- Functionality: ${review.functionality_score}/100`);
  sections.push('');

  // Rubric Breakdown
  if (review.rubric_scores.length > 0) {
    sections.push('## Rubric Breakdown');
    review.rubric_scores.forEach(rs => {
      sections.push(`**${rs.category}**: ${rs.score}/${rs.max_score}`);
      sections.push(rs.feedback);
      sections.push('');
    });
  }

  // Strengths
  if (review.strengths.length > 0) {
    sections.push('## Strengths');
    review.strengths.forEach(s => sections.push(`- ${s}`));
    sections.push('');
  }

  // Areas for Improvement
  if (review.improvements.length > 0) {
    sections.push('## Areas for Improvement');
    review.improvements.forEach(i => sections.push(`- ${i}`));
    sections.push('');
  }

  // Bugs and Issues
  if (review.bugs_and_issues.length > 0) {
    sections.push('## Bugs and Issues');
    review.bugs_and_issues.forEach(issue => {
      sections.push(`**[${issue.severity.toUpperCase()} - ${issue.type}]** ${issue.description}`);
      if (issue.suggestion) {
        sections.push(`  *Suggestion: ${issue.suggestion}*`);
      }
      sections.push('');
    });
  }

  // Security Concerns
  if (review.security_concerns.length > 0) {
    sections.push('## Security Concerns');
    review.security_concerns.forEach(concern => {
      sections.push(`**[${concern.severity.toUpperCase()}]** ${concern.description}`);
      sections.push(`  *Recommendation: ${concern.recommendation}*`);
      sections.push('');
    });
  }

  // Detailed Feedback
  if (review.detailed_feedback) {
    sections.push('## Detailed Feedback');
    sections.push(review.detailed_feedback);
  }

  return sections.join('\n');
}

/**
 * Score a submission based on rubric
 */
export async function scoreSubmission(
  submission: ProjectSubmission,
  rubric: RubricItem[]
): Promise<number> {
  try {
    // Get project template for context
    const { data: project } = await supabase
      .from('projects')
      .select('*, project_templates(*)')
      .eq('id', submission.project_id)
      .single();

    if (!project) {
      throw new Error('Project not found');
    }

    const template = project.project_templates;

    // Review the code
    const review = await reviewCode(submission.code, {
      language: detectLanguage(submission.code, submission.files),
      acceptanceCriteria: template?.acceptance_criteria || [],
      rubric: rubric,
      projectTitle: project.title,
      projectDescription: project.description,
    });

    return review.overall_score;
  } catch (error) {
    logger.error('Failed to score submission', { error, submission_id: submission.id });
    throw error;
  }
}

/**
 * Review a project submission and save to database
 */
export async function reviewProjectSubmission(
  submissionId: string
): Promise<CodeReview> {
  try {
    // Get submission
    const { data: submission, error: submissionError } = await supabase
      .from('project_submissions')
      .select('*, projects(*, project_templates(*))')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      throw new Error('Submission not found');
    }

    const project = submission.projects;
    const template = project.project_templates;

    // Review the code
    const review = await reviewCode(submission.code, {
      language: detectLanguage(submission.code, submission.files),
      acceptanceCriteria: template?.acceptance_criteria || [],
      rubric: template?.rubric || [],
      projectTitle: project.title,
      projectDescription: project.description,
    });

    // Save review to database
    const { error: updateError } = await supabase
      .from('project_submissions')
      .update({
        ai_review: review,
        ai_score: review.overall_score,
        ai_reviewed_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (updateError) {
      throw updateError;
    }

    logger.info('Project submission reviewed', {
      submission_id: submissionId,
      score: review.overall_score,
    });

    return review;
  } catch (error) {
    logger.error('Failed to review project submission', { error, submission_id: submissionId });
    throw error;
  }
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Build the code review prompt for Claude
 */
function buildCodeReviewPrompt(code: string, options: ReviewOptions): string {
  return `You are an expert code reviewer and programming instructor. Review this ${options.language} code for a project titled "${options.projectTitle}".

${options.projectDescription ? `Project Description: ${options.projectDescription}\n` : ''}

Acceptance Criteria:
${options.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Rubric:
${options.rubric.map(r => `- ${r.category} (${r.points} points): ${r.criteria}`).join('\n')}

Code to Review:
\`\`\`${options.language}
${code}
\`\`\`

Provide a comprehensive, constructive review. Be encouraging but honest. Focus on:
1. Whether acceptance criteria are met
2. Code quality and organization
3. Best practices for ${options.language}
4. Potential bugs or logic errors
5. Security concerns
6. Performance considerations
7. Specific suggestions for improvement

Return your review as a JSON object with this EXACT structure:
{
  "overall_assessment": "exceeds" | "meets" | "partially_meets" | "does_not_meet",
  "summary": "A 2-3 sentence overall assessment",
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "improvements": ["Improvement 1", "Improvement 2", "Improvement 3"],
  "bugs_and_issues": [
    {
      "severity": "critical" | "major" | "minor",
      "type": "bug" | "logic_error" | "syntax" | "performance" | "style",
      "description": "Description of the issue",
      "line_number": 0,
      "suggestion": "How to fix it"
    }
  ],
  "security_concerns": [
    {
      "severity": "critical" | "high" | "medium" | "low",
      "description": "Security issue description",
      "recommendation": "How to address it"
    }
  ],
  "best_practices_score": 0-100,
  "code_quality_score": 0-100,
  "functionality_score": 0-100,
  "overall_score": 0-100,
  "rubric_scores": [
    {
      "category": "Category name from rubric",
      "score": 0-points,
      "max_score": points,
      "feedback": "Specific feedback for this category"
    }
  ],
  "detailed_feedback": "Additional detailed feedback and suggestions"
}

Be constructive and encouraging. This is a learning environment.`;
}

/**
 * Detect programming language from code or filenames
 */
function detectLanguage(
  code: string,
  files?: Array<{ filename: string; url: string }>
): string {
  // Check file extensions
  if (files && files.length > 0) {
    const extensions = files.map(f => {
      const parts = f.filename.split('.');
      return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
    });

    if (extensions.includes('ts') || extensions.includes('tsx')) return 'TypeScript';
    if (extensions.includes('js') || extensions.includes('jsx')) return 'JavaScript';
    if (extensions.includes('py')) return 'Python';
    if (extensions.includes('java')) return 'Java';
    if (extensions.includes('cpp') || extensions.includes('cc')) return 'C++';
    if (extensions.includes('cs')) return 'C#';
    if (extensions.includes('go')) return 'Go';
    if (extensions.includes('rs')) return 'Rust';
    if (extensions.includes('rb')) return 'Ruby';
    if (extensions.includes('php')) return 'PHP';
  }

  // Check code patterns
  if (code.includes('import React') || code.includes('from \'react\'')) return 'React';
  if (code.includes('def ') && code.includes(':')) return 'Python';
  if (code.includes('function') || code.includes('const ') || code.includes('let ')) return 'JavaScript';
  if (code.includes('public class') || code.includes('private class')) return 'Java';
  if (code.includes('package main') || code.includes('func main()')) return 'Go';

  // Default
  return 'JavaScript';
}

/**
 * Calculate composite score from rubric scores
 */
function calculateCompositeScore(rubricScores: RubricScore[]): number {
  if (rubricScores.length === 0) return 0;

  const totalEarned = rubricScores.reduce((sum, rs) => sum + rs.score, 0);
  const totalPossible = rubricScores.reduce((sum, rs) => sum + rs.max_score, 0);

  return Math.round((totalEarned / totalPossible) * 100);
}

/**
 * Get review statistics for a creator
 */
export async function getReviewStatistics(creatorId: string): Promise<{
  total_reviews: number;
  avg_score: number;
  avg_quality_score: number;
  common_issues: string[];
}> {
  try {
    // Get all submissions for creator's projects
    const { data: submissions } = await supabase
      .from('project_submissions')
      .select('ai_review, ai_score, projects!inner(creator_id)')
      .eq('projects.creator_id', creatorId)
      .not('ai_review', 'is', null);

    if (!submissions || submissions.length === 0) {
      return {
        total_reviews: 0,
        avg_score: 0,
        avg_quality_score: 0,
        common_issues: [],
      };
    }

    const totalScore = submissions.reduce((sum, s) => sum + (s.ai_score || 0), 0);
    const totalQuality = submissions.reduce(
      (sum, s) => sum + ((s.ai_review as any)?.code_quality_score || 0),
      0
    );

    // Extract common issues
    const allIssues: string[] = [];
    submissions.forEach(s => {
      const review = s.ai_review as CodeReview;
      if (review?.bugs_and_issues) {
        review.bugs_and_issues.forEach(issue => {
          allIssues.push(issue.type);
        });
      }
    });

    // Count issue frequencies
    const issueCounts: Record<string, number> = {};
    allIssues.forEach(issue => {
      issueCounts[issue] = (issueCounts[issue] || 0) + 1;
    });

    // Get top 5 common issues
    const commonIssues = Object.entries(issueCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([issue]) => issue);

    return {
      total_reviews: submissions.length,
      avg_score: Math.round(totalScore / submissions.length),
      avg_quality_score: Math.round(totalQuality / submissions.length),
      common_issues: commonIssues,
    };
  } catch (error) {
    logger.error('Failed to get review statistics', { error, creator_id: creatorId });
    return {
      total_reviews: 0,
      avg_score: 0,
      avg_quality_score: 0,
      common_issues: [],
    };
  }
}
