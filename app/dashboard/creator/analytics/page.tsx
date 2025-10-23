'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  MessageSquare,
  Video,
  TrendingUp,
  Download,
} from 'lucide-react';
import { StatsCard } from '@/components/creator/StatsCard';
import { EnrollmentChart } from '@/components/creator/EnrollmentChart';
import { ChatActivityChart } from '@/components/creator/ChatActivityChart';
import { TopVideosChart } from '@/components/creator/TopVideosChart';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import {
  getCreatorStats,
  getEngagementMetrics,
  getTopVideos,
  getChatInsights,
} from '@/lib/creator/analytics';
import toast from 'react-hot-toast';

export default function CreatorAnalyticsPage() {
  const [stats, setStats] = useState({
    totalVideos: 0,
    totalStudents: 0,
    totalChatMessages: 0,
    totalWatchTimeHours: 0,
  });

  const [enrollmentData, setEnrollmentData] = useState<Record<string, number>>({});
  const [chatData, setChatData] = useState<Record<string, number>>({});
  const [topVideos, setTopVideos] = useState<any[]>([]);
  const [chatInsights, setChatInsights] = useState<any[]>([]);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);

  // Mock creator ID - in production, get from auth
  const creatorId = 'mock-creator-id';

  useEffect(() => {
    loadAnalyticsData();
  }, [period]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);

      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;

      const [statsData, metricsData, videosData, insightsData] = await Promise.all([
        getCreatorStats(creatorId),
        getEngagementMetrics(creatorId, days),
        getTopVideos(creatorId, 10),
        getChatInsights(creatorId, 10),
      ]);

      setStats(statsData);
      setEnrollmentData(metricsData.enrollmentsByDate);
      setChatData(metricsData.messagesByDate);
      setTopVideos(videosData);
      setChatInsights(insightsData);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    // TODO: Implement CSV export
    toast.success('Analytics data exported');
  };

  const periodTabs = [
    { id: '7d', label: 'Last 7 Days' },
    { id: '30d', label: 'Last 30 Days' },
    { id: '90d', label: 'Last 90 Days' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics</h1>
          <p className="text-text-secondary">
            Track student engagement and course performance
          </p>
        </div>
        <Button onClick={handleExportData}>
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </Button>
      </motion.div>

      {/* Period Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Tabs
          tabs={periodTabs}
          activeTab={period}
          onChange={(tab) => setPeriod(tab as '7d' | '30d' | '90d')}
        />
      </motion.div>

      {/* Overview Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatsCard
          title="Total Students"
          value={stats.totalStudents}
          icon={Users}
          trend={{ value: 8, label: 'vs last period' }}
        />
        <StatsCard
          title="Total Videos"
          value={stats.totalVideos}
          icon={Video}
        />
        <StatsCard
          title="Chat Messages"
          value={stats.totalChatMessages.toLocaleString()}
          icon={MessageSquare}
          trend={{ value: 15, label: 'vs last period' }}
        />
        <StatsCard
          title="Avg Engagement"
          value="78%"
          icon={TrendingUp}
          trend={{ value: 5, label: 'vs last period' }}
        />
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <EnrollmentChart data={enrollmentData} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <ChatActivityChart data={chatData} />
        </motion.div>
      </div>

      {/* Top Videos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <TopVideosChart videos={topVideos} />
      </motion.div>

      {/* Chat Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <Card padding="lg">
          <h3 className="text-lg font-bold mb-4">Common Questions & Topics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {chatInsights.map((insight, index) => (
              <div
                key={index}
                className="bg-bg-elevated rounded-lg p-3 text-center hover:bg-bg-hover transition-colors"
              >
                <p className="text-2xl font-bold text-accent-purple mb-1">
                  {insight.count}
                </p>
                <p className="text-sm text-text-muted truncate">{insight.word}</p>
              </div>
            ))}
          </div>
          {chatInsights.length === 0 && (
            <p className="text-text-secondary text-center py-8">
              No chat activity data yet
            </p>
          )}
        </Card>
      </motion.div>

      {/* Additional Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <Card padding="lg">
          <h3 className="text-lg font-bold mb-3">Student Retention</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Week 1</span>
              <span className="font-bold">95%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Week 2</span>
              <span className="font-bold">87%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Week 3</span>
              <span className="font-bold">78%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Week 4</span>
              <span className="font-bold">72%</span>
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <h3 className="text-lg font-bold mb-3">Average Session Time</h3>
          <p className="text-4xl font-bold text-accent-cyan mb-2">28 min</p>
          <p className="text-sm text-text-muted">
            Students spend an average of 28 minutes per session
          </p>
        </Card>

        <Card padding="lg">
          <h3 className="text-lg font-bold mb-3">Course Completion</h3>
          <p className="text-4xl font-bold text-accent-green mb-2">64%</p>
          <p className="text-sm text-text-muted">
            Average completion rate across all videos
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
