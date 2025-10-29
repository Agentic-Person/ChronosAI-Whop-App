'use client';

import React from 'react';
import { ChevronDown, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Course {
  id: string;
  title: string;
  video_count?: number;
}

interface CourseSelectorProps {
  courses: Course[];
  selectedCourseId?: string;
  onChange: (courseId: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CourseSelector({
  courses,
  selectedCourseId,
  onChange,
  placeholder = "Select a course",
  className,
  disabled = false
}: CourseSelectorProps) {
  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  return (
    <div className={cn("relative", className)}>
      <label className="block text-sm font-medium mb-2">
        Course <span className="text-accent-red">*</span>
      </label>

      <div className="relative">
        <select
          value={selectedCourseId || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || courses.length === 0}
          className={cn(
            "w-full px-4 py-3 pr-10 bg-bg-elevated border border-border-default rounded-lg",
            "text-text-primary appearance-none cursor-pointer",
            "focus:border-accent-orange focus:outline-none transition-colors",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !selectedCourseId && "text-text-muted"
          )}
        >
          <option value="" disabled>
            {courses.length === 0 ? 'No courses available' : placeholder}
          </option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
              {course.video_count !== undefined && ` (${course.video_count} videos)`}
            </option>
          ))}
        </select>

        {/* Custom dropdown icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronDown className="w-5 h-5 text-text-muted" />
        </div>
      </div>

      {/* Helper text */}
      {courses.length === 0 && (
        <p className="mt-2 text-sm text-accent-yellow flex items-center gap-1">
          <FolderOpen className="w-4 h-4" />
          Please create a course first before uploading videos
        </p>
      )}
    </div>
  );
}