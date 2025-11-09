'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Video, TrendingUp, Trophy, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useWhopAuth } from '@/lib/hooks/useWhopIframeAuth';

interface Course {
  id: string;
  title: string;
  description?: string;
  video_count: number;
  total_duration: number;
  thumbnail_url?: string;
}

interface UserStats {
  totalVideos: number;
  currentStreak: number;
  totalXP: number;
  level: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { creator, isLoading: isAuthLoading } = useWhopAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalVideos: 0,
    currentStreak: 0,
    totalXP: 0,
    level: 1,
  });
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Fetch courses when creator is loaded
  useEffect(() => {
    if (creator?.creatorId) {
      fetchCourses();
      fetchStats();
    }
  }, [creator?.creatorId]);

  const fetchCourses = async () => {
    if (!creator?.creatorId) return;

    try {
      setIsLoadingCourses(true);
      const response = await fetch(`/api/courses?creatorId=${creator.creatorId}`);
      if (!response.ok) throw new Error('Failed to fetch courses');

      const data = await response.json();
      setCourses(data);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const fetchStats = async () => {
    try {
      setIsLoadingStats(true);
      // TODO: Replace with actual API endpoint when stats API is ready
      // For now, calculate from courses
      const totalVideos = courses.reduce((sum, course) => sum + course.video_count, 0);
      setStats({
        totalVideos,
        currentStreak: 0, // TODO: Fetch from API
        totalXP: 0, // TODO: Fetch from API
        level: 1, // TODO: Calculate from XP
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleCourseClick = (courseId: string) => {
    console.log('🔍 [Dashboard] Course clicked, navigating with courseId:', courseId);
    const targetUrl = `/dashboard/student/chat?course=${courseId}`;
    console.log('📡 [Dashboard] Navigating to:', targetUrl);
    router.push(targetUrl);
  };

  const handleCreateCourse = () => {
    router.push('/dashboard/creator/videos');
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Show loading state while authenticating
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-cyan mx-auto"></div>
          <p className="mt-4 text-text-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Redirect to landing if not authenticated
  if (!creator) {
    router.push('/');
    return null;
  }

  // Skeleton loader for courses
  const CourseSkeleton = () => (
    <Card className="bg-bg-card border border-border-default rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-video bg-bg-elevated" />
      <div className="p-4 space-y-3">
        <div className="h-6 bg-bg-elevated rounded" />
        <div className="h-4 bg-bg-elevated rounded w-2/3" />
        <div className="flex gap-2">
          <div className="h-6 bg-bg-elevated rounded w-20" />
          <div className="h-6 bg-bg-elevated rounded w-20" />
        </div>
      </div>
    </Card>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card hover className="bg-bg-card border border-border-default py-4 px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm mb-1">Total Videos</p>
                <p className="text-3xl font-bold">
                  {isLoadingStats ? '...' : stats.totalVideos}
                </p>
              </div>
              <div className="w-12 h-12 bg-accent-cyan/10 rounded-xl flex items-center justify-center">
                <Video className="w-6 h-6 text-accent-cyan" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card hover className="bg-bg-card border border-border-default py-4 px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm mb-1">Current Streak</p>
                <p className="text-3xl font-bold">
                  {isLoadingStats ? '...' : `${stats.currentStreak} days`}
                </p>
              </div>
              <div className="w-12 h-12 bg-accent-yellow/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-accent-yellow" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card hover className="bg-bg-card border border-border-default py-4 px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm mb-1">Total XP</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold">
                    {isLoadingStats ? '...' : stats.totalXP.toLocaleString()}
                  </p>
                  <p className="text-sm text-accent-purple">Level {stats.level}</p>
                </div>
              </div>
              <div className="w-12 h-12 bg-accent-purple/10 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-accent-purple" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Courses Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Your Courses</h2>

        {/* Loading State */}
        {isLoadingCourses && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <CourseSkeleton />
            <CourseSkeleton />
            <CourseSkeleton />
          </div>
        )}

        {/* Empty State */}
        {!isLoadingCourses && courses.length === 0 && (
          <Card className="bg-bg-card border border-border-default rounded-xl p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-bg-elevated rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-text-muted" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
              <p className="text-text-muted mb-6">
                Create your first course to get started with your learning journey!
              </p>
              <Button onClick={handleCreateCourse} size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Create Course
              </Button>
            </div>
          </Card>
        )}

        {/* Courses Grid */}
        {!isLoadingCourses && courses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
              >
                <Card
                  hover
                  className="bg-bg-card border border-border-default rounded-xl overflow-hidden cursor-pointer group"
                  onClick={() => handleCourseClick(course.id)}
                >
                  {/* Course Thumbnail */}
                  <div className="relative aspect-video bg-gradient-to-br from-accent-cyan/20 to-accent-purple/20 flex items-center justify-center">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-accent-cyan/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Video className="w-8 h-8 text-accent-cyan" />
                      </div>
                    )}
                  </div>

                  {/* Course Info */}
                  <div className="p-4">
                    <h3 className="text-xl font-semibold mb-2 line-clamp-1">
                      {course.title}
                    </h3>
                    {course.description && (
                      <p className="text-text-muted text-sm mb-3 line-clamp-2">
                        {course.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-sm text-text-muted">
                      <div className="flex items-center gap-1 bg-bg-elevated px-2 py-1 rounded-lg">
                        <Video className="w-4 h-4" />
                        <span>{course.video_count} videos</span>
                      </div>
                      {course.total_duration > 0 && (
                        <div className="flex items-center gap-1 bg-bg-elevated px-2 py-1 rounded-lg">
                          <span>{formatDuration(course.total_duration)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}

            {/* Create Course Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * courses.length }}
            >
              <Card
                hover
                className="bg-bg-card border-2 border-dashed border-border-default rounded-xl overflow-hidden cursor-pointer group h-full min-h-[280px]"
                onClick={handleCreateCourse}
              >
                <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-16 h-16 bg-accent-cyan/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-accent-cyan/20 transition-colors">
                    <Plus className="w-8 h-8 text-accent-cyan" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Create New Course</h3>
                  <p className="text-text-muted text-sm">
                    Add a new course to organize your learning content
                  </p>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
