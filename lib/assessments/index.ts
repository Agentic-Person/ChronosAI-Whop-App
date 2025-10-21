/**
 * Assessment System Exports
 * Central export point for all assessment-related functionality
 */

// Quiz Generator
export {
  generateQuiz,
  validateQuestions,
  generateAnswerKey,
  getQuizStatistics,
  type QuizOptions,
  type GeneratedQuestion,
  type ValidationResult,
  type AnswerKey,
} from './quiz-generator';

// Quiz Service
export {
  createQuiz,
  getQuiz,
  getCreatorQuizzes,
  updateQuiz,
  deleteQuiz,
  submitQuizAttempt,
  gradeAttempt,
  getQuizResults,
  getQuizAnalytics,
  type QuizResult,
  type QuestionFeedback,
  type QuizAnalytics,
  type QuestionStats,
} from './quiz-service';

// Project Templates
export {
  getProjectTemplates,
  getProjectTemplate,
  createProjectTemplate,
  updateProjectTemplate,
  deactivateProjectTemplate,
  createProjectFromTemplate,
  getStudentProjects,
  getProject,
  updateProjectStatus,
  updateProject,
  deleteProject,
  getTemplateCategories,
  getTemplateStats,
  getRecommendedTemplates,
  type ProjectTemplate,
  type RubricItem,
  type Project,
  type CreateProjectOptions,
} from './project-templates';

// Code Reviewer
export {
  reviewCode,
  generateFeedback,
  scoreSubmission,
  reviewProjectSubmission,
  getReviewStatistics,
  type CodeReview,
  type CodeIssue,
  type SecurityConcern,
  type RubricScore,
  type ProjectSubmission,
  type ReviewOptions,
} from './code-reviewer';

// Peer Review
export {
  assignPeerReviewers,
  submitPeerReview,
  startPeerReview,
  skipPeerReview,
  getReviewerAssignments,
  getSubmissionReviews,
  aggregatePeerFeedback,
  getStudentPeerReviewStats,
  type PeerReviewAssignment,
  type PeerReviewData,
  type AggregatedFeedback,
  type AssignmentOptions,
} from './peer-review';
