'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Play, Clock, CheckCircle, Lock, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';

interface Video {
  id: string;
  title: string;
  duration: string;
  durationSeconds: number;
  completed: boolean;
  locked: boolean;
  progress: number;
}

interface Day {
  id: string;
  number: number;
  title: string;
  videos: Video[];
  totalDuration: string;
  completed: boolean;
}

interface Week {
  id: string;
  number: number;
  title: string;
  days: Day[];
  progress: number;
  totalVideos: number;
  completedVideos: number;
}

export default function ModuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params.moduleId as string;

  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set(['week-1']));
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(['day-1']));

  // Mock data - will be replaced with API call
  const module = {
    id: moduleId,
    number: 1,
    title: 'Module 1: Foundations',
    description: 'Master the fundamentals and build a solid foundation for your learning journey.',
    color: '#059669', // teal
    totalWeeks: 3,
    totalDays: 15,
    totalVideos: 45,
    completedVideos: 12,
    progress: 27,
    estimatedTime: '60 hours',
  };

  const weeks: Week[] = [
    {
      id: 'week-1',
      number: 1,
      title: 'Getting Started',
      progress: 80,
      totalVideos: 15,
      completedVideos: 12,
      days: [
        {
          id: 'day-1',
          number: 1,
          title: 'Day 1: Introduction',
          totalDuration: '4h 12m',
          completed: true,
          videos: [
            {
              id: 'video-1',
              title: 'Welcome to the Course',
              duration: '8:24',
              durationSeconds: 504,
              completed: true,
              locked: false,
              progress: 100,
            },
            {
              id: 'video-2',
              title: 'Setting Up Your Environment',
              duration: '15:36',
              durationSeconds: 936,
              completed: true,
              locked: false,
              progress: 100,
            },
            {
              id: 'video-3',
              title: 'Your First Project',
              duration: '22:18',
              durationSeconds: 1338,
              completed: true,
              locked: false,
              progress: 100,
            },
          ],
        },
        {
          id: 'day-2',
          number: 2,
          title: 'Day 2: Core Concepts',
          totalDuration: '4h 8m',
          completed: false,
          videos: [
            {
              id: 'video-4',
              title: 'Understanding Variables',
              duration: '18:42',
              durationSeconds: 1122,
              completed: true,
              locked: false,
              progress: 100,
            },
            {
              id: 'video-5',
              title: 'Data Types Explained',
              duration: '24:16',
              durationSeconds: 1456,
              completed: false,
              locked: false,
              progress: 45,
            },
            {
              id: 'video-6',
              title: 'Control Flow Basics',
              duration: '28:34',
              durationSeconds: 1714,
              completed: false,
              locked: false,
              progress: 0,
            },
          ],
        },
        {
          id: 'day-3',
          number: 3,
          title: 'Day 3: Practice Exercises',
          totalDuration: '4h 5m',
          completed: false,
          videos: [
            {
              id: 'video-7',
              title: 'Exercise 1: Variables',
              duration: '12:20',
              durationSeconds: 740,
              completed: false,
              locked: false,
              progress: 0,
            },
            {
              id: 'video-8',
              title: 'Exercise 2: Conditionals',
              duration: '15:45',
              durationSeconds: 945,
              completed: false,
              locked: false,
              progress: 0,
            },
          ],
        },
      ],
    },
    {
      id: 'week-2',
      number: 2,
      title: 'Intermediate Concepts',
      progress: 20,
      totalVideos: 15,
      completedVideos: 3,
      days: [
        {
          id: 'day-4',
          number: 4,
          title: 'Day 4: Functions',
          totalDuration: '4h 15m',
          completed: false,
          videos: [
            {
              id: 'video-9',
              title: 'Introduction to Functions',
              duration: '20:30',
              durationSeconds: 1230,
              completed: false,
              locked: true,
              progress: 0,
            },
          ],
        },
      ],
    },
  ];

  const toggleWeek = (weekId: string) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekId)) {
        next.delete(weekId);
      } else {
        next.add(weekId);
      }
      return next;
    });
  };

  const toggleDay = (dayId: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) {
        next.delete(dayId);
      } else {
        next.add(dayId);
      }
      return next;
    });
  };

  const handleVideoClick = (videoId: string, locked: boolean) => {
    if (!locked) {
      router.push(`/dashboard/watch/${videoId}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header with Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div
          className="p-6 rounded-xl border-2"
          style={{
            borderColor: module.color + '40',
            backgroundColor: module.color + '10',
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <Badge
                variant="info"
                className="mb-2"
                style={{ backgroundColor: module.color + '30', color: module.color }}
              >
                Module {module.number}
              </Badge>
              <h1 className="text-3xl font-bold mb-2">{module.title}</h1>
              <p className="text-text-secondary text-lg">{module.description}</p>
            </div>
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold"
              style={{ backgroundColor: module.color + '20', color: module.color }}
            >
              M{module.number}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-text-muted text-sm">Weeks</p>
              <p className="text-xl font-bold">{module.totalWeeks}</p>
            </div>
            <div>
              <p className="text-text-muted text-sm">Days</p>
              <p className="text-xl font-bold">{module.totalDays}</p>
            </div>
            <div>
              <p className="text-text-muted text-sm">Videos</p>
              <p className="text-xl font-bold">
                {module.completedVideos} / {module.totalVideos}
              </p>
            </div>
            <div>
              <p className="text-text-muted text-sm">Total Time</p>
              <p className="text-xl font-bold">{module.estimatedTime}</p>
            </div>
          </div>

          <ProgressBar value={module.progress} max={100} barColor={module.color} className="h-2" />
          <p className="text-right text-sm text-text-muted mt-2">{module.progress}% Complete</p>
        </div>
      </div>

      {/* Weeks & Days */}
      <div className="space-y-4">
        {weeks.map((week, weekIndex) => {
          const isWeekExpanded = expandedWeeks.has(week.id);

          return (
            <motion.div
              key={week.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: weekIndex * 0.1 }}
            >
              <Card padding="none" className="overflow-hidden bg-bg-card border border-border-default">
                {/* Week Header */}
                <button
                  onClick={() => toggleWeek(week.id)}
                  className="w-full p-4 hover:bg-bg-hover transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl">
                        {isWeekExpanded ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                      </div>
                      <div className="text-left">
                        <h3 className="text-xl font-bold">{week.title}</h3>
                        <p className="text-sm text-text-muted">
                          Week {week.number} · {week.completedVideos} / {week.totalVideos} videos completed
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-2xl font-bold" style={{ color: module.color }}>
                          {week.progress}%
                        </p>
                      </div>
                    </div>
                  </div>
                  <ProgressBar
                    value={week.progress}
                    max={100}
                    barColor={module.color}
                    className="mt-3 h-1.5"
                  />
                </button>

                {/* Days */}
                <AnimatePresence>
                  {isWeekExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-border-default"
                    >
                      <div className="p-4 space-y-3">
                        {week.days.map((day) => {
                          const isDayExpanded = expandedDays.has(day.id);

                          return (
                            <div key={day.id} className="bg-bg-elevated rounded-lg overflow-hidden">
                              {/* Day Header */}
                              <button
                                onClick={() => toggleDay(day.id)}
                                className="w-full p-3 hover:bg-bg-hover transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div>
                                      {isDayExpanded ? (
                                        <ChevronDown size={20} />
                                      ) : (
                                        <ChevronRight size={20} />
                                      )}
                                    </div>
                                    <div className="text-left">
                                      <h4 className="font-semibold">{day.title}</h4>
                                      <p className="text-sm text-text-muted flex items-center gap-2">
                                        <Clock size={14} />
                                        {day.totalDuration} · {day.videos.length} videos
                                      </p>
                                    </div>
                                  </div>
                                  {day.completed && (
                                    <CheckCircle size={20} className="text-accent-green" />
                                  )}
                                </div>
                              </button>

                              {/* Videos */}
                              <AnimatePresence>
                                {isDayExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="px-3 pb-3 space-y-2"
                                  >
                                    {day.videos.map((video) => (
                                      <button
                                        key={video.id}
                                        onClick={() => handleVideoClick(video.id, video.locked)}
                                        disabled={video.locked}
                                        className={cn(
                                          'w-full p-3 rounded-lg border border-border-default transition-all',
                                          video.locked
                                            ? 'bg-bg-app opacity-50 cursor-not-allowed'
                                            : 'bg-bg-card hover:bg-bg-hover hover:border-border-hover'
                                        )}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <div
                                              className={cn(
                                                'w-10 h-10 rounded-lg flex items-center justify-center',
                                                video.completed
                                                  ? 'bg-accent-green/20'
                                                  : video.locked
                                                  ? 'bg-bg-elevated'
                                                  : 'bg-accent-cyan/20'
                                              )}
                                            >
                                              {video.locked ? (
                                                <Lock size={18} className="text-text-muted" />
                                              ) : video.completed ? (
                                                <CheckCircle size={18} className="text-accent-green" />
                                              ) : (
                                                <Play
                                                  size={18}
                                                  className="text-accent-cyan"
                                                  style={{ marginLeft: '2px' }}
                                                />
                                              )}
                                            </div>
                                            <div className="text-left">
                                              <p className="font-medium">{video.title}</p>
                                              <p className="text-sm text-text-muted">{video.duration}</p>
                                            </div>
                                          </div>
                                          {video.progress > 0 && video.progress < 100 && (
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm text-text-muted">
                                                {video.progress}%
                                              </span>
                                              <div className="w-20">
                                                <ProgressBar
                                                  value={video.progress}
                                                  max={100}
                                                  barColor={module.color}
                                                  className="h-1.5"
                                                />
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
