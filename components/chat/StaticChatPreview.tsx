/**
 * Static Chat Preview Component
 * Clean, minimal design - no disco vibes!
 */

'use client';

import React from 'react';
import { User, Play } from 'lucide-react';
import { cn } from '@/lib/utils/helpers';

interface StaticChatPreviewProps {
  className?: string;
}

export function StaticChatPreview({ className }: StaticChatPreviewProps) {
  const demoMessages = [
    {
      id: '1',
      type: 'user',
      content: 'Can you explain the key concepts from the introduction video?',
    },
    {
      id: '2',
      type: 'ai',
      content: 'Based on the Introduction to the Course video, the key concepts covered include foundational principles, core objectives, and the learning path structure. The instructor emphasizes hands-on practice and progressive skill building.',
      videoReferences: [
        {
          title: 'Introduction to the Course',
          timestamp: '2:34',
          duration: '12:34',
        },
      ],
    },
    {
      id: '3',
      type: 'user',
      content: 'What are the best practices mentioned in module 2?',
    },
    {
      id: '4',
      type: 'ai',
      content: 'Module 2 covers several best practices including code organization, naming conventions, and performance optimization techniques. The key takeaway is maintaining clean, readable code structure.',
      videoReferences: [
        {
          title: 'Getting Started with Basics',
          timestamp: '8:15',
          duration: '18:22',
        },
        {
          title: 'Best Practices',
          timestamp: '3:45',
          duration: '20:30',
        },
      ],
    },
  ];

  return (
    <div className={cn('flex flex-col h-full bg-bg-app rounded-xl overflow-hidden border-[3px] border-accent-orange/40 shadow-2xl', className)}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {demoMessages.map((message) => (
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
                  src="/images/logo_brand/chronos_icon_grn.png"
                  alt="Chronos AI"
                  className="w-7 h-7 object-contain"
                />
              </div>
            )}

            <div className={cn('flex flex-col gap-2 max-w-[75%]')}>
              {/* Message Bubble */}
              <div
                className={cn(
                  'rounded-xl px-4 py-3 text-sm leading-relaxed',
                  message.type === 'user'
                    ? 'bg-gradient-to-br from-accent-orange to-accent-orange/90 text-white shadow-lg'
                    : 'bg-amber-900/20 text-text-primary border border-amber-900/30'
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
                      className="group flex items-center gap-3 px-3 py-2.5 bg-amber-900/10 border border-amber-900/20 rounded-lg hover:border-accent-orange/50 transition-all cursor-pointer"
                    >
                      <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-accent-orange/10 flex items-center justify-center group-hover:bg-accent-orange/20 transition-all">
                        <Play className="h-3.5 w-3.5 text-accent-orange" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate group-hover:text-accent-orange transition-colors">
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
              <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-accent-orange/20 border border-accent-orange/40 flex items-center justify-center mt-1">
                <User className="h-4 w-4 text-accent-orange" />
              </div>
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        <div className="flex gap-3 items-start justify-start opacity-70">
          <div className="flex-shrink-0 mt-1">
            <img
              src="/images/logo_brand/chronos_icon_grn.png"
              alt="Chronos AI"
              className="w-7 h-7 object-contain"
            />
          </div>
          <div className="bg-amber-900/20 border border-amber-900/30 rounded-xl px-4 py-3 flex items-center gap-1.5">
            <div className="w-2 h-2 bg-accent-orange rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-accent-orange rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-accent-orange rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>

      {/* Input Area - Orange Accent */}
      <div className="border-t border-accent-orange/20 bg-bg-app p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-lg border-2 border-accent-orange/30 bg-bg-elevated px-4 py-2.5 text-sm text-text-muted font-medium focus-within:border-accent-orange/60 transition-colors">
            Ask anything about your course videos...
          </div>
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-orange to-accent-orange/90 text-white shadow-lg hover:opacity-90 transition-opacity cursor-pointer">
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
          </div>
        </div>
        <p className="text-xs text-text-muted mt-2 text-center opacity-60">
          Interactive demo - Sign up to start chatting with AI
        </p>
      </div>
    </div>
  );
}
