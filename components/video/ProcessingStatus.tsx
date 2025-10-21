'use client';

/**
 * Processing Status Component
 *
 * Shows real-time video processing status with:
 * - Progress tracking
 * - Current step display
 * - Error messages
 * - Retry functionality
 */

import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle, RotateCw } from 'lucide-react';
import { ProcessingProgress } from '@/lib/video/types';

interface ProcessingStatusProps {
  videoId: string;
  onComplete?: () => void;
  pollInterval?: number;
}

export function ProcessingStatus({
  videoId,
  onComplete,
  pollInterval = 5000,
}: ProcessingStatusProps) {
  const [status, setStatus] = useState<ProcessingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch status
  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/video/status/${videoId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }

      const data = await response.json();
      setStatus(data);
      setLoading(false);

      // Call onComplete if processing finished
      if (data.status === 'completed') {
        onComplete?.();
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Poll for updates
  useEffect(() => {
    fetchStatus();

    // Only poll if not completed or failed
    const interval = setInterval(() => {
      if (status?.status !== 'completed' && status?.status !== 'failed') {
        fetchStatus();
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [videoId, status?.status]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start">
          <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="ml-3">
            <h4 className="text-sm font-medium text-red-900">Error loading status</h4>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Processing Status</h3>
        {status.status === 'completed' && (
          <CheckCircle className="h-6 w-6 text-green-500" />
        )}
        {status.status === 'failed' && (
          <XCircle className="h-6 w-6 text-red-500" />
        )}
        {(status.status === 'processing' || status.status === 'pending') && (
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        )}
      </div>

      {/* Progress Bar */}
      {status.status !== 'failed' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {status.currentStep || 'Initializing...'}
            </span>
            <span className="text-sm font-medium text-gray-900">{status.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${status.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Message */}
      <div className="space-y-2">
        {status.status === 'pending' && (
          <p className="text-sm text-gray-600">
            Video is queued for processing. This usually takes a few seconds.
          </p>
        )}

        {status.status === 'processing' && (
          <p className="text-sm text-gray-600">
            Processing your video. This may take several minutes depending on video length.
          </p>
        )}

        {status.status === 'completed' && (
          <div className="p-3 bg-green-50 rounded-md">
            <p className="text-sm font-medium text-green-900">
              Video processed successfully!
            </p>
            <p className="text-sm text-green-700 mt-1">
              Your video is now ready and searchable with AI.
            </p>
          </div>
        )}

        {status.status === 'failed' && status.error && (
          <div className="p-3 bg-red-50 rounded-md">
            <p className="text-sm font-medium text-red-900">Processing failed</p>
            <p className="text-sm text-red-700 mt-1">{status.error}</p>
            <button
              onClick={fetchStatus}
              className="mt-3 inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200"
            >
              <RotateCw className="h-4 w-4 mr-1.5" />
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Processing Steps */}
      {status.status === 'processing' && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-xs font-semibold text-gray-700 uppercase mb-3">
            Processing Steps
          </h4>
          <div className="space-y-2">
            <Step
              label="Audio Extraction"
              completed={status.progress > 10}
              active={status.progress <= 10}
            />
            <Step
              label="Transcription"
              completed={status.progress > 40}
              active={status.progress > 10 && status.progress <= 40}
            />
            <Step
              label="Chunking"
              completed={status.progress > 60}
              active={status.progress > 40 && status.progress <= 60}
            />
            <Step
              label="Embedding Generation"
              completed={status.progress > 90}
              active={status.progress > 60 && status.progress <= 90}
            />
            <Step
              label="Finalization"
              completed={status.progress === 100}
              active={status.progress > 90 && status.progress < 100}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Step({
  label,
  completed,
  active,
}: {
  label: string;
  completed: boolean;
  active: boolean;
}) {
  return (
    <div className="flex items-center">
      <div
        className={`
          h-2 w-2 rounded-full mr-3
          ${completed ? 'bg-green-500' : active ? 'bg-blue-500' : 'bg-gray-300'}
        `}
      />
      <span
        className={`
          text-sm
          ${completed ? 'text-green-700' : active ? 'text-blue-700' : 'text-gray-500'}
        `}
      >
        {label}
      </span>
      {completed && <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />}
    </div>
  );
}
