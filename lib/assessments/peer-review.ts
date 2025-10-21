/**
 * Peer Review System
 * Manages peer review assignments and submissions
 *
 * Features:
 * - Assign submissions to peers for review
 * - Guided review forms
 * - Anonymous feedback option
 * - Review validation (prevent spam)
 * - Reviewer XP rewards
 */

import { supabase } from '@/lib/utils/supabase-client';
import { logger } from '@/lib/infrastructure/monitoring/logger';
import { awardXP } from '@/lib/progress/gamification-engine';

// =====================================================
// Types
// =====================================================

export interface PeerReviewAssignment {
  id: string;
  submission_id: string;
  reviewer_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  review?: PeerReviewData;
  score?: number;
  time_spent_minutes?: number;
  xp_awarded: number;
  assigned_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface PeerReviewData {
  rating: number; // 1-5 stars
  strengths: string[];
  improvements: string[];
  comments: string;
  would_use_approach: boolean;
  code_quality_rating: number; // 1-5
  functionality_rating: number; // 1-5
}

export interface AggregatedFeedback {
  submission_id: string;
  total_reviews: number;
  avg_rating: number;
  avg_code_quality: number;
  avg_functionality: number;
  all_strengths: string[];
  all_improvements: string[];
  reviewer_consensus: string;
}

export interface AssignmentOptions {
  count: number; // Number of reviewers to assign
  excludeIds?: string[]; // Students to exclude from assignment
  sameDifficultyLevel?: boolean; // Assign reviewers with similar skill
}

// =====================================================
// Assignment Management
// =====================================================

/**
 * Assign peer reviewers to a submission
 */
export async function assignPeerReviewers(
  submissionId: string,
  options: AssignmentOptions
): Promise<PeerReviewAssignment[]> {
  try {
    logger.info('Assigning peer reviewers', { submission_id: submissionId, options });

    // Get submission details
    const { data: submission, error: submissionError } = await supabase
      .from('project_submissions')
      .select('student_id, projects(creator_id)')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      throw new Error('Submission not found');
    }

    const creatorId = submission.projects.creator_id;
    const submitterId = submission.student_id;

    // Get eligible reviewers
    const eligibleReviewers = await getEligibleReviewers(
      creatorId,
      submitterId,
      submissionId,
      options
    );

    if (eligibleReviewers.length === 0) {
      throw new Error('No eligible reviewers found');
    }

    // Select random reviewers
    const selectedReviewers = selectRandomReviewers(
      eligibleReviewers,
      Math.min(options.count, eligibleReviewers.length)
    );

    // Create assignments
    const assignments = await Promise.all(
      selectedReviewers.map(reviewerId =>
        createPeerReviewAssignment(submissionId, reviewerId)
      )
    );

    logger.info('Peer reviewers assigned', {
      submission_id: submissionId,
      count: assignments.length,
    });

    return assignments;
  } catch (error) {
    logger.error('Failed to assign peer reviewers', { error, submission_id: submissionId });
    throw error;
  }
}

/**
 * Submit a peer review
 */
export async function submitPeerReview(
  assignmentId: string,
  review: PeerReviewData
): Promise<void> {
  try {
    // Validate review
    validateReview(review);

    // Calculate score (0-100 based on ratings)
    const score = calculatePeerReviewScore(review);

    // Update assignment
    const { error } = await supabase
      .from('peer_review_assignments')
      .update({
        status: 'completed',
        review,
        score,
        completed_at: new Date().toISOString(),
      })
      .eq('id', assignmentId);

    if (error) throw error;

    // Get assignment details for XP award
    const { data: assignment } = await supabase
      .from('peer_review_assignments')
      .select('reviewer_id, submission_id')
      .eq('id', assignmentId)
      .single();

    if (assignment) {
      // Award XP to reviewer
      const xpAmount = 50; // Base XP for completing a review
      await awardXP(assignment.reviewer_id, xpAmount, 'peer_review_completed', {
        assignment_id: assignmentId,
        submission_id: assignment.submission_id,
      });

      // Update XP awarded in assignment
      await supabase
        .from('peer_review_assignments')
        .update({ xp_awarded: xpAmount })
        .eq('id', assignmentId);

      // Update peer review count on submission
      await updateSubmissionPeerReviewStats(assignment.submission_id);
    }

    logger.info('Peer review submitted', { assignment_id: assignmentId });
  } catch (error) {
    logger.error('Failed to submit peer review', { error, assignment_id: assignmentId });
    throw error;
  }
}

/**
 * Mark assignment as in progress
 */
export async function startPeerReview(assignmentId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('peer_review_assignments')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('id', assignmentId);

    if (error) throw error;

    logger.info('Peer review started', { assignment_id: assignmentId });
  } catch (error) {
    logger.error('Failed to start peer review', { error, assignment_id: assignmentId });
    throw error;
  }
}

