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
    {
      id: '5',
      type: 'user',
      content: 'What are the most important apps to add to my Whop?',
    },
    {
      id: '6',
      type: 'ai',
      content: 'The most essential apps to start with are: 1) Announcement App - serves as both internal communication and external email system, crucial for retention. 2) Chat App - absolutely essential for building a thriving community; the "most addicting" category drives marketplace visibility. 3) Course App - powerful for structured content delivery with sequential learning, content protection, and certificates. 4) One-on-One Coaching Call App - allows premium rates and eliminates need for external scheduling tools. These core apps significantly increase user satisfaction and perceived value.',
      videoReferences: [
        {
          title: 'How To Make $100,000 Per Month With Whop',
          timestamp: '8:57',
          duration: '24:00',
        },
        {
          title: 'How To Make $100,000 Per Month With Whop',
          timestamp: '10:14',
          duration: '24:00',
        },
        {
          title: 'How To Make $100,000 Per Month With Whop',
          timestamp: '10:46',
          duration: '24:00',
        },
      ],
    },
  ];

  return (
    <div className={cn('flex flex-col h-full bg-bg-app rounded-xl overflow-hidden border-[3px] border-accent-orange/40 shadow-2xl', className)}>
      {/* Messages Area - Dark Background */}
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
          <div className="bg-[#827261] border border-[#827261] rounded-xl px-4 py-3 flex items-center gap-1.5">
            <div className="w-2 h-2 bg-accent-orange rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-accent-orange rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-accent-orange rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>

      {/* Input Area - Dark Background */}
      <div className="border-t border-accent-orange/20 bg-bg-app p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-lg border-2 border-accent-orange/30 bg-bg-app px-4 py-2.5 text-sm text-text-muted font-medium focus-within:border-accent-orange/60 transition-colors">
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
