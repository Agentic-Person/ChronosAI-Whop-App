'use client';

import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { TrendingUp } from 'lucide-react';

interface CostDataPoint {
  date: string;
  total: number;
  chat: number;
  transcription: number;
  embeddings: number;
  storage: number;
}

interface CostOverTimeChartProps {
  creatorId: string;
}

/**
 * Custom Tooltip for Cost Over Time Chart
 */
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-card/95 backdrop-blur-md border border-accent-orange/30 rounded-xl p-4 shadow-lg shadow-accent-orange/10">
        <p className="text-sm font-semibold text-text-primary mb-2">
          {format(parseISO(label), 'MMM dd, yyyy')}
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4 text-xs">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span className="font-semibold text-text-primary">
              ${entry.value?.toFixed(4)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

/**
 * Cost Over Time Line Chart
 *
 * Shows cost trends over the last 30 days with separate lines for:
 * - Total cost (indigo)
 * - AI Chat (blue)
 * - Transcription (cyan)
 * - Embeddings (teal)
 */
export default function CostOverTimeChart({ creatorId }: CostOverTimeChartProps) {
  const [data, setData] = useState<CostDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch daily usage data for last 30 days
        const response = await fetch(`/api/usage/breakdown?group_by=day&creator_id=${creatorId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch cost data');
        }

        const result = await response.json();

        if (result.success && result.data) {
          // Transform data for chart
          const transformedData = transformDailyData(result.data);
          setData(transformedData);
        } else {
          setError('No data available');
        }
      } catch (err) {
        console.error('Failed to fetch cost over time data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [creatorId]);

  // Transform daily summaries into chart format
  const transformDailyData = (summaries: any[]): CostDataPoint[] => {
    return summaries.map(summary => ({
      date: summary.period_start,
      total: summary.total_cost_usd || 0,
      chat: summary.chat_cost_usd || 0,
      transcription: summary.transcription_cost_usd || 0,
      embeddings: summary.embedding_cost_usd || 0,
      storage: summary.storage_cost_usd || 0,
    }));
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
          <TrendingUp className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card padding="lg" className="border-accent-orange/30">
        <div className="flex flex-col items-center justify-center h-64 text-text-muted">
          <TrendingUp className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm">No usage data yet</p>
          <p className="text-xs mt-1">Start using the service to see trends</p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="border-accent-orange/30 bg-gradient-to-br from-accent-orange/5 to-accent-yellow/5">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-text-primary">Cost Over Time</h3>
          <p className="text-xs text-text-muted">Last 30 days</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="chatGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="transcriptionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="embeddingsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />

          <XAxis
            dataKey="date"
            stroke="#9ca3af"
            fontSize={12}
            tickFormatter={(value) => format(parseISO(value), 'MMM dd')}
          />

          <YAxis
            stroke="#9ca3af"
            fontSize={12}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            wrapperStyle={{
              fontSize: '12px',
              paddingTop: '10px',
            }}
          />

          <Line
            type="monotone"
            dataKey="total"
            name="Total"
            stroke="#6366f1"
            strokeWidth={2.5}
            fill="url(#totalGradient)"
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />

          <Line
            type="monotone"
            dataKey="chat"
            name="AI Chat"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#chatGradient)"
            dot={{ r: 2 }}
            activeDot={{ r: 4 }}
          />

          <Line
            type="monotone"
            dataKey="transcription"
            name="Transcription"
            stroke="#06b6d4"
            strokeWidth={2}
            fill="url(#transcriptionGradient)"
            dot={{ r: 2 }}
            activeDot={{ r: 4 }}
          />

          <Line
            type="monotone"
            dataKey="embeddings"
            name="Embeddings"
            stroke="#14b8a6"
            strokeWidth={2}
            fill="url(#embeddingsGradient)"
            dot={{ r: 2 }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
