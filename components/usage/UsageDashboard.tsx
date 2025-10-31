'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  RefreshCw,
  Lightbulb,
  DollarSign,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { CostMeter } from './CostMeter';
import { UsageChart } from './UsageChart';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getBudgetStatus, formatCost } from '@/lib/usage/pricing-config';
import type { UsageStats, DailyUsagePoint, CostOptimizationSuggestion } from '@/lib/usage/types';

export interface UsageDashboardProps {
  userId?: string;
  creatorId?: string;
  className?: string;
}

/**
 * UsageDashboard Component
 *
 * Main dashboard for usage tracking and cost monitoring
 */
export const UsageDashboard: React.FC<UsageDashboardProps> = ({
  userId,
  creatorId,
  className,
}) => {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyUsagePoint[]>([]);
  const [breakdown, setBreakdown] = useState<any[]>([]);
  const [optimizations, setOptimizations] = useState<CostOptimizationSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Fetch usage data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      if (userId) params.append('user_id', userId);
      if (creatorId) params.append('creator_id', creatorId);

      // Fetch stats
      const statsResponse = await fetch(`/api/usage/stats?${params}`);
      if (!statsResponse.ok) throw new Error('Failed to fetch usage stats');
      const statsData = await statsResponse.json();
      setStats(statsData.data);

      // Fetch daily usage
      const dailyResponse = await fetch(`/api/usage/breakdown?${params}&group_by=day`);
      if (!dailyResponse.ok) throw new Error('Failed to fetch daily usage');
      const dailyData = await dailyResponse.json();
      setDailyUsage(dailyData.data);

      // Fetch cost breakdown by service
      const breakdownResponse = await fetch(`/api/usage/breakdown?${params}&group_by=service`);
      if (!breakdownResponse.ok) throw new Error('Failed to fetch cost breakdown');
      const breakdownData = await breakdownResponse.json();
      setBreakdown(breakdownData.data);

      // TODO: Fetch cost optimizations from backend
      // For now, generate some mock suggestions
      setOptimizations([]);
    } catch (err) {
      console.error('Failed to fetch usage data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  // Export usage data
  const handleExport = async (format: 'json' | 'csv') => {
    try {
      setExporting(true);

      const response = await fetch('/api/usage/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          creator_id: creatorId,
          format,
        }),
      });

      if (!response.ok) throw new Error('Export failed');

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `usage-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data.data, null, 2)], {
          type: 'application/json',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `usage-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export usage data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId, creatorId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-accent-cyan" />
        <span className="ml-3 text-text-muted">Loading usage data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card padding="lg" className="border border-red-500/40 bg-red-500/10">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <div>
            <h3 className="font-semibold text-red-500">Error Loading Usage Data</h3>
            <p className="text-sm text-text-muted">{error}</p>
          </div>
          <Button onClick={fetchData} variant="secondary" size="sm" className="ml-auto">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (!stats) return null;

  // Calculate budget status
  const dailyStatus = getBudgetStatus(stats.daily_spent, stats.daily_limit);
  const monthlyStatus = getBudgetStatus(stats.monthly_spent, stats.monthly_limit);

  // Determine tier from limits
  const tier =
    stats.monthly_limit <= 1
      ? 'FREE'
      : stats.monthly_limit <= 25
      ? 'BASIC'
      : stats.monthly_limit <= 100
      ? 'PRO'
      : 'ENTERPRISE';

  return (
    <div className={className}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Usage & Cost Monitoring</h1>
            <p className="text-text-muted">Track your API usage and optimize costs</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="info"
              className="bg-gradient-to-r from-accent-cyan/20 to-accent-purple/20 border border-accent-cyan/40"
            >
              {tier} Tier
            </Badge>
            <Button
              onClick={fetchData}
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh
            </Button>
            <div className="relative">
              <Button
                onClick={() => handleExport('csv')}
                variant="primary"
                size="sm"
                icon={<Download className="w-4 h-4" />}
                loading={exporting}
              >
                Export
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Cost Meters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <CostMeter
          label="Daily Spend"
          current={stats.daily_spent}
          limit={stats.daily_limit}
          period="daily"
          status={dailyStatus.status}
        />
        <CostMeter
          label="Monthly Spend"
          current={stats.monthly_spent}
          limit={stats.monthly_limit}
          period="monthly"
          status={monthlyStatus.status}
        />
      </div>

      {/* Charts */}
      <div className="mb-8">
        <UsageChart data={dailyUsage} />
      </div>

      {/* Cost Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-8"
      >
        <Card padding="lg">
          <h3 className="text-lg font-semibold mb-4">Cost Breakdown by Service</h3>
          {breakdown.length > 0 ? (
            <div className="space-y-3">
              {breakdown.map((item, index) => (
                <motion.div
                  key={item.service}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium capitalize">
                        {item.service}
                      </span>
                      <span className="text-sm text-text-muted">
                        {item.calls} calls
                      </span>
                    </div>
                    <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-accent-cyan"
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percentage}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{formatCost(item.cost)}</div>
                    <div className="text-xs text-text-muted">
                      {item.percentage.toFixed(1)}%
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-text-muted">
              No usage data available yet
            </div>
          )}
        </Card>
      </motion.div>

      {/* Cost Optimization Suggestions */}
      {optimizations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card padding="lg" className="border border-accent-yellow/40 bg-accent-yellow/5">
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="w-6 h-6 text-accent-yellow" />
              <h3 className="text-lg font-semibold">Cost Optimization Suggestions</h3>
            </div>
            <div className="space-y-3">
              {optimizations.map((suggestion, index) => (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="p-4 rounded-lg bg-bg-card border border-border-default"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{suggestion.title}</h4>
                      <p className="text-sm text-text-muted mb-2">
                        {suggestion.description}
                      </p>
                      <div className="flex items-center gap-3 text-xs">
                        <Badge variant="success">
                          Save {formatCost(suggestion.potential_savings)}
                        </Badge>
                        <span className="text-text-muted capitalize">
                          {suggestion.implementation_effort} effort
                        </span>
                      </div>
                    </div>
                    <TrendingUp className="w-5 h-5 text-accent-green" />
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
};
