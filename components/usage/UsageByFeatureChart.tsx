'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
  Cell
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { BarChart3 } from 'lucide-react';
import { formatCost } from '@/lib/usage/pricing-config';

interface FeatureData {
  feature: string;
  calls: number;
  cost: number;
  color: string;
}

interface UsageByFeatureChartProps {
  creatorId: string;
}

// Color palette for features
const FEATURE_COLORS = {
  'Chat Messages': '#6366f1',          // Indigo
  'Videos Processed': '#3b82f6',       // Blue
  'Embeddings Generated': '#14b8a6',   // Teal
  'Transcription Minutes': '#06b6d4',  // Cyan
  'Storage Used (GB)': '#9ca3af',      // Gray
  'Vector Searches': '#8b5cf6',        // Purple
  'Quiz Generation': '#ec4899',        // Pink
};

/**
 * Custom Tooltip for Bar Chart
 */
const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as FeatureData;
    return (
      <div className="bg-bg-card/95 backdrop-blur-md border border-accent-orange/30 rounded-xl p-4 shadow-lg shadow-accent-orange/10">
        <p className="text-sm font-semibold text-text-primary mb-2">{data.feature}</p>
        <div className="space-y-1">
          <p className="text-xs text-text-secondary">
            Count: <span className="font-semibold text-text-primary">{data.calls.toLocaleString()}</span>
          </p>
          <p className="text-xs text-text-secondary">
            Cost: <span className="font-semibold text-text-primary">{formatCost(data.cost)}</span>
          </p>
          <p className="text-xs text-text-secondary">
            Avg: <span className="font-semibold text-text-primary">
              {data.calls > 0 ? formatCost(data.cost / data.calls) : '$0.00'}
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

/**
 * Usage by Feature Bar Chart
 *
 * Horizontal bar chart showing feature usage with:
 * - Count of operations
 * - Total cost per feature
 * - Color-coded by service type
 * - Responsive height based on number of features
 */
export default function UsageByFeatureChart({ creatorId }: UsageByFeatureChartProps) {
  const [data, setData] = useState<FeatureData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch usage summary
        const response = await fetch(`/api/usage/stats?creator_id=${creatorId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch usage stats');
        }

        const result = await response.json();

        if (result.success && result.data) {
          const transformedData = transformUsageData(result.data);
          setData(transformedData);
        } else {
          setError('No data available');
        }
      } catch (err) {
        console.error('Failed to fetch usage by feature data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [creatorId]);

  // Transform usage stats into feature breakdown
  const transformUsageData = (stats: any): FeatureData[] => {
    const features: FeatureData[] = [];

    // Add features based on available data
    if (stats.cost_by_service?.chat > 0) {
      features.push({
        feature: 'Chat Messages',
        calls: stats.total_api_calls || 0, // Approximation
        cost: stats.cost_by_service.chat,
        color: FEATURE_COLORS['Chat Messages'],
      });
    }

    if (stats.cost_by_service?.embeddings > 0) {
      features.push({
        feature: 'Embeddings Generated',
        calls: Math.round((stats.cost_by_service.embeddings / 0.0001) || 0), // Estimate based on pricing
        cost: stats.cost_by_service.embeddings,
        color: FEATURE_COLORS['Embeddings Generated'],
      });
    }

    if (stats.cost_by_service?.transcription > 0) {
      features.push({
        feature: 'Transcription Minutes',
        calls: Math.round((stats.cost_by_service.transcription / 0.006) || 0), // Estimate minutes
        cost: stats.cost_by_service.transcription,
        color: FEATURE_COLORS['Transcription Minutes'],
      });
    }

    if (stats.cost_by_service?.storage > 0) {
      features.push({
        feature: 'Storage Used (GB)',
        calls: Math.round((stats.cost_by_service.storage / 0.023) || 0), // Estimate GB
        cost: stats.cost_by_service.storage,
        color: FEATURE_COLORS['Storage Used (GB)'],
      });
    }

    // Sort by cost descending
    return features.sort((a, b) => b.cost - a.cost);
  };

  if (loading) {
    return (
      <Card padding="lg" className="animate-pulse">
        <div className="h-8 w-48 bg-bg-hover rounded mb-4"></div>
        <div className="h-64 bg-bg-hover rounded"></div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card padding="lg" className="border-red-500/30 bg-red-500/5">
        <div className="flex items-center gap-2 text-red-500">
          <BarChart3 className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card padding="lg" className="border-accent-orange/30">
        <div className="flex flex-col items-center justify-center h-64 text-text-muted">
          <BarChart3 className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm">No feature usage yet</p>
          <p className="text-xs mt-1">Start using features to see analytics</p>
        </div>
      </Card>
    );
  }

  // Calculate responsive height based on number of features
  const chartHeight = Math.max(300, data.length * 60);

  return (
    <Card padding="lg" className="border-accent-orange/30 bg-gradient-to-br from-accent-orange/5 to-accent-yellow/5">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-primary">Usage by Feature</h3>
            <p className="text-xs text-text-muted">Operations and costs per feature</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="hidden md:flex gap-6">
          <div className="text-right">
            <p className="text-xs text-text-muted">Total Operations</p>
            <p className="text-lg font-bold text-text-primary">
              {data.reduce((sum, item) => sum + item.calls, 0).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted">Total Cost</p>
            <p className="text-lg font-bold text-text-primary">
              {formatCost(data.reduce((sum, item) => sum + item.cost, 0))}
            </p>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={data}
          layout="horizontal"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />

          <XAxis
            type="number"
            stroke="#9ca3af"
            fontSize={12}
            tickFormatter={(value) => formatCost(value)}
          />

          <YAxis
            type="category"
            dataKey="feature"
            stroke="#9ca3af"
            fontSize={12}
            width={150}
          />

          <Tooltip content={<CustomTooltip />} />

          <Bar
            dataKey="cost"
            radius={[0, 8, 8, 0]}
            maxBarSize={40}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                style={{
                  filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.3))',
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Mobile Summary Stats */}
      <div className="md:hidden mt-4 grid grid-cols-2 gap-4">
        <div className="p-3 rounded-xl bg-bg-card/50 border border-accent-orange/20">
          <p className="text-xs text-text-muted mb-1">Total Operations</p>
          <p className="text-lg font-bold text-text-primary">
            {data.reduce((sum, item) => sum + item.calls, 0).toLocaleString()}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-bg-card/50 border border-accent-orange/20">
          <p className="text-xs text-text-muted mb-1">Total Cost</p>
          <p className="text-lg font-bold text-text-primary">
            {formatCost(data.reduce((sum, item) => sum + item.cost, 0))}
          </p>
        </div>
      </div>
    </Card>
  );
}
