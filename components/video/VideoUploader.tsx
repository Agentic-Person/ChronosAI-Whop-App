'use client';

/**
 * Video Uploader Component
 *
 * Drag-and-drop video upload interface with:
 * - File validation
 * - Upload progress tracking
 * - Plan limit checking
 * - Multiple file support
 */

import React, { useState, useCallback } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Film } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { VIDEO_PROCESSING_CONSTANTS } from '@/lib/video/types';

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  videoId?: string;
}

interface VideoUploaderProps {
  onUploadComplete?: (videoId: string) => void;
  maxFiles?: number;
}

export function VideoUploader({ onUploadComplete, maxFiles = 5 }: VideoUploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Handle file selection
  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newFiles: UploadFile[] = Array.from(selectedFiles).map((file) => ({
      file,
      id: `${Date.now()}-${Math.random()}`,
      progress: 0,
      status: 'pending',
    }));

    // Validate files
    const validatedFiles = newFiles.filter((uploadFile) => {
      const { file } = uploadFile;

      // Check file size
      if (file.size > VIDEO_PROCESSING_CONSTANTS.MAX_FILE_SIZE) {
        toast.error(`${file.name}: File too large (max 4GB)`);
        return false;
      }

      // Check file type
      if (!VIDEO_PROCESSING_CONSTANTS.ALLOWED_MIME_TYPES.includes(file.type)) {
        toast.error(`${file.name}: Invalid file type`);
        return false;
      }

      return true;
    });

    if (validatedFiles.length === 0) return;

    // Check max files limit
    if (files.length + validatedFiles.length > maxFiles) {
      toast.error(`Cannot upload more than ${maxFiles} files at once`);
      return;
    }

    setFiles((prev) => [...prev, ...validatedFiles]);

    // Start uploading
    validatedFiles.forEach((uploadFile) => {
      uploadVideo(uploadFile);
    });
  }, [files.length, maxFiles]);

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // Upload video
  const uploadVideo = async (uploadFile: UploadFile) => {
    const { file, id } = uploadFile;

    try {
      // Update status
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'uploading' as const } : f))
      );

      // Step 1: Get upload URL
      const urlResponse = await fetch('/api/video/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-creator-id': 'temp-creator-id', // TODO: Get from auth
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      if (!urlResponse.ok) {
        const error = await urlResponse.json();
        throw new Error(error.message || 'Failed to get upload URL');
      }

      const { uploadUrl, videoId, s3Key } = await urlResponse.json();

      // Step 2: Upload to S3
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, progress } : f))
          );
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status === 200) {
          // Step 3: Create video record
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id ? { ...f, status: 'processing' as const, progress: 100 } : f
            )
          );

          const createResponse = await fetch('/api/video/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-creator-id': 'temp-creator-id', // TODO: Get from auth
            },
            body: JSON.stringify({
              title: file.name.replace(/\.[^.]+$/, ''),
              s3Key,
              fileSize: file.size,
              mimeType: file.type,
            }),
          });

          if (!createResponse.ok) {
            throw new Error('Failed to create video record');
          }

          // Mark as completed
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id ? { ...f, status: 'completed' as const, videoId } : f
            )
          );

          toast.success(`${file.name} uploaded successfully!`);
          onUploadComplete?.(videoId);
        } else {
          throw new Error('Upload failed');
        }
      });

      xhr.addEventListener('error', () => {
        throw new Error('Network error during upload');
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    } catch (error: any) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, status: 'error' as const, error: error.message } : f
        )
      );
      toast.error(`${file.name}: ${error.message}`);
    }
  };

  // Remove file
  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      {/* Drop Zone */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        `}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Upload Videos</h3>
        <p className="text-sm text-gray-600 mb-4">
          Drag and drop video files here, or click to browse
        </p>
        <input
          type="file"
          multiple
          accept={VIDEO_PROCESSING_CONSTANTS.ALLOWED_MIME_TYPES.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          id="video-upload-input"
        />
        <label
          htmlFor="video-upload-input"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 transition-colors"
        >
          Select Files
        </label>
        <p className="text-xs text-gray-500 mt-4">
          Supported formats: MP4, MOV, AVI, MKV, WEBM • Max 4GB per file
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="font-semibold text-gray-900">Uploads ({files.length})</h4>
          {files.map((uploadFile) => (
            <div
              key={uploadFile.id}
              className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg"
            >
              <Film className="h-10 w-10 text-gray-400 flex-shrink-0" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {uploadFile.file.name}
                  </p>
                  <span className="text-xs text-gray-500 ml-2">
                    {formatFileSize(uploadFile.file.size)}
                  </span>
                </div>

                {/* Progress Bar */}
                {uploadFile.status === 'uploading' && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadFile.progress}%` }}
                    />
                  </div>
                )}

                {/* Status */}
                <p className="text-xs text-gray-600">
                  {uploadFile.status === 'pending' && 'Waiting to upload...'}
                  {uploadFile.status === 'uploading' && `Uploading... ${uploadFile.progress}%`}
                  {uploadFile.status === 'processing' && 'Processing video...'}
                  {uploadFile.status === 'completed' && 'Upload complete'}
                  {uploadFile.status === 'error' && (
                    <span className="text-red-600">{uploadFile.error}</span>
                  )}
                </p>
              </div>

              {/* Status Icon */}
              <div className="flex-shrink-0">
                {uploadFile.status === 'completed' && (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                )}
                {uploadFile.status === 'error' && (
                  <AlertCircle className="h-6 w-6 text-red-500" />
                )}
                {uploadFile.status !== 'completed' && uploadFile.status !== 'error' && (
                  <button
                    onClick={() => removeFile(uploadFile.id)}
                    className="p-1 hover:bg-gray-100 rounded-full"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
