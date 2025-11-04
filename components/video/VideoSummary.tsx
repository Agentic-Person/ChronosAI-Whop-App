'use client';

import React from 'react';
import { Play, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { buildYouTubeEmbedUrl } from '@/lib/video/youtube';

interface VideoChapter {
  title: string;
  description: string;
  timestamp: string;
  duration: string;
}

interface VideoSummaryProps {
  className?: string;
}

export function VideoSummary({ className }: VideoSummaryProps) {
  const chapters: VideoChapter[] = [
    {
      title: 'Introduction & Whop Milestone',
      description: 'Whop crosses $1 billion GMV milestone. Platform overview and why Whop is revolutionary for digital product creators.',
      timestamp: '0:00',
      duration: '2:30',
    },
    {
      title: 'Marketplace Opportunity & Easy Setup',
      description: 'Digital product market set to hit $325B by 2025. Over 2M weekly marketplace visitors. Account setup takes just 4 minutes.',
      timestamp: '2:30',
      duration: '2:30',
    },
    {
      title: 'Platform Structure & Core Features',
      description: 'Understanding WHOP vs whop. All products under one roof - courses, communities, payments, and more. Modular approach.',
      timestamp: '5:00',
      duration: '3:00',
    },
    {
      title: 'Essential Apps: Announcement & Chat',
      description: 'Announcement app serves as internal communication and email system. Chat app is essential for building thriving communities.',
      timestamp: '8:00',
      duration: '4:00',
    },
    {
      title: 'Course App & One-on-One Coaching',
      description: 'Sequential learning, content protection, certificates. Coaching call app allows premium rates like $1,500/hour consultations.',
      timestamp: '12:00',
      duration: '4:00',
    },
    {
      title: 'Bounties & Content Rewards',
      description: 'Pay users for completing tasks. Content Rewards incentivize short-form content creation. Powerful gamification tools.',
      timestamp: '16:00',
      duration: '3:00',
    },
    {
      title: 'Marketplace Setup & Optimization',
      description: 'Get listed on marketplace with 2M weekly visitors. Focus on category leaderboards, reviews, and affiliate marketing.',
      timestamp: '19:00',
      duration: '3:00',
    },
    {
      title: 'Conversion Optimization Strategies',
      description: 'Automated messaging, pop-up discounts, private affiliate links, tracking links. Strategies to reach $100K/month milestone.',
      timestamp: '22:00',
      duration: '2:00',
    },
  ];

  return (
    <>
      <style jsx global>{`
        .video-summary-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .video-summary-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .video-summary-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(255, 140, 66, 0.5);
          border-radius: 4px;
        }
        .video-summary-scroll::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 140, 66, 0.7);
        }
      `}</style>
      <Card padding="lg" className={`${className} flex flex-col h-full overflow-hidden rounded-xl`}>
        <div className="mb-4 flex-shrink-0">
          <h3 className="text-xl font-bold text-text-primary mb-1">
            ChronosAI
          </h3>
          <p className="text-sm text-text-secondary mb-1">
            Video Summary
          </p>
        </div>

        <div 
          className="flex-1 space-y-3 overflow-y-auto pr-2 video-summary-scroll"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255, 140, 66, 0.5) transparent',
          }}
        >
          {chapters.map((chapter, index) => {
            // Convert timestamp to seconds for YouTube URL
            const timestampToSeconds = (timestamp: string): number => {
              const parts = timestamp.split(':');
              if (parts.length === 2) {
                return parseInt(parts[0]) * 60 + parseInt(parts[1]);
              }
              return 0;
            };

            const handleChapterClick = () => {
              const seconds = timestampToSeconds(chapter.timestamp);
              const iframe = document.querySelector('iframe[title*="How To Make"]') as HTMLIFrameElement;
              if (iframe) {
                const videoId = 'vMZHiBhr0SM';
                iframe.src = buildYouTubeEmbedUrl(videoId, {
                  rel: 0,
                  modestbranding: 1,
                  controls: 1,
                  start: seconds,
                });
              }
            };

            return (
              <div
                key={index}
                onClick={handleChapterClick}
                className="group relative p-4 rounded-xl border border-border-primary hover:border-accent-orange/50 bg-gradient-to-br from-bg-card/50 to-bg-app/30 transition-all duration-300 hover:shadow-md hover:shadow-accent-orange/10 cursor-pointer overflow-hidden"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-lg bg-accent-orange/10 flex items-center justify-center group-hover:bg-accent-orange/20 transition-all">
                      <Play className="w-4 h-4 text-accent-orange" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold text-text-primary group-hover:text-accent-orange transition-colors line-clamp-1">
                        {chapter.title}
                      </h4>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed mb-2 line-clamp-2">
                      {chapter.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <Clock className="w-3 h-3" />
                      <span className="font-mono">{chapter.timestamp}</span>
                      <span>•</span>
                      <span>{chapter.duration}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}

