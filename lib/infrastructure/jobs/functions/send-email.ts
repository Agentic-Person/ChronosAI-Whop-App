/**
 * Email Sending Job
 * Handles email notifications via Resend
 */

import { inngest } from '../inngest-client';
import { logJobEvent } from '@/lib/infrastructure/monitoring/logger';

/**
 * Email sending job function
 */
export const sendEmail = inngest.createFunction(
  {
    id: 'send-email',
    name: 'Send Email',
    retries: 3,
  },
  { event: 'email/send' },
  async ({ event, step, logger }) => {
    const { to, template, variables } = event.data;

    logJobEvent('send-email', 'started', undefined, { to, template });

    await step.run('send-email', async () => {
      // TODO: Implement actual email sending via Resend
      logger.info('Email would be sent', { to, template, variables });

      // For now, just log
      console.log('Sending email:', { to, template, variables });

      return { sent: true };
    });

    logJobEvent('send-email', 'completed', undefined, { to, template });

    return { success: true, to, template };
  }
);
