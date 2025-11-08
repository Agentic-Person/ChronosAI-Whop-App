/**
 * Message List Component
 * Displays chat messages with auto-scroll and virtualization
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '@/types/database';
import { VideoReferenceList } from './VideoReferenceCard';
import { formatRelativeTime } from '@/lib/utils/helpers';
import { User, Bot, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils/helpers';
import ReactMarkdown from 'react-markdown';

interface MessageListProps {
  messages: ChatMessage[];
  onFeedback?: (messageId: string, feedback: 'positive' | 'negative') => void;
  onVideoClick?: (videoId: string, timestamp: number) => void;
  isLoading?: boolean;
  className?: string;
}

export function MessageList({
  messages,
  onFeedback,
  onVideoClick,
  isLoading = false,
  className,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(messages.length);

  // Auto-scroll to bottom only when NEW messages are added
  useEffect(() => {
    // Only scroll if messages were actually added (not on initial mount)
    if (messages.length > prevMessageCountRef.current && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className={cn('flex-1 overflow-y-auto p-4 space-y-4', className)}
    >
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            onFeedback={onFeedback}
            onVideoClick={onVideoClick}
          />
        ))
      )}

      {/* Loading Indicator */}
      {isLoading && <TypingIndicator />}

      {/* Auto-scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}

/**
 * Individual Message Component
 */
interface MessageProps {
  message: ChatMessage;
  onFeedback?: (messageId: string, feedback: 'positive' | 'negative') => void;
  onVideoClick?: (videoId: string, timestamp: number) => void;
}

function Message({ message, onFeedback, onVideoClick }: MessageProps) {
  const isUser = message.role === 'user';
  const hasVideoReferences = message.video_references && message.video_references.length > 0;

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={cn(
        'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center',
        isUser ? 'bg-indigo-500/20 text-indigo-500' : 'bg-bg-elevated text-text-muted'
      )}>
        {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </div>

      {/* Message Content */}
      <div className={cn('flex-1 space-y-2', isUser ? 'items-end' : 'items-start')}>
        {/* Message Bubble */}
        <div
          className={cn(
            'inline-block rounded-2xl px-4 py-3 max-w-[80%]',
            isUser
              ? 'bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-500/20'
              : 'bg-bg-elevated text-text-primary border border-teal'
          )}
          style={!isUser ? { boxShadow: 'var(--shadow-teal-glow)' } : undefined}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <p className={cn(
          'text-xs text-gray-500',
          isUser ? 'text-right' : 'text-left'
        )}>
          {formatRelativeTime(message.created_at)}
        </p>

        {/* Video References (AI messages only) */}
        {!isUser && hasVideoReferences && (
          <VideoReferenceList
            references={message.video_references!}
            onVideoClick={onVideoClick}
            className="max-w-[80%]"
          />
        )}

        {/* Feedback Buttons (AI messages only) */}
        {!isUser && onFeedback && (
          <FeedbackButtons
            messageId={message.id}
            currentFeedback={message.feedback}
            onFeedback={onFeedback}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Feedback Buttons Component
 */
interface FeedbackButtonsProps {
  messageId: string;
  currentFeedback?: 'positive' | 'negative' | null;
  onFeedback: (messageId: string, feedback: 'positive' | 'negative') => void;
}

function FeedbackButtons({
  messageId,
  currentFeedback,
  onFeedback,
}: FeedbackButtonsProps) {
  return (
    <div className="flex gap-2 items-center">
      <p className="text-xs text-gray-500">Was this helpful?</p>
      <button
        onClick={() => onFeedback(messageId, 'positive')}
        className={cn(
          'p-1.5 rounded-xl hover:bg-gray-200 transition-colors',
          currentFeedback === 'positive' ? 'text-green-600 bg-green-50' : 'text-gray-400'
        )}
        aria-label="Thumbs up"
      >
        <ThumbsUp className="h-4 w-4" />
      </button>
      <button
        onClick={() => onFeedback(messageId, 'negative')}
        className={cn(
          'p-1.5 rounded-xl hover:bg-gray-200 transition-colors',
          currentFeedback === 'negative' ? 'text-red-600 bg-red-50' : 'text-gray-400'
        )}
        aria-label="Thumbs down"
      >
        <ThumbsDown className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Empty State Component
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/10 flex items-center justify-center mb-4 border border-teal shadow-lg shadow-indigo-500/20" style={{ boxShadow: 'var(--shadow-teal-glow)' }}>
        <Bot className="h-8 w-8 text-indigo-500" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        Ask me anything about the course
      </h3>
      <p className="text-sm text-text-secondary max-w-md">
        I can help you understand concepts, find specific videos, and answer questions
        based on the course content.
      </p>

      {/* Suggested Questions */}
      <div className="mt-6 space-y-2 w-full max-w-md">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
          Try asking:
        </p>
        <SuggestedQuestion text="How do I get started with..." />
        <SuggestedQuestion text="Can you explain the concept of..." />
        <SuggestedQuestion text="Where can I find the video about..." />
      </div>
    </div>
  );
}

/**
 * Suggested Question Component
 */
function SuggestedQuestion({ text }: { text: string }) {
  return (
    <div
      className="text-left p-3 bg-bg-elevated rounded-xl border border-teal text-sm text-text-secondary hover:bg-bg-hover hover:border-indigo-500 cursor-pointer transition-all transform hover:scale-[1.02]"
      style={{ boxShadow: 'var(--shadow-teal-glow)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 30px rgba(99, 102, 241, 0.3), 0 0 60px rgba(99, 102, 241, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-teal-glow)';
      }}
    >
      "{text}"
    </div>
  );
}

/**
 * Typing Indicator Component
 */
function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-bg-elevated flex items-center justify-center border border-teal shadow-sm">
        <Bot className="h-5 w-5 text-text-muted" />
      </div>
      <div className="bg-bg-elevated border border-border-default rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
