import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getServerSideCreator } from '@/lib/whop/middleware';
import { CostMeter } from '@/components/usage/CostMeter';
import CostOverTimeChart from '@/components/usage/CostOverTimeChart';
import ServiceBreakdownChart from '@/components/usage/ServiceBreakdownChart';
import UsageByFeatureChart from '@/components/usage/UsageByFeatureChart';
import ApiCallsTable from '@/components/usage/ApiCallsTable';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

// Force dynamic rendering (uses cookies for auth)
export const dynamic = 'force-dynamic';

/**
 * Loading skeleton for charts
 */
function ChartSkeleton() {
  return (
    <Card padding="lg">
      <Skeleton className="h-8 w-48 mb-4" />
      <Skeleton className="h-64 w-full" />
    </Card>
  );
}

/**
 * Usage Page - Comprehensive usage tracking and analytics
 *
 * Features:
 * - Cost meters for daily/monthly spend
 * - Cost over time line chart
 * - Service breakdown donut chart
 * - Usage by feature bar chart
 * - Searchable API calls table
 */
export default async function UsagePage() {
  // Get authenticated creator from Whop session
  const creator = await getServerSideCreator();

  if (!creator) {
    redirect('/api/whop/auth/login');
  }

  const supabase = createClient();

  // Fetch cost limits for meters
  const { data: costLimit } = await supabase
    .from('cost_limits')
    .select('*')
    .eq('creator_id', creator.creatorId)
    .single();

  // Determine status for cost meters
  const getDailyStatus = (spent: number, limit: number) => {
    const percentage = (spent / limit) * 100;
    if (percentage >= 100) return 'exceeded';
    if (percentage >= 95) return 'critical';
    if (percentage >= 80) return 'warning';
    return 'good';
  };

  const dailySpent = costLimit?.daily_spent || 0;
  const monthlySpent = costLimit?.monthly_spent || 0;
  const dailyLimit = costLimit?.daily_limit || 10;
  const monthlyLimit = costLimit?.monthly_limit || 300;

  return (
    <div className="min-h-screen bg-bg-app p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-orange to-accent-yellow bg-clip-text text-transparent">
            Usage & Cost Tracking
          </h1>
          <p className="text-text-secondary mt-2">
            Monitor your API usage and costs across all services
          </p>
        </div>

        {/* Cost Meters Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CostMeter
            label="Daily Spend"
            current={dailySpent}
            limit={dailyLimit}
            period="daily"
            status={getDailyStatus(dailySpent, dailyLimit)}
          />
          <CostMeter
            label="Monthly Spend"
            current={monthlySpent}
            limit={monthlyLimit}
            period="monthly"
            status={getDailyStatus(monthlySpent, monthlyLimit)}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Suspense fallback={<ChartSkeleton />}>
            <CostOverTimeChart creatorId={creator.creatorId} />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <ServiceBreakdownChart creatorId={creator.creatorId} />
          </Suspense>
        </div>

        {/* Feature Usage Chart */}
        <Suspense fallback={<ChartSkeleton />}>
          <UsageByFeatureChart creatorId={creator.creatorId} />
        </Suspense>

        {/* API Calls Table */}
        <Suspense fallback={<ChartSkeleton />}>
          <ApiCallsTable creatorId={creator.creatorId} />
        </Suspense>
      </div>
    </div>
  );
}
