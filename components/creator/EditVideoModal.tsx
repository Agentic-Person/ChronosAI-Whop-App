/**
 * Edit Video Modal
 * Uses Frosted UI for consistent styling and mobile responsiveness
 */

'use client';

import { useState, useEffect } from 'react';
import { FrostedModal } from '@/components/ui/FrostedModal';
import { FrostedButton } from '@/components/ui/FrostedButton';
import { Input } from '@/components/ui/Input';
import { CourseSelector } from './CourseSelector';
import toast from 'react-hot-toast';

interface EditVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    id: string;
    title: string;
    description?: string;
    course_id?: string;
    thumbnail_url?: string;
  };
  courses: Array<{
    id: string;
    title: string;
  }>;
  onVideoUpdated: () => void;
}

export function EditVideoModal({
  isOpen,
  onClose,
  video,
  courses,
  onVideoUpdated,
}: EditVideoModalProps) {
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description || '');
  const [selectedCourseId, setSelectedCourseId] = useState(video.course_id || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(video.thumbnail_url || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when video changes
  useEffect(() => {
    setTitle(video.title);
    setDescription(video.description || '');
    setSelectedCourseId(video.course_id || '');
    setThumbnailUrl(video.thumbnail_url || '');
  }, [video]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Video title is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/videos/${video.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          courseId: selectedCourseId || null,
          thumbnailUrl: thumbnailUrl.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update video');
      }

      toast.success('Video updated successfully!');
      onVideoUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating video:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update video');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <FrostedModal
      open={isOpen}
      onClose={handleClose}
      title="Edit Video"
      description="Update video details and organization"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="video-title" className="block text-sm font-medium text-white/90 mb-2">
            Video Title *
          </label>
          <Input
            id="video-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter video title"
            required
            disabled={isSubmitting}
            className="w-full backdrop-blur-md bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/30"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="video-description" className="block text-sm font-medium text-white/90 mb-2">
            Description
          </label>
          <textarea
            id="video-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter video description (optional)"
            disabled={isSubmitting}
            rows={4}
            className="w-full rounded-lg backdrop-blur-md bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/30 px-4 py-2 focus:outline-none transition-all"
          />
        </div>

        {/* Course Selection */}
        <div>
          <label htmlFor="video-course" className="block text-sm font-medium text-white/90 mb-2">
            Course
          </label>
          <CourseSelector
            courses={courses}
            selectedCourseId={selectedCourseId}
            onSelect={setSelectedCourseId}
            placeholder="Select a course (optional)"
            disabled={isSubmitting}
          />
        </div>

        {/* Thumbnail URL */}
        <div>
          <label htmlFor="video-thumbnail" className="block text-sm font-medium text-white/90 mb-2">
            Thumbnail URL
          </label>
          <Input
            id="video-thumbnail"
            type="url"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            placeholder="https://example.com/thumbnail.jpg (optional)"
            disabled={isSubmitting}
            className="w-full backdrop-blur-md bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/30"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-2 sm:justify-end pt-4 border-t border-white/10">
          <FrostedButton
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
            fullWidth
            className="sm:w-auto"
          >
            Cancel
          </FrostedButton>
          <FrostedButton
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
            fullWidth
            className="sm:w-auto"
          >
            {isSubmitting ? 'Updating...' : 'Update Video'}
          </FrostedButton>
        </div>
      </form>
    </FrostedModal>
  );
}
