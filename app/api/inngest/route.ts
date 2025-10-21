/**
 * Inngest API Endpoint
 * Handles job queue webhooks
 */

import { serve } from 'inngest/next';
import { inngest } from '@/lib/infrastructure/jobs/inngest-client';

// Import job functions
import { sendEmail } from '@/lib/infrastructure/jobs/functions/send-email';

// Register all job functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    sendEmail,
    // Add more functions as they're created
  ],
  streaming: 'allow',
});
