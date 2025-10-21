/**
 * Infrastructure Middleware
 * Provides request ID, timing, error handling, and rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'crypto';
import { checkRateLimit } from '../rate-limiting/rate-limiter';
import { errorToAPIResponse, isInfrastructureError } from '../errors';
import { logAPIRequest, logError } from '../monitoring/logger';
import * as Sentry from '@sentry/nextjs';

/**
 * Middleware options
 */
export interface MiddlewareOptions {
  /** Enable rate limiting */
  rateLimit?: {
    enabled: boolean;
    endpoint: string;
  };
  /** Enable request logging */
  logging?: boolean;
  /** Enable error tracking */
  errorTracking?: boolean;
}

/**
 * Enhanced request with infrastructure context
 */
export interface InfrastructureRequest extends NextRequest {
  requestId: string;
  startTime: number;
  userId?: string;
}

/**
 * Wrap API route handler with infrastructure middleware
 */
export function withInfrastructure(
  handler: (req: InfrastructureRequest) => Promise<NextResponse>,
  options: MiddlewareOptions = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Generate request ID
    const requestId = uuidv4();
    const startTime = Date.now();

    // Enhance request object
    const infraReq = req as InfrastructureRequest;
    infraReq.requestId = requestId;
    infraReq.startTime = startTime;

    // Extract user ID from headers or auth
    const userId = req.headers.get('x-user-id') || undefined;
    if (userId) {
      infraReq.userId = userId;
    }

    try {
      // Rate limiting
      if (options.rateLimit?.enabled && options.rateLimit.endpoint) {
        const identifier =
          userId ||
          req.headers.get('x-forwarded-for') ||
          req.headers.get('x-real-ip') ||
          'unknown';

        const rateLimitResult = await checkRateLimit(
          identifier,
          options.rateLimit.endpoint as any
        );

        if (!rateLimitResult.allowed) {
          const response = NextResponse.json(
            {
              error: {
                message: 'Rate limit exceeded',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: rateLimitResult.retryAfter || rateLimitResult.reset,
              },
            },
            { status: 429 }
          );

          response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
          response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
          response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toISOString());
          response.headers.set('Retry-After', rateLimitResult.reset.toUTCString());

          return response;
        }

        // Add rate limit headers to successful responses too
        const response = await handler(infraReq);
        response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
        response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
        response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toISOString());

        return response;
      }

      // Execute handler
      const response = await handler(infraReq);

      // Add request ID to response headers
      response.headers.set('X-Request-ID', requestId);

      // Log request
      if (options.logging !== false) {
        const duration = Date.now() - startTime;
        logAPIRequest(
          req.method,
          new URL(req.url).pathname,
          response.status,
          duration,
          { requestId, userId }
        );
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log error
      logError('API error', error, {
        requestId,
        userId,
        operation: req.method + ' ' + new URL(req.url).pathname,
        duration,
      });

      // Track in Sentry
      if (options.errorTracking !== false) {
        Sentry.captureException(error, {
          tags: {
            requestId,
            userId,
            path: new URL(req.url).pathname,
          },
        });
      }

      // Convert to API response
      const errorResponse = errorToAPIResponse(error);
      const statusCode = isInfrastructureError(error)
        ? error.statusCode
        : 500;

      const response = NextResponse.json(errorResponse, { status: statusCode });
      response.headers.set('X-Request-ID', requestId);

      return response;
    }
  };
}

/**
 * Request ID middleware (lightweight, for all routes)
 */
export function withRequestId(
  handler: (req: InfrastructureRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const requestId = uuidv4();
    const infraReq = req as InfrastructureRequest;
    infraReq.requestId = requestId;
    infraReq.startTime = Date.now();

    const response = await handler(infraReq);
    response.headers.set('X-Request-ID', requestId);

    return response;
  };
}

/**
 * Error handling middleware
 */
export function withErrorHandling(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(req);
    } catch (error) {
      logError('Unhandled API error', error, {
        operation: req.method + ' ' + new URL(req.url).pathname,
      });

      Sentry.captureException(error);

      const errorResponse = errorToAPIResponse(error);
      const statusCode = isInfrastructureError(error)
        ? error.statusCode
        : 500;

      return NextResponse.json(errorResponse, { status: statusCode });
    }
  };
}