/**
 * Skip a peer review assignment
 */
export async function skipPeerReview(
  assignmentId: string,
  reason?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('peer_review_assignments')
      .update({
        status: 'skipped',
        review: { skip_reason: reason },
      })
      .eq('id', assignmentId);

    if (error) throw error;

    logger.info('Peer review skipped', { assignment_id: assignmentId, reason });
  } catch (error) {
    logger.error('Failed to skip peer review', { error, assignment_id: assignmentId });
    throw error;
  }
}

// =====================================================
// Review Retrieval
// =====================================================

/**
 * Get assignments for a reviewer
 */
export async function getReviewerAssignments(
  reviewerId: string,
  status?: PeerReviewAssignment['status']
): Promise<PeerReviewAssignment[]> {
  try {
    let query = supabase
      .from('peer_review_assignments')
      .select('*')
      .eq('reviewer_id', reviewerId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('assigned_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Failed to get reviewer assignments', { error, reviewer_id: reviewerId });
    return [];
  }
}

/**
 * Get reviews for a submission
 */
export async function getSubmissionReviews(
  submissionId: string
): Promise<PeerReviewAssignment[]> {
  try {
    const { data, error } = await supabase
      .from('peer_review_assignments')
      .select('*')
      .eq('submission_id', submissionId)
      .eq('status', 'completed');

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Failed to get submission reviews', { error, submission_id: submissionId });
    return [];
  }
}

/**
 * Get aggregated peer feedback for a submission
 */
export async function aggregatePeerFeedback(
  submissionId: string
): Promise<AggregatedFeedback> {
  try {
    const reviews = await getSubmissionReviews(submissionId);

    if (reviews.length === 0) {
      return {
        submission_id: submissionId,
        total_reviews: 0,
        avg_rating: 0,
        avg_code_quality: 0,
        avg_functionality: 0,
        all_strengths: [],
        all_improvements: [],
        reviewer_consensus: 'No reviews yet',
      };
    }

    // Calculate averages
    const avgRating =
      reviews.reduce((sum, r) => sum + (r.review?.rating || 0), 0) / reviews.length;
    const avgCodeQuality =
      reviews.reduce((sum, r) => sum + (r.review?.code_quality_rating || 0), 0) /
      reviews.length;
    const avgFunctionality =
      reviews.reduce((sum, r) => sum + (r.review?.functionality_rating || 0), 0) /
      reviews.length;

    // Aggregate strengths and improvements
    const allStrengths: string[] = [];
    const allImprovements: string[] = [];

    reviews.forEach(r => {
      if (r.review?.strengths) {
        allStrengths.push(...r.review.strengths);
      }
      if (r.review?.improvements) {
        allImprovements.push(...r.review.improvements);
      }
    });

    // Generate consensus
    const consensus = generateConsensus(avgRating, avgCodeQuality, avgFunctionality);

    return {
      submission_id: submissionId,
      total_reviews: reviews.length,
      avg_rating: Math.round(avgRating * 10) / 10,
      avg_code_quality: Math.round(avgCodeQuality * 10) / 10,
      avg_functionality: Math.round(avgFunctionality * 10) / 10,
      all_strengths: allStrengths,
      all_improvements: allImprovements,
      reviewer_consensus: consensus,
    };
  } catch (error) {
    logger.error('Failed to aggregate peer feedback', { error, submission_id: submissionId });
    throw error;
  }
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Get eligible reviewers for a submission
 */
async function getEligibleReviewers(
  creatorId: string,
  submitterId: string,
  submissionId: string,
  options: AssignmentOptions
): Promise<string[]> {
  // Get all students for this creator
  const { data: students, error } = await supabase
    .from('students')
    .select('id')
    .eq('creator_id', creatorId);

  if (error || !students) return [];

  // Exclude submitter and already assigned reviewers
  const excludeIds = [submitterId, ...(options.excludeIds || [])];

  // Get already assigned reviewer IDs
  const { data: existingAssignments } = await supabase
    .from('peer_review_assignments')
    .select('reviewer_id')
    .eq('submission_id', submissionId);

  if (existingAssignments) {
    excludeIds.push(...existingAssignments.map(a => a.reviewer_id));
  }

  return students
    .map(s => s.id)
    .filter(id => !excludeIds.includes(id));
}

/**
 * Select random reviewers from eligible list
 */
function selectRandomReviewers(eligible: string[], count: number): string[] {
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Create a peer review assignment
 */
async function createPeerReviewAssignment(
  submissionId: string,
  reviewerId: string
): Promise<PeerReviewAssignment> {
  const { data, error } = await supabase
    .from('peer_review_assignments')
    .insert({
      submission_id: submissionId,
      reviewer_id: reviewerId,
      status: 'pending',
      xp_awarded: 0,
      assigned_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Validate peer review data
 */
function validateReview(review: PeerReviewData): void {
  if (!review.rating || review.rating < 1 || review.rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  if (!review.code_quality_rating || review.code_quality_rating < 1 || review.code_quality_rating > 5) {
    throw new Error('Code quality rating must be between 1 and 5');
  }

  if (!review.functionality_rating || review.functionality_rating < 1 || review.functionality_rating > 5) {
    throw new Error('Functionality rating must be between 1 and 5');
  }

  if (!review.strengths || review.strengths.length === 0) {
    throw new Error('At least one strength must be provided');
  }

  if (!review.improvements || review.improvements.length === 0) {
    throw new Error('At least one improvement suggestion must be provided');
  }

  if (!review.comments || review.comments.trim().length < 20) {
    throw new Error('Comments must be at least 20 characters');
  }
}

/**
 * Calculate peer review score (0-100)
 */
function calculatePeerReviewScore(review: PeerReviewData): number {
  // Weight the ratings
  const ratingScore = (review.rating / 5) * 40; // 40% weight
  const codeQualityScore = (review.code_quality_rating / 5) * 30; // 30% weight
  const functionalityScore = (review.functionality_rating / 5) * 30; // 30% weight

  return Math.round(ratingScore + codeQualityScore + functionalityScore);
}

/**
 * Update peer review statistics on submission
 */
async function updateSubmissionPeerReviewStats(submissionId: string): Promise<void> {
  const reviews = await getSubmissionReviews(submissionId);

  if (reviews.length === 0) return;

  const avgScore =
    reviews.reduce((sum, r) => sum + (r.score || 0), 0) / reviews.length;

  await supabase
    .from('project_submissions')
    .update({
      peer_review_count: reviews.length,
      peer_review_avg_score: Math.round(avgScore * 100) / 100,
    })
    .eq('id', submissionId);
}

/**
 * Generate consensus summary
 */
function generateConsensus(
  avgRating: number,
  avgCodeQuality: number,
  avgFunctionality: number
): string {
  const overall = (avgRating + avgCodeQuality + avgFunctionality) / 3;

  if (overall >= 4.5) {
    return 'Excellent work! Peers highly recommend this implementation.';
  } else if (overall >= 4.0) {
    return 'Strong work overall. Peers found this implementation solid.';
  } else if (overall >= 3.0) {
    return 'Good effort with room for improvement. Peers see potential.';
  } else if (overall >= 2.0) {
    return 'Needs improvement. Peers suggest significant revisions.';
  } else {
    return 'Requires major revisions. Peers recommend reworking the approach.';
  }
}

/**
 * Get peer review statistics for a student
 */
export async function getStudentPeerReviewStats(studentId: string): Promise<{
  reviews_given: number;
  reviews_received: number;
  avg_score_given: number;
  avg_score_received: number;
  xp_earned: number;
}> {
  try {
    // Reviews given
    const { data: givenReviews } = await supabase
      .from('peer_review_assignments')
      .select('score, xp_awarded')
      .eq('reviewer_id', studentId)
      .eq('status', 'completed');

    const reviewsGiven = givenReviews?.length || 0;
    const avgScoreGiven = reviewsGiven > 0
      ? givenReviews!.reduce((sum, r) => sum + (r.score || 0), 0) / reviewsGiven
      : 0;
    const xpEarned = givenReviews?.reduce((sum, r) => sum + r.xp_awarded, 0) || 0;

    // Reviews received
    const { data: receivedSubmissions } = await supabase
      .from('project_submissions')
      .select('peer_review_count, peer_review_avg_score')
      .eq('student_id', studentId);

    const reviewsReceived = receivedSubmissions?.reduce(
      (sum, s) => sum + (s.peer_review_count || 0),
      0
    ) || 0;

    const avgScoreReceived = reviewsReceived > 0
      ? receivedSubmissions!.reduce(
          (sum, s) => sum + ((s.peer_review_avg_score || 0) * (s.peer_review_count || 0)),
          0
        ) / reviewsReceived
      : 0;

    return {
      reviews_given: reviewsGiven,
      reviews_received: reviewsReceived,
      avg_score_given: Math.round(avgScoreGiven * 10) / 10,
      avg_score_received: Math.round(avgScoreReceived * 10) / 10,
      xp_earned: xpEarned,
    };
  } catch (error) {
    logger.error('Failed to get student peer review stats', { error, student_id: studentId });
    return {
      reviews_given: 0,
      reviews_received: 0,
      avg_score_given: 0,
      avg_score_received: 0,
      xp_earned: 0,
    };
  }
}
