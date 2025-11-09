/**
 * Interactive Chat Preview Component
 * Fully functional demo chat with 2-question limit
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, Play, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/helpers';
import Link from 'next/link';

interface StaticChatPreviewProps {
  className?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  videoReferences?: Array<{
    title: string;
    timestamp: string;
    duration: string;
  }>;
}

const DEMO_LIMIT_KEY = 'chronos-demo-questions';
const MAX_QUESTIONS = 2;

export function StaticChatPreview({ className }: StaticChatPreviewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'user',
      content: 'How long does it take to set up a Whop account?',
    },
    {
      id: '2',
      type: 'ai',
      content: 'Setting up your Whop account takes less than 5 minutes from start to finish. The platform guides you through the sign-up process naturally - you click the sign up button, enter your email, confirm with a code, and select "Create" to name your product. According to the video, Whop\'s onboarding team has streamlined the process so you can get your first product live in just 4 minutes.',
      videoReferences: [
        {
          title: 'How To Make $100,000 Per Month With Whop',
          timestamp: '3:34',
          duration: '24:00',
        },
      ],
    },
    {
      id: '3',
      type: 'user',
      content: 'What makes Whop different from other platforms?',
    },
    {
      id: '4',
      type: 'ai',
      content: 'Whop stands out because it consolidates everything under one roof - courses, communities, digital products, payments, and more. Unlike other platforms that make you figure everything out yourself, Whop has an in-house team that handles the heavy lifting. The platform offers unmatched reach with over 2 million weekly marketplace visitors, and you can use it modularly - some creators only use it for payments while others use all features. The flexibility and robust payment processing system with multiple payment options (including crypto and buy-now-pay-later) make it unique.',
      videoReferences: [
        {
          title: 'How To Make $100,000 Per Month With Whop',
          timestamp: '4:04',
          duration: '24:00',
        },
        {
          title: 'How To Make $100,000 Per Month With Whop',
          timestamp: '4:32',
          duration: '24:00',
        },
      ],
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load question count from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(DEMO_LIMIT_KEY);
    if (stored) {
      const count = parseInt(stored, 10);
      setQuestionCount(count);
      setIsLocked(count >= MAX_QUESTIONS);
    }
  }, []);

  // Scroll to bottom only when NEW messages are added (not on initial mount)
  const prevMessageCountRef = useRef(messages.length);
  useEffect(() => {
    // Only scroll if messages were actually added (not on initial mount)
    if (messages.length > prevMessageCountRef.current && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  const handleSend = async () => {
    const trimmed = inputMessage.trim();
    if (!trimmed || isLoading || isLocked) return;

    // Check if limit reached
    if (questionCount >= MAX_QUESTIONS) {
      setIsLocked(true);
      return;
    }

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Increment question count
    const newCount = questionCount + 1;
    setQuestionCount(newCount);
    localStorage.setItem(DEMO_LIMIT_KEY, newCount.toString());

    // Check if limit reached
    if (newCount >= MAX_QUESTIONS) {
      setIsLocked(true);
    }

    try {
      // Call demo chat API
      const response = await fetch('/api/demo/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      if (data.success && data.data) {
        // Add AI response
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: data.data.answer,
          videoReferences: data.data.video_references?.map((ref: any) => ({
            title: ref.title || 'How To Make $100,000 Per Month With Whop',
            timestamp: formatTimestamp(ref.timestamp),
            duration: '24:00',
          })),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        throw new Error(data.error?.message || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'ai',
        content: 'Sorry, I encountered an error. Please try again later.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const remainingQuestions = MAX_QUESTIONS - questionCount;

  return (
    <div className={cn('flex flex-col bg-bg-app rounded-xl overflow-hidden border-[3px] border-accent-orange/40 shadow-2xl', className)}>
      {/* Messages Area - Scrollable with fixed height */}
      <div className="overflow-y-auto p-6 space-y-6 max-h-[350px] min-h-[200px] custom-scrollbar">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3 items-start',
              message.type === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {/* Chronos Icon for AI */}
            {message.type === 'ai' && (
              <div className="flex-shrink-0 mt-1">
                <img
                  src="/images/logo_brand/chronos_icon_256.png"
                  alt="Chronos AI"
                  className="w-7 h-7 object-contain rounded-xl"
                />
              </div>
            )}

            <div className={cn('flex flex-col gap-2 max-w-[75%]')}>
              {/* Message Bubble */}
              <div
                className={cn(
                  'rounded-xl px-4 py-3 text-xs leading-relaxed',
                  message.type === 'user'
                    ? 'bg-gradient-to-br from-accent-orange to-accent-orange/90 text-white shadow-lg'
                    : 'bg-[#827261] text-white border border-[#827261]'
                )}
              >
                {message.content}
              </div>

              {/* Video References */}
              {message.type === 'ai' && message.videoReferences && message.videoReferences.length > 0 && (
                <div className="flex flex-col gap-2">
                  {message.videoReferences.map((ref, idx) => (
                    <div
                      key={idx}
                      className="group flex items-center gap-3 px-3 py-2.5 bg-amber-900/10 border border-amber-900/20 rounded-xl hover:border-accent-orange/50 transition-all cursor-pointer"
                    >
                      <div className="flex-shrink-0 h-8 w-8 rounded-xl bg-accent-orange/10 flex items-center justify-center group-hover:bg-accent-orange/20 transition-all">
                        <Play className="h-3.5 w-3.5 text-accent-orange" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-text-primary truncate group-hover:text-accent-orange transition-colors">
                          {ref.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          <span className="font-mono">{ref.timestamp}</span>
                          <span>•</span>
                          <span>{ref.duration}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User Icon */}
            {message.type === 'user' && (
              <div className="flex-shrink-0 h-7 w-7 rounded-xl bg-accent-orange/20 border border-accent-orange/40 flex items-center justify-center mt-1">
                <User className="h-4 w-4 text-accent-orange" />
              </div>
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        {isLoading && (
          <div className="flex gap-3 items-start justify-start opacity-70">
            <div className="flex-shrink-0 mt-1">
              <img
                src="/images/logo_brand/chronos_icon_256.png"
                alt="Chronos AI"
                className="w-7 h-7 object-contain rounded-xl"
              />
            </div>
            <div className="bg-[#827261] border border-[#827261] rounded-xl px-4 py-3 flex items-center gap-1.5">
              <div className="w-2 h-2 bg-accent-orange rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-accent-orange rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-accent-orange rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Dark Background */}
      <div className="border-t border-accent-orange/20 bg-bg-app p-4 rounded-b-xl">
        {isLocked ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-xs text-text-secondary text-center">
              You've reached the demo limit. Visit us on Whop to continue chatting!
            </p>
            <a
              href="/api/whop/auth/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-accent-orange to-accent-orange/90 text-white rounded-xl font-semibold text-xs hover:opacity-90 transition-all shadow-lg border-2 border-white transform hover:scale-105"
            >
              Visit us on Whop
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-xl border-2 border-accent-orange/30 bg-bg-app px-4 py-2.5 text-xs text-text-muted font-medium focus-within:border-accent-orange/60 transition-colors">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && inputMessage.trim() && !isLoading) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask anything about your course videos..."
                  disabled={isLoading || isLocked}
                  className="w-full bg-transparent border-none outline-none text-text-primary placeholder-text-muted"
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!inputMessage.trim() || isLoading || isLocked}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-orange to-accent-orange/90 text-white shadow-lg hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-text-muted mt-2 text-center opacity-60">
              Interactive demo - {remainingQuestions} question{remainingQuestions !== 1 ? 's' : ''} remaining
            </p>
          </>
        )}
      </div>
    </div>
  );
}
