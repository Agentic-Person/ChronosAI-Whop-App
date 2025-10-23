# Module 6: Creator Dashboard - Implementation Guide

## Prerequisites

Before building the dashboard:
- [ ] Module 8 (Backend Infrastructure) operational
- [ ] Module 7 (Whop Integration) for creator authentication
- [ ] Database with student and video data
- [ ] Analytics events being logged
- [ ] Material views created for aggregations

## Phase 1: Dashboard Layout & Navigation

### Step 1.1: Create Dashboard Layout

```typescript
// app/(dashboard)/creator/layout.tsx

import { Sidebar } from '@/components/dashboard/Sidebar';
import { TopNav } from '@/components/dashboard/TopNav';
import { withCreatorAuth } from '@/lib/whop/auth-middleware';

export default withCreatorAuth(function DashboardLayout({
  children,
}: {
  children: React.Node;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navigation bar */}
        <TopNav />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
});
```

### Step 1.2: Create Sidebar Navigation

```typescript
// components/dashboard/Sidebar.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Video,
  FileText,
  BarChart3,
  Settings,
  HelpCircle,
  Upload,
} from 'lucide-react';

const navItems = [
  {
    label: 'Overview',
    href: '/creator',
    icon: LayoutDashboard,
  },
  {
    label: 'Students',
    href: '/creator/students',
    icon: Users,
  },
  {
    label: 'Videos',
    href: '/creator/videos',
    icon: Video,
  },
  {
    label: 'Quizzes',
    href: '/creator/quizzes',
    icon: FileText,
  },
  {
    label: 'Analytics',
    href: '/creator/analytics',
    icon: BarChart3,
  },
  {
    label: 'Q&A Insights',
    href: '/creator/questions',
    icon: HelpCircle,
  },
  {
    label: 'Settings',
    href: '/creator/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">ChronosAI</h1>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1">
        {/* Quick Upload button */}
        <Link
          href="/creator/videos/upload"
          className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <Upload className="w-5 h-5" />
          <span className="font-medium">Upload Video</span>
        </Link>

        {/* Nav items */}
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

### Step 1.3: Create Top Navigation

```typescript
// components/dashboard/TopNav.tsx

'use client';

