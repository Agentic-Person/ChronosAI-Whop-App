/**
 * Engagement Score Display
 * Shows gamified engagement metric for students
 */

'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface EngagementData {
  score: number;
  trend: 'improving' | 'stable' | 'declining';
  risk_level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export function EngagementScore() {
  const [engagement, setEngagement] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEngagement();
  }, []);

  const fetchEngagement = async () => {
    try {
      const res = await fetch('/api/intelligence/engagement');
      if (res.ok) {
        const data = await res.json();
        setEngagement(data.engagement);
      }
    } catch (error) {
      console.error('Failed to fetch engagement:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="w-24 h-24 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!engagement) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-blue-500 to-cyan-500';
    if (score >= 40) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const getTrendIcon = () => {
    switch (engagement.trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  // Calculate circle percentage
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (engagement.score / 100) * circumference;

  return (
    <div className="p-6 bg-white rounded-lg border shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        Engagement Score
        {getTrendIcon()}
      </h3>

      <div className="flex items-center gap-6">
        {/* Circular progress */}
        <div className="relative">
          <svg className="w-32 h-32 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="64"
              cy="64"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-200"
            />
            {/* Progress circle */}
            <circle
              cx="64"
              cy="64"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className={`${getScoreColor(engagement.score)}`}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-3xl font-bold ${getScoreColor(engagement.score)}`}>
              {engagement.score}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1">
          <div className="mb-4">
            <p className="text-sm text-gray-600">Status</p>
            <p className="font-medium capitalize">{engagement.risk_level === 'none' ? 'Excellent' : engagement.risk_level}</p>
          </div>

          {engagement.recommendations.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Tips to improve:</p>
              <ul className="space-y-1">
                {engagement.recommendations.slice(0, 2).map((rec, idx) => (
                  <li key={idx} className="text-sm text-gray-700">
                    • {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {engagement.score < 50 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Your engagement is low. Complete more videos and quizzes to boost your score!
          </p>
        </div>
      )}
    </div>
  );
}
