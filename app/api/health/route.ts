/**
 * Health Check Endpoint
 * Monitors status of all infrastructure services
 */

import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/infrastructure/database/connection-pool';
import { cache } from '@/lib/infrastructure/cache/redis-client';

export const dynamic = 'force-dynamic';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: {
      status: 'ok' | 'error';
      latency?: number;
      error?: string;
    };
    cache: {
      status: 'ok' | 'error';
      latency?: number;
      error?: string;
    };
  };
}

export async function GET() {
  const result: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: 'error' },
      cache: { status: 'error' },
    },
  };

  // Check database
  const dbHealth = await checkDatabaseHealth();
  result.checks.database = {
    status: dbHealth.healthy ? 'ok' : 'error',
    latency: dbHealth.latency,
    error: dbHealth.error,
  };

  // Check cache
  const cacheHealth = await cache.healthCheck();
  result.checks.cache = {
    status: cacheHealth.healthy ? 'ok' : 'error',
    latency: cacheHealth.latency,
  };

  // Determine overall status
  const allHealthy =
    result.checks.database.status === 'ok' &&
    result.checks.cache.status === 'ok';

  const someHealthy =
    result.checks.database.status === 'ok' ||
    result.checks.cache.status === 'ok';

  result.status = allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy';

  const statusCode = allHealthy ? 200 : result.status === 'degraded' ? 200 : 503;

  return NextResponse.json(result, { status: statusCode });
}
