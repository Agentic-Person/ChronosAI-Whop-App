'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react';

// Force dynamic rendering - this page uses useSearchParams() which requires request context
export const dynamic = 'force-dynamic';

function MobileUploadContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sessionValid, setSessionValid] = useState(false);
  const [validating, setValidating] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [error, setError] = useState<string>('');

  // Validate session on load
  useEffect(() => {
    if (!token) {
      setError('No upload session token provided');
      setValidating(false);
      return;
    }

    fetch(`/api/upload/session/validate?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setSessionValid(true);
        } else {
          setError(data.error || 'Invalid or expired upload session');
        }
      })
      .catch(() => setError('Failed to validate session'))
      .finally(() => setValidating(false));
  }, [token]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check file sizes and show warnings
    for (const file of Array.from(files)) {
      const sizeMB = file.size / (1024 * 1024);

      // Hard limit: 500MB
      if (sizeMB > 500) {
        setError(
          `File "${file.name}" exceeds 500MB limit. Please select a smaller file.`
        );
        return;
      }

      // Soft warning: 100MB
      if (sizeMB > 100) {
        const proceed = confirm(
          `File "${file.name}" is ${sizeMB.toFixed(
            0
          )}MB. This may take a while to upload on mobile data. Continue?`
        );
        if (!proceed) {
          return;
        }
      }
    }

    setUploading(true);
    setError('');
    setUploadProgress(0);

    const totalFiles = files.length;
    let completed = 0;

    // Upload each file using 3-step flow
    for (const file of Array.from(files)) {
      try {
        setUploadProgress(Math.round((completed / totalFiles) * 100));

        // Step 1: Get upload URL
        const urlResponse = await fetch('/api/video/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            fileSize: file.size,
            sessionToken: token, // Pass session for auth
          }),
        });

        if (!urlResponse.ok) {
          const errorData = await urlResponse.json();
          throw new Error(errorData.message || 'Failed to get upload URL');
        }

        const { uploadUrl, videoId } = await urlResponse.json();

        // Step 2: Upload to Supabase Storage
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file to storage');
        }

        // Step 3: Confirm upload
        const confirmResponse = await fetch('/api/video/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId,
            sessionToken: token,
          }),
        });

        if (!confirmResponse.ok) {
          throw new Error('Failed to confirm upload');
        }

        completed++;
        setUploadedCount(completed);
        setUploadProgress(Math.round((completed / totalFiles) * 100));
      } catch (err) {
        console.error('Upload error:', err);
        setError(
          err instanceof Error ? err.message : `Failed to upload ${file.name}`
        );
        setUploading(false);
        return;
      }
    }

    setUploading(false);
    setUploadProgress(100);
  };

  // Loading state
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-bg-app">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4 text-accent-cyan" />
          <p className="text-text-muted">Validating session...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-bg-app">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Upload Error</h1>
          <p className="text-text-muted mb-4">{error}</p>
          {!validating && (
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
              className="mt-4"
            >
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Main upload interface
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-app">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Upload className="w-16 h-16 mx-auto mb-4 text-accent-orange" />
          <h1 className="text-2xl font-bold mb-2">Upload Videos</h1>
          <p className="text-text-muted mb-2">
            Select videos from your device to upload
          </p>
          <p className="text-sm text-accent-yellow">
            <strong>Recommended:</strong> Under 100MB per video for faster mobile
            uploads
          </p>
        </div>

        {/* Success message */}
        {uploadedCount > 0 && !uploading && (
          <div className="mb-4 p-4 bg-green-500/10 border border-green-500 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span className="text-green-500 font-medium">
              {uploadedCount} video{uploadedCount > 1 ? 's' : ''} uploaded
              successfully!
            </span>
          </div>
        )}

        {/* Progress bar */}
        {uploading && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-text-muted">Uploading...</span>
              <span className="text-accent-cyan font-medium">{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-bg-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-cyan transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* File input (hidden) */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/mp4,video/quicktime,video/mpeg,video/webm"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Upload button */}
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full h-16 text-lg mb-4"
        >
          {uploading ? (
            <>
              <Loader className="w-5 h-5 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 mr-2" />
              Choose Videos
            </>
          )}
        </Button>

        {/* File format info */}
        <div className="text-center">
          <p className="text-xs text-text-muted mb-1">
            Accepts: MP4, MOV, MPEG, WEBM
          </p>
          <p className="text-xs text-text-muted">Max size: 500MB per file</p>
        </div>
      </div>
    </div>
  );
}

export default function MobileUploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-bg-app">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4 text-accent-cyan" />
          <p className="text-text-muted">Loading...</p>
        </div>
      </div>
    }>
      <MobileUploadContent />
    </Suspense>
  );
}
