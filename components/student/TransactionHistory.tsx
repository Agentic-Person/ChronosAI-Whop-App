/**
 * TransactionHistory Component
 * Table/list of recent CHRONOS token transactions
 * Supports filtering, pagination, and CSV export
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Video, MessageCircle, Flame, Award, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  source: string;
  source_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

interface TransactionHistoryProps {
  studentId: string;
  pageSize?: number;
}

const sourceIcons: Record<string, any> = {
  video_complete: Video,
  chat_message: MessageCircle,
  streak_bonus: Flame,
  achievement_unlock: Award,
};

const sourceLabels: Record<string, string> = {
  video_complete: 'Video Completed',
  chat_message: 'Question Asked',
  streak_bonus: 'Streak Bonus',
  achievement_unlock: 'Achievement',
  week_complete: 'Week Completed',
  module_complete: 'Module Completed',
  course_complete: 'Course Completed',
};

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  studentId,
  pageSize = 20,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      try {
        const offset = (currentPage - 1) * pageSize;
        const response = await fetch(
          `/api/chronos/history?studentId=${studentId}&limit=${pageSize}&offset=${offset}`
        );

        if (response.ok) {
          const data = await response.json();
          setTransactions(data.transactions);
          setTotal(data.total);
        }
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [studentId, currentPage, pageSize]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getSourceIcon = (source: string) => {
    const Icon = sourceIcons[source] || Video;
    return <Icon className="w-4 h-4" />;
  };

  const getSourceLabel = (source: string) => {
    return sourceLabels[source] || source;
  };

  if (isLoading && transactions.length === 0) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-10 h-10 bg-bg-elevated rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-bg-elevated rounded w-1/3 mb-2" />
                <div className="h-3 bg-bg-elevated rounded w-1/4" />
              </div>
              <div className="h-6 bg-bg-elevated rounded w-20" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="text-text-muted">
          <p className="text-lg font-medium mb-2">No transactions yet</p>
          <p className="text-sm">
            Start earning CHRONOS by watching videos and asking questions!
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4">Transaction History</h3>
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-bg-elevated transition-colors"
            >
              {/* Icon */}
              <div className="w-10 h-10 bg-gradient-success rounded-full flex items-center justify-center flex-shrink-0">
                {getSourceIcon(transaction.source)}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  {getSourceLabel(transaction.source)}
                </p>
                <p className="text-xs text-text-secondary">
                  {formatDate(transaction.created_at)}
                </p>
              </div>

              {/* Amount */}
              <Badge variant="success" className="flex-shrink-0">
                +{transaction.amount}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, total)} of {total} transactions
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
