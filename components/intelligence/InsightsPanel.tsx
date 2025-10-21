/**
 * Creator Insights Panel
 * Displays AI-generated insights for creators
 */

'use client';

import { useEffect, useState } from 'react';
import { Brain, AlertTriangle, TrendingUp, Target, X } from 'lucide-react';

interface Insight {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
  actions: Array<{
    title: string;
    description: string;
  }>;
}

export function InsightsPanel() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const res = await fetch('/api/intelligence/insights');
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights || []);
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissInsight = async (insightId: string) => {
    try {
      await fetch('/api/intelligence/insights', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightId }),
      });
      setInsights((prev) => prev.filter((i) => i.id !== insightId));
    } catch (error) {
      console.error('Failed to dismiss insight:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'critical' || priority === 'high') {
      return <AlertTriangle className="w-5 h-5" />;
    }
    return <TrendingUp className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-gray-100 rounded-lg animate-pulse h-24"></div>
        ))}
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 text-center">
        <Brain className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <h3 className="font-semibold text-gray-900 mb-2">No Insights Yet</h3>
        <p className="text-sm text-gray-600">
          AI insights will appear here as your students progress through the content.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Brain className="w-6 h-6 text-purple-600" />
          AI Insights
        </h2>
        <button
          onClick={fetchInsights}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Refresh
        </button>
      </div>

      {insights.map((insight) => (
        <div
          key={insight.id}
          className={`p-5 rounded-lg border-l-4 ${getPriorityColor(insight.priority)} relative`}
        >
          <button
            onClick={() => dismissInsight(insight.id)}
            className="absolute top-3 right-3 p-1 hover:bg-white/50 rounded"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3 mb-3">
            {getPriorityIcon(insight.priority)}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">{insight.title}</h3>
              <p className="text-sm text-gray-700">{insight.description}</p>
            </div>
          </div>

          {insight.actionable && insight.actions.length > 0 && (
            <div className="ml-8 space-y-2">
              <p className="text-xs font-medium text-gray-600 uppercase">
                Recommended Actions
              </p>
              {insight.actions.slice(0, 3).map((action, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Target className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{action.title}</p>
                    <p className="text-xs text-gray-600">{action.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
            <span className="capitalize">Priority: {insight.priority}</span>
            <span className="capitalize">Type: {insight.type.replace(/_/g, ' ')}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
