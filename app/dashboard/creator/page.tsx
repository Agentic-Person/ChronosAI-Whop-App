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
  Building2,
  Crown,
} from 'lucide-react';
import { StatsCard } from '@/components/creator/StatsCard';
import { QuickActionCard } from '@/components/creator/QuickActionCard';
import { ProcessingQueue } from '@/components/creator/ProcessingQueue';
import { RecentActivity } from '@/components/creator/RecentActivity';
import { Card } from '@/components/ui/Card';
import { UsageDashboard } from '@/components/usage/UsageDashboard';
import { getCreatorStats, getProcessingVideos, getRecentActivity } from '@/lib/creator/analytics';
import { retryProcessing } from '@/lib/creator/videoManager';
// MCP imports disabled for MVP OAuth deployment - Whop features will be re-enabled after MCP setup
// import { getCompanyInfo, listMemberships, WhopCompanyInfo } from '@/lib/whop/mcp/client';
import toast from 'react-hot-toast';

// Temporary type for Whop company info (will use MCP type when re-enabled)
interface WhopCompanyInfo {
  id: string;
  name: string;
  email?: string;
  website?: string;
  logo_url?: string;
  description?: string;
}

interface MembershipStats {
  total: number;
  active: number;
  expired: number;
  cancelled: number;
  trialing: number;
}

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
  const [whopCompany, setWhopCompany] = useState<WhopCompanyInfo | null>(null);
  const [membershipStats, setMembershipStats] = useState<MembershipStats>({
    total: 0,
    active: 0,
    expired: 0,
    cancelled: 0,
    trialing: 0,
  });
  const [loading, setLoading] = useState(true);

  // Mock creator ID - in production, get from auth
  const creatorId = 'mock-creator-id';

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch dashboard data (Whop MCP features temporarily disabled for MVP OAuth deployment)
      const [statsData, processingData, activityData] = await Promise.all([
        getCreatorStats(creatorId),
        getProcessingVideos(creatorId),
        getRecentActivity(creatorId, 10),
      ]);

      // Stub Whop company info and memberships until MCP is re-enabled
      const companyInfo = null;
      const memberships: any[] = [];

      setStats(statsData);
      setProcessingVideos(processingData);
      setRecentActivity(activityData);
      setWhopCompany(companyInfo);

      // Calculate membership stats
      if (memberships && memberships.length > 0) {
        const membershipCounts = memberships.reduce(
          (acc, membership) => {
            acc.total++;
            if (membership.status === 'active') acc.active++;
            else if (membership.status === 'expired') acc.expired++;
            else if (membership.status === 'cancelled') acc.cancelled++;
            else if (membership.status === 'trialing') acc.trialing++;
            return acc;
          },
          { total: 0, active: 0, expired: 0, cancelled: 0, trialing: 0 }
        );
        setMembershipStats(membershipCounts);
      }
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
      {/* Welcome Section with Whop Company Info */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back{whopCompany?.name ? `, ${whopCompany.name}` : ''}!
            </h1>
            <p className="text-text-secondary">
              Here's what's happening with your course today.
            </p>
          </div>
          {whopCompany?.logo_url && (
            <div className="flex items-center gap-3">
              <img
                src={whopCompany.logo_url}
                alt={whopCompany.name}
                className="w-12 h-12 rounded-lg object-cover border border-border"
              />
            </div>
          )}
        </div>

        {/* Whop Company Details Card */}
        {whopCompany && (
          <Card padding="md" className="bg-primary-500/5 border border-primary-500/20">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary-500/10 rounded-lg">
                <Building2 className="w-6 h-6 text-primary-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-lg">{whopCompany.name}</h3>
                  <span className="px-2 py-1 bg-accent-gold/20 text-accent-gold text-xs font-semibold rounded flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Whop Connected
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Company Email</p>
                    <p className="text-sm font-medium">{whopCompany.email || 'N/A'}</p>
                  </div>
                  {whopCompany.website && (
                    <div>
                      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Website</p>
                      <a
                        href={whopCompany.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary-500 hover:underline"
                      >
                        {whopCompany.website}
                      </a>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Company ID</p>
                    <p className="text-sm font-mono text-text-muted">{whopCompany.id.slice(0, 12)}...</p>
                  </div>
                </div>
                {whopCompany.description && (
                  <p className="text-sm text-text-secondary mt-3">{whopCompany.description}</p>
                )}
              </div>
            </div>
          </Card>
        )}
      </motion.div>

      {/* Stats Cards - Now includes Whop membership stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
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
          title="Active Members"
          value={membershipStats.active}
          icon={Users}
          subtitle={`${membershipStats.total} total memberships`}
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

      {/* Whop Membership Breakdown */}
      {membershipStats.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <Card padding="lg">
            <h3 className="font-bold mb-4">Membership Status Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <p className="text-2xl font-bold text-green-500">{membershipStats.active}</p>
                <p className="text-sm text-text-secondary mt-1">Active</p>
              </div>
              <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-2xl font-bold text-blue-500">{membershipStats.trialing}</p>
                <p className="text-sm text-text-secondary mt-1">Trialing</p>
              </div>
              <div className="text-center p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <p className="text-2xl font-bold text-yellow-500">{membershipStats.expired}</p>
                <p className="text-sm text-text-secondary mt-1">Expired</p>
              </div>
              <div className="text-center p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <p className="text-2xl font-bold text-red-500">{membershipStats.cancelled}</p>
                <p className="text-sm text-text-secondary mt-1">Cancelled</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

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

      {/* Usage Tracking & Cost Monitoring */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <UsageDashboard creatorId={creatorId} />
      </motion.div>
    </div>
  );
}