import { Bell, Search, ChevronDown } from 'lucide-react';
import { useCreator } from '@/hooks/useCreator';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function TopNav() {
  const { creator } = useCreator();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 max-w-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search students, videos, or analytics..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
          <Bell className="w-5 h-5" />
          {/* Notification badge */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg">
            <Avatar
              src={creator?.avatar_url}
              alt={creator?.name}
              fallback={creator?.name?.[0] || 'C'}
            />
            <span className="font-medium text-gray-700">{creator?.name}</span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Help & Support</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

## Phase 2: Dashboard Overview Page

### Step 2.1: Create Overview API Route

```typescript
// app/api/dashboard/overview/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/infrastructure/database/connection-pool';
import { cache } from '@/lib/infrastructure/cache/redis-client';
import { CacheKeys, CacheTTL } from '@/lib/infrastructure/cache/cache-keys';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const creatorId = searchParams.get('creatorId');

  if (!creatorId) {
    return NextResponse.json({ error: 'Creator ID required' }, { status: 400 });
  }

  try {
    // Try cache first
    const cacheKey = CacheKeys.creatorDashboard(creatorId);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch dashboard data
    const data = await fetchDashboardData(creatorId);

    // Cache for 5 minutes
    await cache.set(cacheKey, data, CacheTTL.MEDIUM);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Dashboard overview error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

async function fetchDashboardData(creatorId: string) {
  const supabase = getSupabaseAdmin();

  // Parallel queries for performance
  const [
    studentStats,
    progressStats,
    engagementData,
    supportStats,
  ] = await Promise.all([
    fetchStudentStats(supabase, creatorId),
    fetchProgressStats(supabase, creatorId),
    fetchEngagementData(supabase, creatorId),
    fetchSupportStats(supabase, creatorId),
  ]);

  return {
    students: studentStats,
    progress: progressStats,
    engagement: engagementData,
    support: supportStats,
    lastUpdated: new Date().toISOString(),
  };
}

async function fetchStudentStats(supabase, creatorId: string) {
  // Total students
  const { count: total } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', creatorId);

  // Active this week (7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { count: active } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', creatorId)
    .gte('last_active', sevenDaysAgo.toISOString());

  // New this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count: newThisMonth } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', creatorId)
    .gte('created_at', monthStart.toISOString());

  // Calculate trends (vs last period)
  const { count: activeLast } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', creatorId)
    .gte('last_active', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))
    .lt('last_active', sevenDaysAgo.toISOString());

  const activeTrend = activeLast
    ? ((active - activeLast) / activeLast) * 100
    : 0;

  return {
    total: total || 0,
    active: active || 0,
    newThisMonth: newThisMonth || 0,
    churnRate: 0.05, // TODO: Calculate actual churn
    trends: {
      active: Math.round(activeTrend),
    },
  };
}

async function fetchProgressStats(supabase, creatorId: string) {
  // Get average completion rate
  const { data: avgCompletion } = await supabase.rpc(
    'get_avg_completion_rate',
    { creator_id: creatorId }
  );

  // Videos watched this week
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { count: videosWatched } = await supabase
    .from('video_progress')
    .select('vp.*, s.creator_id', { count: 'exact', head: true })
    .innerJoin('students s', 'vp.student_id', 's.id')
    .eq('s.creator_id', creatorId)
    .gte('vp.last_watched', sevenDaysAgo.toISOString());

  // Quizzes passed this week
  const { count: quizzesPassed } = await supabase
    .from('quiz_attempts')
    .select('qa.*, s.creator_id', { count: 'exact', head: true })
    .innerJoin('students s', 'qa.student_id', 's.id')
    .eq('s.creator_id', creatorId)
    .eq('qa.passed', true)
    .gte('qa.created_at', sevenDaysAgo.toISOString());

  // Projects submitted this week
  const { count: projectsSubmitted } = await supabase
    .from('project_submissions')
    .select('ps.*, s.creator_id', { count: 'exact', head: true })
    .innerJoin('students s', 'ps.student_id', 's.id')
    .eq('s.creator_id', creatorId)
    .gte('ps.submitted_at', sevenDaysAgo.toISOString());

  return {
    avgCompletion: avgCompletion || 0,
    videosWatched: videosWatched || 0,
    quizzesPassed: quizzesPassed || 0,
    projectsSubmitted: projectsSubmitted || 0,
  };
}

async function fetchEngagementData(supabase, creatorId: string) {
  // Daily active users (last 30 days)
  const { data: dailyActive } = await supabase
    .from('daily_active_users')
    .select('date, active_count')
    .eq('creator_id', creatorId)
    .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    .order('date', { ascending: true });

  // Peak learning hours
  const { data: peakHours } = await supabase.rpc('get_peak_learning_hours', {
    creator_id: creatorId,
  });

  // Average session time
  const { data: avgSession } = await supabase.rpc('get_avg_session_time', {
    creator_id: creatorId,
  });

  return {
    dailyActiveUsers: dailyActive || [],
    peakHours: peakHours || [],
    avgSessionTime: avgSession || 0,
  };
}

async function fetchSupportStats(supabase, creatorId: string) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Questions asked
  const { count: questionsAsked } = await supabase
    .from('chat_messages')
    .select('cm.*, cs.creator_id', { count: 'exact', head: true })
    .innerJoin('chat_sessions cs', 'cm.session_id', 'cs.id')
    .eq('cs.creator_id', creatorId)
    .eq('cm.role', 'user')
    .gte('cm.created_at', sevenDaysAgo.toISOString());

  // AI answered (messages with AI response)
  const { count: aiAnswered } = await supabase
    .from('chat_messages')
    .select('cm.*, cs.creator_id', { count: 'exact', head: true })
    .innerJoin('chat_sessions cs', 'cm.session_id', 'cs.id')
    .eq('cs.creator_id', creatorId)
    .eq('cm.role', 'assistant')
    .gte('cm.created_at', sevenDaysAgo.toISOString());

  // Satisfaction rate (from helpful_rating)
  const { data: ratings } = await supabase
    .from('chat_messages')
    .select('helpful_rating')
    .innerJoin('chat_sessions cs', 'cm.session_id', 'cs.id')
    .eq('cs.creator_id', creatorId)
    .not('helpful_rating', 'is', null)
    .gte('created_at', sevenDaysAgo.toISOString());

  const satisfactionRate =
    ratings && ratings.length > 0
      ? ratings.reduce((sum, r) => sum + (r.helpful_rating || 0), 0) / ratings.length
      : 0;

  return {
    questionsAsked: questionsAsked || 0,
    aiAnswered: aiAnswered || 0,
    satisfactionRate: Math.round(satisfactionRate * 100) / 100,
  };
}
```

### Step 2.2: Create Overview Dashboard Component

```typescript
// app/(dashboard)/creator/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useCreator } from '@/hooks/useCreator';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { StudentAlerts } from '@/components/dashboard/StudentAlerts';
import { Users, TrendingUp, MessageCircle, CheckCircle } from 'lucide-react';

export default function DashboardOverview() {
  const { creator } = useCreator();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!creator?.id) return;

    fetch(`/api/dashboard/overview?creatorId=${creator.id}`)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load dashboard:', error);
        setLoading(false);
      });
  }, [creator?.id]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!data) {
    return <div>Failed to load dashboard data</div>;
  }

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {creator?.name}!
        </h1>
        <p className="text-gray-600 mt-1">
          Here's what's happening with your students today.
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Students"
          value={data.students.total}
          change={data.students.trends.active}
          icon={Users}
          iconColor="blue"
        />

        <MetricCard
          title="Active This Week"
          value={data.students.active}
          subtitle={`${Math.round(
            (data.students.active / data.students.total) * 100
          )}% of total`}
          icon={TrendingUp}
          iconColor="green"
        />

        <MetricCard
          title="Avg Completion"
          value={`${data.progress.avgCompletion}%`}
          subtitle="Course progress"
          icon={CheckCircle}
          iconColor="purple"
        />

        <MetricCard
          title="AI Satisfaction"
          value={`${Math.round(data.support.satisfactionRate * 100)}%`}
          subtitle={`${data.support.aiAnswered} questions answered`}
          icon={MessageCircle}
          iconColor="orange"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Daily Active Users"
          subtitle="Last 30 days"
          data={data.engagement.dailyActiveUsers}
          type="line"
        />

        <ChartCard
          title="Learning Activity"
          subtitle="This week"
          data={{
            labels: ['Videos', 'Quizzes', 'Projects'],
            values: [
              data.progress.videosWatched,
              data.progress.quizzesPassed,
              data.progress.projectsSubmitted,
            ],
          }}
          type="bar"
        />
      </div>

      {/* Student alerts */}
      <StudentAlerts creatorId={creator.id} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3"></div>
      <div className="grid grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded"></div>
        ))}
      </div>
    </div>
  );
}
```

### Step 2.3: Create Reusable Metric Card

```typescript
// components/dashboard/MetricCard.tsx

import { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  icon: LucideIcon;
  iconColor: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

const iconColorClasses = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  orange: 'bg-orange-100 text-orange-600',
  red: 'bg-red-100 text-red-600',
};

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  iconColor,
}: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${iconColorClasses[iconColor]}`}>
          <Icon className="w-6 h-6" />
        </div>

        {change !== undefined && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {change >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>

      <div>
        <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
```

## Phase 3: Video Management

### Step 3.1: Create Bulk Upload Component

```typescript
// app/(dashboard)/creator/videos/upload/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  metadata?: {
    title: string;
    description: string;
    difficulty: string;
  };
}

export default function BulkVideoUpload() {
  const router = useRouter();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (selectedFiles: FileList) => {
    const newFiles: UploadFile[] = Array.from(selectedFiles).map((file) => ({
      file,
      id: Math.random().toString(36),
      status: 'pending',
      progress: 0,
      metadata: {
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        description: '',
        difficulty: 'intermediate',
      },
    }));

    setFiles([...files, ...newFiles]);
  };

  const handleUploadAll = async () => {
    setUploading(true);

    // Upload in batches of 5
    const BATCH_SIZE = 5;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map((file) => uploadFile(file)));
    }

    setUploading(false);

    // Redirect to video library
    router.push('/creator/videos');
  };

  const uploadFile = async (uploadFile: UploadFile) => {
    try {
      // Update status
      updateFileStatus(uploadFile.id, 'uploading', 0);

      // Get signed URL for upload
      const { uploadUrl, videoId } = await getUploadUrl(uploadFile.file);

      // Upload file with progress tracking
      await uploadWithProgress(uploadUrl, uploadFile.file, (progress) => {
        updateFileStatus(uploadFile.id, 'uploading', progress);
      });

      // Mark as processing
      updateFileStatus(uploadFile.id, 'processing', 100);

      // Trigger processing job
      await fetch('/api/videos/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          metadata: uploadFile.metadata,
        }),
      });

      // Mark as completed
      updateFileStatus(uploadFile.id, 'completed', 100);
    } catch (error) {
      updateFileStatus(uploadFile.id, 'error', 0, error.message);
    }
  };

  const updateFileStatus = (
    id: string,
    status: UploadFile['status'],
    progress: number,
    error?: string
  ) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, status, progress, error } : f
      )
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Upload Videos
      </h1>

      {/* Drop zone */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors cursor-pointer"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFileSelect(e.dataTransfer.files);
        }}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          Drop videos here or click to browse
        </p>
        <p className="text-sm text-gray-600">
          Supports MP4, MOV, AVI up to 5GB per file
        </p>

        <input
          id="file-input"
          type="file"
          multiple
          accept="video/*"
          className="hidden"
          onChange={(e) =>
            e.target.files && handleFileSelect(e.target.files)
          }
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </h2>

            <Button
              onClick={handleUploadAll}
              disabled={uploading}
              className="px-6"
            >
              {uploading ? 'Uploading...' : 'Upload All'}
            </Button>
          </div>

          {files.map((file) => (
            <FileUploadCard
              key={file.id}
              file={file}
              onRemove={() =>
                setFiles(files.filter((f) => f.id !== file.id))
              }
              onUpdateMetadata={(metadata) =>
                setFiles((prev) =>
                  prev.map((f) =>
                    f.id === file.id ? { ...f, metadata } : f
                  )
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FileUploadCard({ file, onRemove, onUpdateMetadata }) {
  const statusIcons = {
    pending: <Upload className="w-5 h-5 text-gray-400" />,
    uploading: <Upload className="w-5 h-5 text-blue-600 animate-pulse" />,
    processing: <AlertCircle className="w-5 h-5 text-orange-600" />,
    completed: <Check className="w-5 h-5 text-green-600" />,
    error: <X className="w-5 h-5 text-red-600" />,
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-start gap-4">
        {/* Status icon */}
        <div className="mt-1">{statusIcons[file.status]}</div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={file.metadata.title}
            onChange={(e) =>
              onUpdateMetadata({ ...file.metadata, title: e.target.value })
            }
            className="text-sm font-medium text-gray-900 w-full border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none"
            disabled={file.status !== 'pending'}
          />

          <p className="text-sm text-gray-600 mt-1">
            {(file.file.size / 1024 / 1024).toFixed(2)} MB
          </p>

          {/* Progress bar */}
          {(file.status === 'uploading' || file.status === 'processing') && (
            <div className="mt-2">
              <Progress value={file.progress} className="h-2" />
              <p className="text-xs text-gray-600 mt-1">
                {file.status === 'uploading'
                  ? `Uploading... ${file.progress}%`
                  : 'Processing video...'}
              </p>
            </div>
          )}

          {/* Error message */}
          {file.status === 'error' && (
            <p className="text-sm text-red-600 mt-2">{file.error}</p>
          )}
        </div>

        {/* Remove button */}
        {file.status === 'pending' && (
          <button
            onClick={onRemove}
            className="text-gray-400 hover:text-red-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
```

## Phase 4: Analytics Dashboard

### Step 4.1: Create Analytics Charts

```typescript
// components/dashboard/ChartCard.tsx

'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  data: any[];
  type: 'line' | 'bar';
}

export function ChartCard({ title, subtitle, data, type }: ChartCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        {type === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="active_count"
              stroke="#3b82f6"
              strokeWidth={2}
            />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6" />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
```

## Testing the Dashboard

### Test Dashboard API

```bash
# Test overview endpoint
curl http://localhost:3000/api/dashboard/overview?creatorId=test-creator-id

# Expected response:
{
  "students": {
    "total": 245,
    "active": 187,
    "newThisMonth": 23
  },
  "progress": {...},
  "engagement": {...},
  "support": {...}
}
```

### Test Video Upload

```typescript
// scripts/test-video-upload.ts

async function testVideoUpload() {
  const formData = new FormData();
  formData.append('file', new Blob(['test'], { type: 'video/mp4' }), 'test.mp4');

  const response = await fetch('http://localhost:3000/api/videos/upload', {
    method: 'POST',
    body: formData,
  });

  console.log('Upload response:', await response.json());
}

testVideoUpload();
```

---

**Next**: Deploy and test with real creator data!
