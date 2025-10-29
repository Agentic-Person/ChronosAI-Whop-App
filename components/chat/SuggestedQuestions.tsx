/**
 * Suggested Questions Component
 * Shows AI-suggested questions and extracted topics from the video
 */

'use client';

import React from 'react';
import { Lightbulb, MessageCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/helpers';

interface Topic {
  id: string;
  title: string;
  timestamp?: string;
}

interface SuggestedQuestionsProps {
  questions?: string[];
  topics?: Topic[];
  onQuestionClick?: (question: string) => void;
  onTopicClick?: (topic: Topic) => void;
  className?: string;
}

export function SuggestedQuestions({
  questions = [],
  topics = [],
  onQuestionClick,
  onTopicClick,
  className
}: SuggestedQuestionsProps) {
  // Default suggested questions for demo
  const defaultQuestions = [
    "What are the key concepts covered in this video?",
    "Can you summarize the main points?",
    "What are the best practices mentioned?",
    "How does this relate to the previous module?"
  ];

  // Default topics extracted from video (demo)
  const defaultTopics = [
    { id: '1', title: 'Variables and Data Types', timestamp: '2:15' },
    { id: '2', title: 'Type Coercion', timestamp: '5:42' },
    { id: '3', title: 'Const vs Let', timestamp: '8:30' }
  ];

  const displayQuestions = questions.length > 0 ? questions : defaultQuestions;
  const displayTopics = topics.length > 0 ? topics : defaultTopics;

  return (
    <div className={cn('flex flex-col h-full bg-bg-app border-r border-border-default', className)}>
      {/* Suggested Questions Section */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-accent-orange" />
          <h3 className="text-sm font-semibold text-text-primary">Suggested Questions</h3>
        </div>

        {/* Questions List */}
        <div className="space-y-2 mb-6">
          {displayQuestions.map((question, idx) => (
            <button
              key={idx}
              onClick={() => onQuestionClick?.(question)}
              className="w-full text-left p-3 bg-bg-card border border-border-default rounded-lg hover:border-accent-orange/50 hover:bg-bg-elevated transition-all group"
            >
              <div className="flex items-start gap-2">
                <MessageCircle className="w-4 h-4 text-accent-orange mt-0.5 flex-shrink-0" />
                <p className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                  {question}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Video Topics Section */}
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-accent-orange" />
          <h3 className="text-sm font-semibold text-text-primary">Key Topics</h3>
        </div>

        {/* Topics List */}
        <div className="space-y-2">
          {displayTopics.map((topic) => (
            <button
              key={topic.id}
              onClick={() => onTopicClick?.(topic)}
              className="w-full text-left p-3 bg-amber-900/10 border border-amber-900/20 rounded-lg hover:border-accent-orange/50 transition-all group"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-text-primary group-hover:text-accent-orange transition-colors">
                  {topic.title}
                </p>
                {topic.timestamp && (
                  <span className="text-xs text-text-muted font-mono">{topic.timestamp}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
