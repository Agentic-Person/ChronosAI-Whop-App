'use client';

import React from 'react';
import { Play, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';

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
      title: 'Introduction to ChronosAI',
      description: 'Overview of how AI transforms course delivery and student engagement',
      timestamp: '0:00',
      duration: '5:23',
    },
    {
      title: 'Setting Up Your First Course',
      description: 'Step-by-step guide to uploading and organizing your video content',
      timestamp: '5:23',
      duration: '8:45',
    },
    {
      title: 'Understanding AI Transcription',
      description: 'How ChronosAI automatically transcribes and indexes your videos',
      timestamp: '14:08',
      duration: '6:12',
    },
    {
      title: 'Interactive Q&A Features',
      description: 'Learn how students can ask questions and get instant timestamped answers',
      timestamp: '20:20',
      duration: '7:34',
    },
    {
      title: 'Analytics & Student Progress',
      description: 'Track student engagement and identify key learning moments',
      timestamp: '27:54',
      duration: '5:18',
    },
    {
      title: 'Best Practices for Creators',
      description: 'Tips for maximizing course completion rates and student satisfaction',
      timestamp: '33:12',
      duration: '4:52',
    },
  ];

  return (
    <Card padding="lg" className={className}>
      <div className="mb-4">
        <h3 className="text-xl font-bold text-text-primary mb-1">
          ChronosAI
        </h3>
        <p className="text-sm text-text-secondary mb-1">
          Video Summary
        </p>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {chapters.map((chapter, index) => (
          <div
            key={index}
            className="group relative p-4 rounded-lg border border-border-primary hover:border-accent-orange/50 bg-gradient-to-br from-bg-card/50 to-bg-app/30 transition-all duration-300 hover:shadow-md hover:shadow-accent-orange/10 cursor-pointer"
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
        ))}
      </div>
    </Card>
  );
}

