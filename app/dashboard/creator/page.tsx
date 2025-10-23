'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Video,
  Users,
  MessageSquare,
  Clock,
  Upload,
  BarChart3,
  FolderOpen,
} from 'lucide-react';
import { StatsCard } from '@/components/creator/StatsCard';
import { QuickActionCard } from '@/components/creator/QuickActionCard';
import { ProcessingQueue } from '@/components/creator/ProcessingQueue';
import { RecentActivity } from '@/components/creator/RecentActivity';
import { Card } from '@/components/ui/Card';
import { getCreatorStats, getProcessingVideos, getRecentActivity } from '@/lib/creator/analytics';
import { retryProcessing } from '@/lib/creator/videoManager';
import toast from 'react-hot-toast';

export default function CreatorDashboardPage() {
  const [stats, setStats] = useState({
    totalVideos: 0,
    totalStudents: 0,
    totalChatMessages: 0,
    totalWatchTimeHours: 0,
    videosProcessing: 0,
  });

  const [processingVideos, setProcessingVideos] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock creator ID - in production, get from auth
  const creatorId = 'mock-creator-id';

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [statsData, processingData, activityData] = await Promise.all([
        getCreatorStats(creatorId),
        getProcessingVideos(creatorId),
        getRecentActivity(creatorId, 10),
      ]);

      setStats(statsData);
      setProcessingVideos(processingData);
      setRecentActivity(activityData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryProcessing = async (videoId: string) => {
    try {
      await retryProcessing(videoId);
      toast.success('Processing restarted');
      loadDashboardData();
    } catch (error) {
      toast.error('Failed to retry processing');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
        <p className="text-text-secondary">
          Here's what's happening with your course today.
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatsCard
          title="Total Videos"
          value={stats.totalVideos}
          icon={Video}
          trend={{ value: 12, label: 'vs last month' }}
        />
        <StatsCard
          title="Total Students"
          value={stats.totalStudents}
          icon={Users}
          trend={{ value: 8, label: 'vs last month' }}
        />
        <StatsCard
          title="Chat Messages"
          value={stats.totalChatMessages.toLocaleString()}
          icon={MessageSquare}
          trend={{ value: 24, label: 'vs last week' }}
        />
        <StatsCard
          title="Watch Time"
          value={`${stats.totalWatchTimeHours}h`}
          icon={Clock}
        />
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionCard
            title="Upload Videos"
            description="Add new course content and expand your library"
            icon={Upload}
            href="/dashboard/creator/videos"
          />
          <QuickActionCard
            title="View Analytics"
            description="Track student engagement and course performance"
            icon={BarChart3}
            href="/dashboard/creator/analytics"
          />
          <QuickActionCard
            title="Manage Videos"
            description="Organize and edit your video library"
            icon={FolderOpen}
            href="/dashboard/creator/videos"
          />
        </div>
      </motion.div>

      {/* Processing Queue & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <ProcessingQueue
            videos={processingVideos}
            onRetry={handleRetryProcessing}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <RecentActivity events={recentActivity} />
        </motion.div>
      </div>

      {/* Additional Insights */}
      {stats.videosProcessing > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card padding="lg" className="bg-accent-cyan/10 border border-accent-cyan/20">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-accent-cyan/20 rounded-lg">
                <Video className="w-6 h-6 text-accent-cyan" />
              </div>
              <div>
                <h3 className="font-bold mb-1">Videos Processing</h3>
                <p className="text-sm text-text-secondary mb-3">
                  You have {stats.videosProcessing} video{stats.videosProcessing !== 1 ? 's' : ''}{' '}
                  currently being processed. This usually takes 5-10 minutes per hour of video.
                </p>
                <p className="text-xs text-text-muted">
                  You'll be notified when processing is complete and students can start watching.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
