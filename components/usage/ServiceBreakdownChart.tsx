'use client';

import React, { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  TooltipProps
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { PieChart as PieChartIcon } from 'lucide-react';
import { formatCost } from '@/lib/usage/pricing-config';

interface ServiceData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface ServiceBreakdownChartProps {
  creatorId: string;
}

// Color palette for services
const COLORS = {
  'AI Chat': '#6366f1',      // Indigo
  'Embeddings': '#14b8a6',   // Teal
  'Transcription': '#06b6d4', // Cyan
  'Storage': '#9ca3af',       // Gray
  'Other': '#6b7280',         // Dark Gray
};

/**
 * Custom Tooltip for Donut Chart
 */
const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ServiceData;
    return (
      <div className="bg-bg-card/95 backdrop-blur-md border border-accent-orange/30 rounded-xl p-4 shadow-lg shadow-accent-orange/10">
        <p className="text-sm font-semibold text-text-primary mb-1">{data.name}</p>
        <p className="text-xs text-text-secondary">
          Cost: <span className="font-semibold text-text-primary">{formatCost(data.value)}</span>
        </p>
        <p className="text-xs text-text-secondary">
          Share: <span className="font-semibold text-text-primary">{data.percentage.toFixed(1)}%</span>
        </p>
      </div>
    );
  }
  return null;
};

/**
 * Custom Label for Donut Center
 */
const renderCenterLabel = (totalCost: number) => {
  return (
    <text
      x="50%"
      y="50%"
      textAnchor="middle"
      dominantBaseline="middle"
    >
      <tspan
        x="50%"
        dy="-0.5em"
        fontSize="14"
        fill="#9ca3af"
        fontWeight="500"
      >
        Total Cost
      </tspan>
      <tspan
        x="50%"
        dy="1.5em"
        fontSize="24"
        fill="#fff"
        fontWeight="700"
      >
        {formatCost(totalCost)}
      </tspan>
    </text>
  );
};

/**
 * Service Breakdown Donut Chart
 *
 * Shows cost distribution across services:
 * - AI Chat (indigo)
 * - Embeddings (teal)
 * - Transcription (cyan)
 * - Storage (gray)
 *
 * Features:
 * - Total cost displayed in center
 * - Percentage labels in legend
 * - Interactive hover effects
 */
export default function ServiceBreakdownChart({ creatorId }: ServiceBreakdownChartProps) {
  const [data, setData] = useState<ServiceData[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch cost breakdown by service
        const response = await fetch(`/api/usage/breakdown?group_by=service&creator_id=${creatorId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch breakdown data');
        }

        const result = await response.json();

        if (result.success && result.data) {
          const transformedData = transformBreakdownData(result.data);
          setData(transformedData);

          const total = transformedData.reduce((sum, item) => sum + item.value, 0);
          setTotalCost(total);
        } else {
          setError('No data available');
        }
      } catch (err) {
        console.error('Failed to fetch service breakdown data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [creatorId]);

  // Transform API data into chart format
  const transformBreakdownData = (breakdown: any[]): ServiceData[] => {
    return breakdown
      .filter(item => item.cost > 0)
      .map(item => ({
        name: item.service,
        value: item.cost,
        percentage: item.percentage || 0,
        color: COLORS[item.service as keyof typeof COLORS] || COLORS.Other,
      }))
      .sort((a, b) => b.value - a.value);
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
          <PieChartIcon className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card padding="lg" className="border-accent-orange/30">
        <div className="flex flex-col items-center justify-center h-64 text-text-muted">
          <PieChartIcon className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm">No usage data yet</p>
          <p className="text-xs mt-1">Start using services to see breakdown</p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="border-accent-orange/30 bg-gradient-to-br from-accent-orange/5 to-accent-yellow/5">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-teal-500/20 flex items-center justify-center">
          <PieChartIcon className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-text-primary">Service Breakdown</h3>
          <p className="text-xs text-text-muted">Cost distribution by service</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                stroke={entry.color}
                strokeWidth={2}
                style={{
                  filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.3))',
                  cursor: 'pointer',
                }}
              />
            ))}
          </Pie>

          <Tooltip content={<CustomTooltip />} />

          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry: any) => {
              const item = data.find(d => d.name === value);
              return `${value} (${item?.percentage.toFixed(1)}%)`;
            }}
            wrapperStyle={{
              fontSize: '12px',
              paddingTop: '20px',
            }}
          />

          {/* Center Label */}
          {renderCenterLabel(totalCost)}
        </PieChart>
      </ResponsiveContainer>

      {/* Cost Summary Below Chart */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        {data.slice(0, 4).map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between p-3 rounded-xl bg-bg-card/50 border border-accent-orange/20"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-text-secondary">{item.name}</span>
            </div>
            <span className="text-sm font-semibold text-text-primary">
              {formatCost(item.value)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
