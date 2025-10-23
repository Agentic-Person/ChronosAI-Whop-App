/**
 * Creator Selector Component
 * Dropdown to switch between creators (for students enrolled with multiple creators)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Building2, Check } from 'lucide-react';
import { cn } from '@/lib/utils/helpers';

interface Creator {
  id: string;
  company_name: string;
  handle: string | null;
  video_count?: number;
}

interface CreatorSelectorProps {
  selectedCreatorId: string;
  onCreatorChange: (creatorId: string) => void;
  className?: string;
}

export function CreatorSelector({
  selectedCreatorId,
  onCreatorChange,
  className,
}: CreatorSelectorProps) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load enrolled creators
  useEffect(() => {
    loadCreators();
  }, []);

  const loadCreators = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/student/enrollments');
      const data = await response.json();

      if (data.success && data.data?.creators) {
        setCreators(data.data.creators);

        // Auto-select first creator if none selected
        if (!selectedCreatorId && data.data.creators.length > 0) {
          onCreatorChange(data.data.creators[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load creators:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCreator = creators.find((c) => c.id === selectedCreatorId);

  // Don't show selector if only one creator
  if (creators.length <= 1) {
    return null;
  }

  return (
    <div className={cn('relative', className)}>
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        disabled={isLoading}
      >
        <Building2 className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">
          {selectedCreator?.company_name || 'Select Creator'}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-gray-500 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 top-full mt-2 z-20 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 max-h-96 overflow-y-auto">
            {creators.map((creator) => {
              const isSelected = creator.id === selectedCreatorId;

              return (
                <button
                  key={creator.id}
                  onClick={() => {
                    onCreatorChange(creator.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors',
                    isSelected
                      ? 'bg-blue-50 text-blue-900'
                      : 'hover:bg-gray-50 text-gray-700'
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn(
                      'h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0',
                      isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    )}>
                      <Building2 className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className={cn(
                        'text-sm font-medium truncate',
                        isSelected ? 'text-blue-900' : 'text-gray-900'
                      )}>
                        {creator.company_name}
                      </h4>
                      <p className={cn(
                        'text-xs truncate',
                        isSelected ? 'text-blue-700' : 'text-gray-500'
                      )}>
                        {creator.handle ? `@${creator.handle}` : 'No handle'}
                        {creator.video_count !== undefined && (
                          <> • {creator.video_count} videos</>
                        )}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Compact Creator Badge (alternative display)
 */
interface CreatorBadgeProps {
  creatorName: string;
  className?: string;
}

export function CreatorBadge({ creatorName, className }: CreatorBadgeProps) {
  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full', className)}>
      <Building2 className="h-3.5 w-3.5 text-gray-600" />
      <span className="text-xs font-medium text-gray-700">{creatorName}</span>
    </div>
  );
}
