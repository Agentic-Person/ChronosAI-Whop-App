/**
 * YouTube utility functions
 * Helper functions for working with YouTube URLs and video IDs
 */

/**
 * Extract YouTube video ID from various URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - Direct video ID (11 characters)
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Check if URL is a YouTube video URL
 */
export function isYouTubeUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.includes('youtube.com') || url.includes('youtu.be');
}

/**
 * Build YouTube embed URL
 */
export function buildYouTubeEmbedUrl(
  videoId: string,
  options?: {
    autoplay?: boolean;
    rel?: number;
    modestbranding?: boolean;
    controls?: boolean;
    start?: number;
  }
): string {
  const params = new URLSearchParams();
  
  if (options?.autoplay !== undefined) {
    params.set('autoplay', options.autoplay ? '1' : '0');
  }
  
  if (options?.rel !== undefined) {
    params.set('rel', options.rel.toString());
  }
  
  if (options?.modestbranding !== undefined) {
    params.set('modestbranding', options.modestbranding ? '1' : '0');
  }
  
  if (options?.controls !== undefined) {
    params.set('controls', options.controls ? '1' : '0');
  }
  
  if (options?.start !== undefined) {
    params.set('start', Math.floor(options.start).toString());
  }

  const queryString = params.toString();
  return `https://www.youtube.com/embed/${videoId}${queryString ? `?${queryString}` : ''}`;
}

