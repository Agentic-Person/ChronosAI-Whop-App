'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  UserPlus,
  Upload,
  CheckCircle,
  MessageSquare,
  Trophy,
  LucideIcon,
} from 'lucide-react';
import { RecentActivityEvent } from '@/lib/creator/analytics';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface RecentActivityProps {
  events: RecentActivityEvent[];
  className?: string;
}

export function RecentActivity({ events, className }: RecentActivityProps) {
  const getEventIcon = (type: RecentActivityEvent['type']): LucideIcon => {
    switch (type) {
      case 'student_enrolled':
        return UserPlus;
      case 'video_uploaded':
        return Upload;
      case 'video_completed':
        return CheckCircle;
      case 'student_question':
        return MessageSquare;
      case 'milestone_reached':
        return Trophy;
    }
  };

  const getEventColor = (type: RecentActivityEvent['type']) => {
    switch (type) {
      case 'student_enrolled':
        return 'bg-accent-cyan/10 text-accent-cyan';
      case 'video_uploaded':
        return 'bg-accent-purple/10 text-accent-purple';
      case 'video_completed':
        return 'bg-accent-green/10 text-accent-green';
      case 'student_question':
        return 'bg-accent-yellow/10 text-accent-yellow';
      case 'milestone_reached':
        return 'bg-accent-orange/10 text-accent-orange';
    }
  };

  if (events.length === 0) {
    return (
      <Card padding="lg" className={cn('bg-bg-card border border-border-default', className)}>
        <div className="text-center py-8">
          <p className="text-text-secondary">No recent activity</p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="none" className={cn('bg-bg-card border border-border-default', className)}>
      <div className="p-4 border-b border-border-default">
        <h3 className="text-lg font-bold">Recent Activity</h3>
      </div>

      <div className="divide-y divide-border-default max-h-[500px] overflow-y-auto">
        {events.map((event) => {
          const Icon = getEventIcon(event.type);
          const colorClass = getEventColor(event.type);

          return (
            <div key={event.id} className="p-4 hover:bg-bg-hover transition-colors">
              <div className="flex items-start gap-3">
                <div className={cn('p-2 rounded-lg flex-shrink-0', colorClass)}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-1">{event.description}</p>
                  <p className="text-xs text-text-muted">
                    {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                  </p>
                </div>

                {event.action && (
                  <Link href={event.action.href}>
                    <Button variant="ghost" size="sm">
                      {event.action.label}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
