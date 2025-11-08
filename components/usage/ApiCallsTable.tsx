'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import {
  Table,
  Search,
  Download,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCost } from '@/lib/usage/pricing-config';

interface ApiCall {
  id: string;
  created_at: string;
  provider: string;
  service: string;
  endpoint: string;
  cost_usd: number;
  status_code?: number;
  duration_ms?: number;
  error_message?: string;
}

interface ApiCallsTableProps {
  creatorId: string;
}

type SortField = 'created_at' | 'service' | 'cost_usd' | 'status_code';
type SortDirection = 'asc' | 'desc';

/**
 * API Calls Table
 *
 * Searchable, sortable table showing recent API calls with:
 * - Timestamp
 * - Service/Provider
 * - Endpoint/Feature
 * - Cost
 * - Status
 * - Export to CSV functionality
 * - Pagination (20 rows per page)
 */
export default function ApiCallsTable({ creatorId }: ApiCallsTableProps) {
  const [data, setData] = useState<ApiCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch recent API calls
        const response = await fetch(`/api/usage/export?creator_id=${creatorId}&limit=100`);

        if (!response.ok) {
          throw new Error('Failed to fetch API calls');
        }

        const result = await response.json();

        if (result.success && result.data?.details) {
          setData(result.data.details);
        } else {
          setError('No data available');
        }
      } catch (err) {
        console.error('Failed to fetch API calls data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [creatorId]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = data.filter(
        (call) =>
          call.service.toLowerCase().includes(query) ||
          call.provider.toLowerCase().includes(query) ||
          call.endpoint.toLowerCase().includes(query) ||
          call.error_message?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Handle null/undefined values
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Compare based on type
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return filtered;
  }, [data, searchQuery, sortField, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredAndSortedData.slice(startIndex, endIndex);
  }, [filteredAndSortedData, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedData.length / rowsPerPage);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Timestamp', 'Service', 'Provider', 'Endpoint', 'Cost', 'Status', 'Duration (ms)'];
    const rows = filteredAndSortedData.map((call) => [
      format(new Date(call.created_at), 'yyyy-MM-dd HH:mm:ss'),
      call.service,
      call.provider,
      call.endpoint,
      call.cost_usd.toFixed(4),
      call.status_code?.toString() || 'N/A',
      call.duration_ms?.toString() || 'N/A',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usage-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Get status icon
  const getStatusIcon = (statusCode?: number) => {
    if (!statusCode) return <Clock className="w-4 h-4 text-gray-400" />;
    if (statusCode >= 200 && statusCode < 300) {
      return <CheckCircle className="w-4 h-4 text-accent-green" />;
    }
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    );
  };

  if (loading) {
    return (
      <Card padding="lg" className="animate-pulse">
        <div className="h-8 w-48 bg-bg-hover rounded mb-4"></div>
        <div className="h-96 bg-bg-hover rounded"></div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card padding="lg" className="border-red-500/30 bg-red-500/5">
        <div className="flex items-center gap-2 text-red-500">
          <Table className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="border-accent-orange/30 bg-gradient-to-br from-accent-orange/5 to-accent-yellow/5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <Table className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-primary">Recent API Calls</h3>
            <p className="text-xs text-text-muted">
              {filteredAndSortedData.length} calls (last 100)
            </p>
          </div>
        </div>

        {/* Search and Export */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search calls..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
              className="w-full pl-10 pr-4 py-2 bg-bg-card border border-accent-orange/30 rounded-xl text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-orange/60 focus:ring-2 focus:ring-accent-orange/20 transition-all"
            />
          </div>

          <button
            onClick={exportToCSV}
            disabled={filteredAndSortedData.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-accent-orange/20 to-accent-yellow/20 border border-accent-orange/40 rounded-xl text-sm font-medium text-text-primary hover:from-accent-orange/30 hover:to-accent-yellow/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-6">
        <div className="inline-block min-w-full px-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-accent-orange/20">
                <th
                  className="text-left py-3 px-4 text-xs font-semibold text-text-muted cursor-pointer hover:text-text-primary transition-colors"
                  onClick={() => handleSort('created_at')}
                >
                  Timestamp {renderSortIcon('created_at')}
                </th>
                <th
                  className="text-left py-3 px-4 text-xs font-semibold text-text-muted cursor-pointer hover:text-text-primary transition-colors"
                  onClick={() => handleSort('service')}
                >
                  Service {renderSortIcon('service')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted">
                  Feature
                </th>
                <th
                  className="text-right py-3 px-4 text-xs font-semibold text-text-muted cursor-pointer hover:text-text-primary transition-colors"
                  onClick={() => handleSort('cost_usd')}
                >
                  Cost {renderSortIcon('cost_usd')}
                </th>
                <th
                  className="text-center py-3 px-4 text-xs font-semibold text-text-muted cursor-pointer hover:text-text-primary transition-colors"
                  onClick={() => handleSort('status_code')}
                >
                  Status {renderSortIcon('status_code')}
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-text-muted">
                    {searchQuery ? 'No matching calls found' : 'No API calls yet'}
                  </td>
                </tr>
              ) : (
                paginatedData.map((call) => (
                  <tr
                    key={call.id}
                    className="border-b border-accent-orange/10 hover:bg-accent-orange/5 transition-colors"
                  >
                    <td className="py-3 px-4 text-xs text-text-secondary">
                      {format(new Date(call.created_at), 'MMM dd, HH:mm:ss')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-text-primary capitalize">
                          {call.service}
                        </span>
                        <span className="text-xs text-text-muted capitalize">{call.provider}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-text-secondary max-w-xs truncate">
                      {call.endpoint.split('/').pop() || call.endpoint}
                    </td>
                    <td className="py-3 px-4 text-right text-xs font-semibold text-text-primary">
                      {formatCost(call.cost_usd)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {getStatusIcon(call.status_code)}
                        <span className="text-xs text-text-muted">
                          {call.status_code || '-'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-accent-orange/20">
          <p className="text-xs text-text-muted">
            Showing {(currentPage - 1) * rowsPerPage + 1} to{' '}
            {Math.min(currentPage * rowsPerPage, filteredAndSortedData.length)} of{' '}
            {filteredAndSortedData.length} calls
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-bg-card border border-accent-orange/30 rounded-lg text-xs font-medium text-text-primary hover:bg-accent-orange/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                      currentPage === pageNum
                        ? 'bg-gradient-to-br from-accent-orange/30 to-accent-yellow/30 border border-accent-orange/60 text-text-primary'
                        : 'bg-bg-card border border-accent-orange/20 text-text-secondary hover:bg-accent-orange/10'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-bg-card border border-accent-orange/30 rounded-lg text-xs font-medium text-text-primary hover:bg-accent-orange/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
