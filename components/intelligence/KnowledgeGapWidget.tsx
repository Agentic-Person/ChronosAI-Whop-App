/**
 * Knowledge Gap Widget
 * Displays identified knowledge gaps for students
 */

'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, TrendingUp, X } from 'lucide-react';

interface KnowledgeGap {
  id: string;
  concept: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: {
    confusedStudents: number;
    questionsAsked: number;
  };
  recommendations: string[];
}

export function KnowledgeGapWidget() {
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [closedGaps, setClosedGaps] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchGaps();
  }, []);

  const fetchGaps = async () => {
    try {
      const res = await fetch('/api/intelligence/gaps');
      if (res.ok) {
        const data = await res.json();
        setGaps(data.gaps || []);
      }
    } catch (error) {
      console.error('Failed to fetch knowledge gaps:', error);
    } finally {
      setLoading(false);
    }
  };

  const closeGap = (gapId: string) => {
    setClosedGaps((prev) => new Set(prev).add(gapId));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg border animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-20 bg-gray-100 rounded"></div>
      </div>
    );
  }

  const visibleGaps = gaps.filter((gap) => !closedGaps.has(gap.id));

  if (visibleGaps.length === 0) {
    return (
      <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-green-600" />
          <div>
            <h3 className="font-semibold text-green-900">Great Progress!</h3>
            <p className="text-sm text-green-700">
              No critical knowledge gaps detected. Keep up the good work!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-orange-500" />
        Knowledge Gaps ({visibleGaps.length})
      </h3>

      {visibleGaps.map((gap) => (
        <div
          key={gap.id}
          className={`p-4 rounded-lg border ${getSeverityColor(gap.severity)} relative`}
        >
          <button
            onClick={() => closeGap(gap.id)}
            className="absolute top-2 right-2 p-1 hover:bg-white/50 rounded"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="mb-2">
            <h4 className="font-medium text-sm mb-1">{gap.concept}</h4>
            <p className="text-xs opacity-75">
              {gap.evidence.questionsAsked} questions asked
            </p>
          </div>

          {gap.recommendations && gap.recommendations.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-medium">Recommended actions:</p>
              {gap.recommendations.slice(0, 2).map((rec, idx) => (
                <p key={idx} className="text-xs opacity-75">
                  • {rec}
                </p>
              ))}
            </div>
          )}
        </div>
      ))}

      <button
        onClick={fetchGaps}
        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        Refresh gaps
      </button>
    </div>
  );
}
