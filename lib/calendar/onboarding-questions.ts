/**
 * Onboarding Questions Configuration
 * Defines the questions asked during learning calendar onboarding
 */

import type { OnboardingQuestion } from '@/types/onboarding';

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    id: 'primaryGoal',
    question: "What's your main goal with this course?",
    description: 'This helps us tailor your learning path',
    type: 'single-select',
    options: [
      {
        value: 'career-change',
        label: 'Land a new job',
        description: 'I want to change careers or get hired',
        icon: '💼',
      },
      {
        value: 'skill-upgrade',
        label: 'Level up current skills',
        description: 'Improve my performance at work',
        icon: '📈',
      },
      {
        value: 'side-project',
        label: 'Build a side project',
        description: 'Create something on my own',
        icon: '🚀',
      },
      {
        value: 'curiosity',
        label: 'Learn for fun',
        description: 'Personal interest and growth',
        icon: '🎯',
      },
    ],
    required: true,
  },

  {
    id: 'skillLevel',
    question: "What's your current skill level?",
    type: 'single-select',
    options: [
      {
        value: 'beginner',
        label: 'Beginner',
        description: 'New to this topic',
        icon: '🌱',
      },
      {
        value: 'intermediate',
        label: 'Intermediate',
        description: 'Some experience already',
        icon: '🌿',
      },
      {
        value: 'advanced',
        label: 'Advanced',
        description: 'Looking to master advanced concepts',
        icon: '🌳',
      },
    ],
    required: true,
  },

  {
    id: 'availableHoursPerWeek',
    question: 'How much time can you dedicate weekly?',
    description: 'Be realistic - consistency beats intensity',
    type: 'single-select',
    options: [
      {
        value: '2',
        label: '2-3 hours',
        description: 'Casual learner (1-2 sessions/week)',
        icon: '🐢',
      },
      {
        value: '5',
        label: '5-7 hours',
        description: 'Committed student (3-4 sessions/week)',
        icon: '🏃',
      },
      {
        value: '10',
        label: '10-15 hours',
        description: 'Intensive mode (5-6 sessions/week)',
        icon: '⚡',
      },
      {
        value: '15',
        label: '15+ hours',
        description: 'Full-time learning',
        icon: '🔥',
      },
    ],
    required: true,
  },

  {
    id: 'targetCompletionWeeks',
    question: 'When do you want to finish?',
    description: 'We\'ll create a realistic schedule based on your availability',
    type: 'slider',
    min: 4,
    max: 24,
    step: 2,
    defaultValue: 12,
    required: true,
  },

  {
    id: 'preferredDays',
    question: 'Which days work best for you?',
    description: 'Select all that apply',
    type: 'multi-select',
    options: [
      { value: 'monday', label: 'Monday', icon: '📅' },
      { value: 'tuesday', label: 'Tuesday', icon: '📅' },
      { value: 'wednesday', label: 'Wednesday', icon: '📅' },
      { value: 'thursday', label: 'Thursday', icon: '📅' },
      { value: 'friday', label: 'Friday', icon: '📅' },
      { value: 'saturday', label: 'Saturday', icon: '📅' },
      { value: 'sunday', label: 'Sunday', icon: '📅' },
    ],
    required: true,
  },

  {
    id: 'preferredTimeSlots',
    question: 'When do you learn best?',
    description: 'Select all that apply',
    type: 'multi-select',
    options: [
      {
        value: 'morning',
        label: 'Morning',
        description: '6 AM - 12 PM',
        icon: '🌅',
      },
      {
        value: 'afternoon',
        label: 'Afternoon',
        description: '12 PM - 6 PM',
        icon: '☀️',
      },
      {
        value: 'evening',
        label: 'Evening',
        description: '6 PM - 11 PM',
        icon: '🌆',
      },
      {
        value: 'late-night',
        label: 'Late Night',
        description: '11 PM - 2 AM',
        icon: '🌙',
      },
    ],
    required: true,
  },

  {
    id: 'sessionLength',
    question: 'Preferred session length?',
    description: 'How long do you want to study in one sitting?',
    type: 'single-select',
    options: [
      {
        value: 'short',
        label: 'Short bursts',
        description: '20-30 minutes',
        icon: '⚡',
      },
      {
        value: 'medium',
        label: 'Medium sessions',
        description: '45-60 minutes',
        icon: '⏱️',
      },
      {
        value: 'long',
        label: 'Long deep dives',
        description: '90+ minutes',
        icon: '🏋️',
      },
    ],
    required: true,
  },

  {
    id: 'learningStyle',
    question: 'How do you learn best?',
    type: 'single-select',
    options: [
      {
        value: 'visual',
        label: 'Visual learner',
        description: 'I prefer watching and observing',
        icon: '👁️',
      },
      {
        value: 'hands-on',
        label: 'Hands-on learner',
        description: 'I learn by doing and practicing',
        icon: '🛠️',
      },
      {
        value: 'mixed',
        label: 'Mixed approach',
        description: 'Balance of watching and doing',
        icon: '🔄',
      },
    ],
    required: true,
  },

  {
    id: 'pacePreference',
    question: 'What pace works best for you?',
    type: 'single-select',
    options: [
      {
        value: 'steady',
        label: 'Steady pace',
        description: 'Consistent progress, avoid burnout',
        icon: '🎯',
      },
      {
        value: 'intensive',
        label: 'Intensive',
        description: 'Fast-paced, focused learning',
        icon: '🚀',
      },
      {
        value: 'flexible',
        label: 'Flexible',
        description: 'Adjust based on my schedule',
        icon: '🌊',
      },
    ],
    required: true,
  },

  {
    id: 'breakFrequency',
    question: 'How often do you need breaks?',
    type: 'single-select',
    options: [
      {
        value: 'frequent',
        label: 'Frequent breaks',
        description: 'Short break every 25-30 minutes',
        icon: '☕',
      },
      {
        value: 'moderate',
        label: 'Moderate breaks',
        description: 'Break every 45-60 minutes',
        icon: '🧘',
      },
      {
        value: 'minimal',
        label: 'Minimal breaks',
        description: 'I can focus for 90+ minutes',
        icon: '🎯',
      },
    ],
    required: false,
  },
];

/**
 * Session length to minutes mapping
 */
export const SESSION_LENGTH_MINUTES: Record<string, number> = {
  short: 25,
  medium: 50,
  long: 90,
};

/**
 * Time slot to hour mapping (24-hour format)
 */
export const TIME_SLOT_HOURS: Record<string, number> = {
  morning: 9,
  afternoon: 14,
  evening: 19,
  'late-night': 22,
};

/**
 * Day of week to number mapping (0 = Sunday)
 */
export const DAY_OF_WEEK_NUMBERS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};
