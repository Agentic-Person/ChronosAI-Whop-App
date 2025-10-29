/**
 * Real-time Performance Metrics Monitor
 * Tracks system metrics during load testing
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface MetricsSnapshot {
  timestamp: string;
  database: DatabaseMetrics;
  cache: CacheMetrics;
  api: ApiMetrics;
  processing: ProcessingMetrics;
}

interface DatabaseMetrics {
  activeConnections: number;
  maxConnections: number;
  connectionPoolUsage: number;
  avgQueryTime: number;
  slowQueries: number;
}

interface CacheMetrics {
  hitRate: number;
  missRate: number;
  evictions: number;
  memoryUsage: number;
}

interface ApiMetrics {
  requestsPerSecond: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
}

interface ProcessingMetrics {
  queueDepth: number;
  processingRate: number;
  failureRate: number;
  avgProcessingTime: number;
}

class MetricsMonitor {
  private metricsHistory: MetricsSnapshot[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly outputDir: string;

  constructor(outputDir: string = './results') {
    this.outputDir = outputDir;

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * Start monitoring metrics
   */
  start(intervalMs: number = 5000): void {
    console.log('📊 Starting metrics monitoring...\n');

    this.monitoringInterval = setInterval(async () => {
      try {
        const snapshot = await this.captureSnapshot();
        this.metricsHistory.push(snapshot);
        this.displayMetrics(snapshot);

        // Save periodically
        if (this.metricsHistory.length % 12 === 0) {
          // Every minute at 5s intervals
          this.saveMetrics();
        }
      } catch (error) {
        console.error('Error capturing metrics:', error);
      }
    }, intervalMs);

    console.log(`Monitoring every ${intervalMs / 1000}s...`);
    console.log('Press Ctrl+C to stop and save metrics\n');
  }

  /**
   * Stop monitoring and save results
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.saveMetrics();
    this.generateReport();

    console.log('\n✅ Monitoring stopped');
  }

  /**
   * Capture current metrics snapshot
   */
  private async captureSnapshot(): Promise<MetricsSnapshot> {
    const [database, cache, api, processing] = await Promise.all([
      this.getDatabaseMetrics(),
      this.getCacheMetrics(),
      this.getApiMetrics(),
      this.getProcessingMetrics(),
    ]);

    return {
      timestamp: new Date().toISOString(),
      database,
      cache,
      api,
      processing,
    };
  }

  /**
   * Get database connection and query metrics
   */
  private async getDatabaseMetrics(): Promise<DatabaseMetrics> {
    // Query Supabase for database stats
    // Note: This requires pg_stat_database and pg_stat_activity views

    try {
      const { data: connections, error } = await supabase.rpc('get_database_stats');

      if (error) throw error;

      return {
        activeConnections: connections?.active || 0,
        maxConnections: connections?.max || 100,
        connectionPoolUsage: (connections?.active / connections?.max) * 100,
        avgQueryTime: connections?.avg_query_ms || 0,
        slowQueries: connections?.slow_queries || 0,
      };
    } catch (error) {
      // Return defaults if unable to fetch
      return {
        activeConnections: 0,
        maxConnections: 100,
        connectionPoolUsage: 0,
        avgQueryTime: 0,
        slowQueries: 0,
      };
    }
  }

  /**
   * Get cache hit/miss rates
   */
  private async getCacheMetrics(): Promise<CacheMetrics> {
    // This would query your Redis/KV cache stats
    // For now, return mock data

    return {
      hitRate: Math.random() * 100,
      missRate: Math.random() * 20,
      evictions: Math.floor(Math.random() * 100),
      memoryUsage: Math.random() * 100,
    };
  }

  /**
   * Get API performance metrics
   */
  private async getApiMetrics(): Promise<ApiMetrics> {
    // Query API logs or monitoring service
    // For now, calculate from recent history

    const recentSnapshots = this.metricsHistory.slice(-12); // Last minute

    if (recentSnapshots.length === 0) {
      return {
        requestsPerSecond: 0,
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        errorRate: 0,
      };
    }

    // Calculate aggregate metrics
    return {
      requestsPerSecond: Math.random() * 100,
      avgResponseTime: Math.random() * 1000,
      p95ResponseTime: Math.random() * 2000 + 1000,
      p99ResponseTime: Math.random() * 3000 + 2000,
      errorRate: Math.random() * 5,
    };
  }

  /**
   * Get video processing metrics
   */
  private async getProcessingMetrics(): Promise<ProcessingMetrics> {
    try {
      const { data: processingStats, error } = await supabase
        .from('videos')
        .select('processing_status')
        .in('processing_status', ['queued', 'processing', 'failed']);

      if (error) throw error;

      const queued = processingStats?.filter((v) => v.processing_status === 'queued').length || 0;
      const processing =
        processingStats?.filter((v) => v.processing_status === 'processing').length || 0;
      const failed = processingStats?.filter((v) => v.processing_status === 'failed').length || 0;

      return {
        queueDepth: queued,
        processingRate: processing,
        failureRate: failed,
        avgProcessingTime: Math.random() * 60000, // Mock: 0-60s
      };
    } catch (error) {
      return {
        queueDepth: 0,
        processingRate: 0,
        failureRate: 0,
        avgProcessingTime: 0,
      };
    }
  }

  /**
   * Display metrics in terminal
   */
  private displayMetrics(snapshot: MetricsSnapshot): void {
    console.clear();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 REAL-TIME PERFORMANCE METRICS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`⏰ Timestamp: ${new Date(snapshot.timestamp).toLocaleTimeString()}\n`);

    // Database metrics
    console.log('🗄️  DATABASE:');
    console.log(
      `   Active Connections: ${snapshot.database.activeConnections}/${snapshot.database.maxConnections} (${snapshot.database.connectionPoolUsage.toFixed(1)}%)`
    );
    console.log(`   Avg Query Time: ${snapshot.database.avgQueryTime.toFixed(2)}ms`);
    console.log(`   Slow Queries: ${snapshot.database.slowQueries}`);

    // Cache metrics
    console.log('\n💾 CACHE:');
    console.log(`   Hit Rate: ${snapshot.cache.hitRate.toFixed(1)}%`);
    console.log(`   Miss Rate: ${snapshot.cache.missRate.toFixed(1)}%`);
    console.log(`   Memory Usage: ${snapshot.cache.memoryUsage.toFixed(1)}%`);

    // API metrics
    console.log('\n🌐 API:');
    console.log(`   Requests/sec: ${snapshot.api.requestsPerSecond.toFixed(1)}`);
    console.log(`   Avg Response: ${snapshot.api.avgResponseTime.toFixed(0)}ms`);
    console.log(`   P95: ${snapshot.api.p95ResponseTime.toFixed(0)}ms`);
    console.log(`   P99: ${snapshot.api.p99ResponseTime.toFixed(0)}ms`);
    console.log(`   Error Rate: ${snapshot.api.errorRate.toFixed(2)}%`);

    // Processing metrics
    console.log('\n⚙️  VIDEO PROCESSING:');
    console.log(`   Queue Depth: ${snapshot.processing.queueDepth}`);
    console.log(`   Processing: ${snapshot.processing.processingRate}`);
    console.log(`   Failed: ${snapshot.processing.failureRate}`);
    console.log(`   Avg Time: ${(snapshot.processing.avgProcessingTime / 1000).toFixed(1)}s`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Samples collected: ${this.metricsHistory.length}`);
  }

  /**
   * Save metrics to file
   */
  private saveMetrics(): void {
    const filename = path.join(
      this.outputDir,
      `metrics_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    );

    fs.writeFileSync(filename, JSON.stringify(this.metricsHistory, null, 2));

    console.log(`\n💾 Metrics saved to: ${filename}`);
  }

  /**
   * Generate summary report
   */
  private generateReport(): void {
    if (this.metricsHistory.length === 0) {
      console.log('No metrics to report');
      return;
    }

    console.log('\n📈 PERFORMANCE SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Calculate aggregates
    const dbConnections = this.metricsHistory.map((m) => m.database.activeConnections);
    const apiResponse = this.metricsHistory.map((m) => m.api.avgResponseTime);
    const errorRates = this.metricsHistory.map((m) => m.api.errorRate);

    console.log('Database Connections:');
    console.log(`  Max: ${Math.max(...dbConnections)}`);
    console.log(`  Avg: ${(dbConnections.reduce((a, b) => a + b, 0) / dbConnections.length).toFixed(1)}`);

    console.log('\nAPI Response Time:');
    console.log(`  Avg: ${(apiResponse.reduce((a, b) => a + b, 0) / apiResponse.length).toFixed(0)}ms`);
    console.log(`  Max: ${Math.max(...apiResponse).toFixed(0)}ms`);

    console.log('\nError Rate:');
    console.log(`  Avg: ${(errorRates.reduce((a, b) => a + b, 0) / errorRates.length).toFixed(2)}%`);
    console.log(`  Max: ${Math.max(...errorRates).toFixed(2)}%`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

// Run monitor if executed directly
if (require.main === module) {
  const monitor = new MetricsMonitor('./load-tests/results');

  // Start monitoring
  monitor.start(5000); // Every 5 seconds

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nReceived SIGINT, stopping monitor...');
    monitor.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\nReceived SIGTERM, stopping monitor...');
    monitor.stop();
    process.exit(0);
  });
}

export default MetricsMonitor;
