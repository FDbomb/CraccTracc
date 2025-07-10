import { NextRequest, NextResponse } from 'next/server';

interface PerformanceMetric {
  id: string;
  timestamp: number;
  userId?: string;
  sessionId: string;
  type: 'upload' | 'processing' | 'analysis' | 'export' | 'render' | 'error';
  duration?: number; // milliseconds
  fileSize?: number; // bytes
  trackPointCount?: number;
  success: boolean;
  error?: string;
  browserInfo?: {
    userAgent: string;
    language: string;
    platform: string;
  };
  memoryUsage?: {
    used: number;
    total: number;
  };
}

interface SystemHealth {
  timestamp: number;
  cpuUsage?: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  activeConnections: number;
  uptime: number;
  version: string;
}

// In-memory storage for metrics (in production, use database/monitoring service)
const performanceMetrics: PerformanceMetric[] = [];
const MAX_METRICS = 10000; // Keep last 10k metrics

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle different types of monitoring requests
    switch (body.action) {
      case 'track_performance':
        return trackPerformance(body.data as PerformanceMetric);
      case 'get_health':
        return getSystemHealth();
      case 'get_analytics':
        return getAnalytics(body.timeRange);
      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Monitoring error:', error);
    return NextResponse.json(
      { error: 'Monitoring request failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  switch (type) {
    case 'health':
      return getSystemHealth();
    case 'analytics':
      const timeRange = searchParams.get('timeRange') || '24h';
      return getAnalytics(timeRange);
    case 'metrics':
      return getRecentMetrics();
    default:
      return NextResponse.json({
        message: 'Application monitoring endpoint',
        endpoints: {
          'GET ?type=health': 'System health check',
          'GET ?type=analytics&timeRange=24h': 'Usage analytics',
          'GET ?type=metrics': 'Recent performance metrics',
          'POST action=track_performance': 'Log performance metric',
        }
      });
  }
}

async function trackPerformance(metric: PerformanceMetric): Promise<NextResponse> {
  // Add timestamp if not provided
  if (!metric.timestamp) {
    metric.timestamp = Date.now();
  }

  // Generate ID if not provided
  if (!metric.id) {
    metric.id = `${metric.type}_${metric.timestamp}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Store metric
  performanceMetrics.push(metric);

  // Keep only recent metrics to prevent memory bloat
  if (performanceMetrics.length > MAX_METRICS) {
    performanceMetrics.splice(0, performanceMetrics.length - MAX_METRICS);
  }

  // Log important events
  if (!metric.success || metric.error) {
    console.warn('Performance issue:', {
      type: metric.type,
      duration: metric.duration,
      error: metric.error,
      timestamp: new Date(metric.timestamp).toISOString()
    });
  }

  return NextResponse.json({
    success: true,
    metricId: metric.id
  });
}

async function getSystemHealth(): Promise<NextResponse> {
  const process = globalThis.process;
  
  const health: SystemHealth = {
    timestamp: Date.now(),
    memoryUsage: process.memoryUsage(),
    activeConnections: performanceMetrics.filter(m => 
      Date.now() - m.timestamp < 60000 // Active in last minute
    ).length,
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  };

  // Calculate CPU usage (simplified)
  const recentMetrics = performanceMetrics.filter(m => 
    Date.now() - m.timestamp < 300000 // Last 5 minutes
  );
  
  const avgDuration = recentMetrics.length > 0 
    ? recentMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / recentMetrics.length
    : 0;

  // Simple CPU usage estimation based on processing duration
  health.cpuUsage = Math.min(100, avgDuration / 100); // Very rough estimate

  return NextResponse.json(health);
}

async function getAnalytics(timeRange: string): Promise<NextResponse> {
  const timeRangeMs = parseTimeRange(timeRange);
  const cutoff = Date.now() - timeRangeMs;
  
  const recentMetrics = performanceMetrics.filter(m => m.timestamp >= cutoff);

  const analytics = {
    timeRange,
    period: {
      start: cutoff,
      end: Date.now(),
      duration: timeRangeMs
    },
    counts: {
      total: recentMetrics.length,
      uploads: recentMetrics.filter(m => m.type === 'upload').length,
      processing: recentMetrics.filter(m => m.type === 'processing').length,
      exports: recentMetrics.filter(m => m.type === 'export').length,
      errors: recentMetrics.filter(m => !m.success).length
    },
    performance: {
      avgUploadTime: calculateAverage(recentMetrics, 'upload', 'duration'),
      avgProcessingTime: calculateAverage(recentMetrics, 'processing', 'duration'),
      avgExportTime: calculateAverage(recentMetrics, 'export', 'duration'),
      successRate: recentMetrics.length > 0 
        ? (recentMetrics.filter(m => m.success).length / recentMetrics.length) * 100
        : 100
    },
    fileStats: {
      avgFileSize: calculateAverage(recentMetrics, undefined, 'fileSize'),
      avgTrackPoints: calculateAverage(recentMetrics, undefined, 'trackPointCount'),
      totalDataProcessed: recentMetrics.reduce((sum, m) => sum + (m.fileSize || 0), 0)
    },
    users: {
      uniqueSessions: new Set(recentMetrics.map(m => m.sessionId)).size,
      uniqueUsers: new Set(recentMetrics.map(m => m.userId).filter(Boolean)).size
    },
    errors: recentMetrics
      .filter(m => !m.success)
      .reduce((acc, m) => {
        const error = m.error || 'Unknown error';
        acc[error] = (acc[error] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
  };

  return NextResponse.json(analytics);
}

async function getRecentMetrics(): Promise<NextResponse> {
  const recent = performanceMetrics
    .slice(-100) // Last 100 metrics
    .map(metric => ({
      id: metric.id,
      timestamp: metric.timestamp,
      type: metric.type,
      duration: metric.duration,
      success: metric.success,
      error: metric.error
    }));

  return NextResponse.json({
    metrics: recent,
    total: performanceMetrics.length
  });
}

function parseTimeRange(timeRange: string): number {
  const multipliers: Record<string, number> = {
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000,
    'w': 7 * 24 * 60 * 60 * 1000
  };

  const match = timeRange.match(/^(\d+)([mhdw])$/);
  if (!match) {
    return 24 * 60 * 60 * 1000; // Default to 24 hours
  }

  const [, amount, unit] = match;
  return parseInt(amount) * multipliers[unit];
}

function calculateAverage(
  metrics: PerformanceMetric[], 
  type?: string, 
  field?: keyof PerformanceMetric
): number {
  const filtered = type ? metrics.filter(m => m.type === type) : metrics;
  
  if (!field || filtered.length === 0) return 0;
  
  const values = filtered
    .map(m => m[field] as number)
    .filter(v => typeof v === 'number' && v > 0);
    
  return values.length > 0 
    ? values.reduce((sum, v) => sum + v, 0) / values.length 
    : 0;
}

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  const initialLength = performanceMetrics.length;
  
  // Remove metrics older than 1 hour if we have too many
  if (performanceMetrics.length > MAX_METRICS * 0.8) {
    const filtered = performanceMetrics.filter(m => m.timestamp > oneHourAgo);
    performanceMetrics.splice(0, performanceMetrics.length, ...filtered);
    
    const removed = initialLength - performanceMetrics.length;
    if (removed > 0) {
      console.log(`Cleaned up ${removed} old performance metrics`);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes