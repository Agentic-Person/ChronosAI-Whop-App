'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface AddCourseModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (course: any) => void;
  creatorId?: string;
}

export function AddCourseModal({ open, onClose, onSuccess, creatorId }: AddCourseModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Course title is required');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          creatorId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create course');
      }

      const course = await response.json();
      toast.success('Course created successfully!');
      onSuccess(course);
      handleClose();
    } catch (error) {
      console.error('Error creating course:', error);
      toast.error('Failed to create course');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create New Course"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-2">
            Course Title <span className="text-accent-red">*</span>
          </label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Introduction to Web Development"
            autoFocus
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of what students will learn..."
            className="w-full px-3 py-2 bg-bg-elevated border border-border-default rounded-lg focus:border-accent-orange focus:outline-none resize-none text-text-primary"
            rows={3}
            disabled={isLoading}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !title.trim()}
            className="flex-1"
          >
            {isLoading ? 'Creating...' : 'Create Course'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}