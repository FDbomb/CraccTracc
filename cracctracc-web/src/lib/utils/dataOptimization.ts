import { ProcessedTrackPoint, ManoeuvreEvent } from '../types/sailing';

export interface OptimizationSettings {
  maxDataPoints: number;
  smoothingWindow: number;
  speedThreshold: {
    min: number;
    max: number;
  };
  outlierRemoval: {
    enabled: boolean;
    threshold: number; // standard deviations
  };
  decimation: {
    enabled: boolean;
    factor: number;
    significantChange: {
      speedThreshold: number; // knots - significant speed change to preserve point
      headingThreshold: number; // degrees - significant heading change to preserve point
    };
  };
}

export interface OptimizedData {
  trackPoints: ProcessedTrackPoint[];
  manoeuvres: ManoeuvreEvent[];
  metadata: {
    originalCount: number;
    optimizedCount: number;
    compressionRatio: number;
    processingTime: number;
  };
}

export class DataOptimizer {
  private settings: OptimizationSettings;

  constructor(settings: OptimizationSettings) {
    this.settings = settings;
  }

  public optimizeData(
    trackPoints: ProcessedTrackPoint[], 
    manoeuvres: ManoeuvreEvent[]
  ): OptimizedData {
    const startTime = performance.now();
    const originalCount = trackPoints.length;

    let optimizedPoints = [...trackPoints];

    // 1. Filter by speed thresholds
    optimizedPoints = this.filterBySpeed(optimizedPoints);

    // 2. Remove outliers if enabled
    if (this.settings.outlierRemoval.enabled) {
      optimizedPoints = this.removeOutliers(optimizedPoints);
    }

    // 3. Apply smoothing
    if (this.settings.smoothingWindow > 1) {
      optimizedPoints = this.smoothData(optimizedPoints);
    }

    // 4. Decimate data if needed
    if (this.settings.decimation.enabled && optimizedPoints.length > this.settings.maxDataPoints) {
      optimizedPoints = this.decimateData(optimizedPoints);
    }

    // 5. Filter manoeuvres to match time range
    const filteredManoeuvres = this.filterManoeuvres(manoeuvres, optimizedPoints);

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    return {
      trackPoints: optimizedPoints,
      manoeuvres: filteredManoeuvres,
      metadata: {
        originalCount,
        optimizedCount: optimizedPoints.length,
        compressionRatio: originalCount > 0 ? optimizedPoints.length / originalCount : 1,
        processingTime
      }
    };
  }

  private filterBySpeed(points: ProcessedTrackPoint[]): ProcessedTrackPoint[] {
    return points.filter(point => 
      point.sog >= this.settings.speedThreshold.min && 
      point.sog <= this.settings.speedThreshold.max
    );
  }

  private removeOutliers(points: ProcessedTrackPoint[]): ProcessedTrackPoint[] {
    if (points.length < 3) return points;

    // Calculate statistics for different metrics
    const speeds = points.map(p => p.sog);
    const speedMean = this.calculateMean(speeds);
    const speedStdDev = this.calculateStdDev(speeds, speedMean);

    const headings = points.map(p => p.cog);
    const headingMean = this.calculateCircularMean(headings);
    const headingStdDev = this.calculateCircularStdDev(headings, headingMean);

    return points.filter(point => {
      const speedZScore = Math.abs((point.sog - speedMean) / speedStdDev);
      const headingDiff = this.calculateAngularDifference(point.cog, headingMean);
      const headingZScore = Math.abs(headingDiff / headingStdDev);

      return speedZScore <= this.settings.outlierRemoval.threshold &&
             headingZScore <= this.settings.outlierRemoval.threshold;
    });
  }

  private smoothData(points: ProcessedTrackPoint[]): ProcessedTrackPoint[] {
    if (points.length < this.settings.smoothingWindow) return points;

    const smoothed: ProcessedTrackPoint[] = [];
    const halfWindow = Math.floor(this.settings.smoothingWindow / 2);

    for (let i = 0; i < points.length; i++) {
      const start = Math.max(0, i - halfWindow);
      const end = Math.min(points.length - 1, i + halfWindow);
      const windowPoints = points.slice(start, end + 1);

      if (windowPoints.length > 0) {
        smoothed.push({
          ...points[i], // Keep original timestamp and other data
          sog: this.calculateMean(windowPoints.map(p => p.sog)),
          cog: this.calculateCircularMean(windowPoints.map(p => p.cog)),
          twa: this.calculateCircularMean(windowPoints.map(p => p.twa)),
          twd: this.calculateCircularMean(windowPoints.map(p => p.twd)),
          tws: this.calculateMean(windowPoints.map(p => p.tws))
        });
      }
    }

    return smoothed;
  }

  private decimateData(points: ProcessedTrackPoint[]): ProcessedTrackPoint[] {
    if (points.length <= this.settings.maxDataPoints) return points;

    const decimationFactor = Math.ceil(points.length / this.settings.maxDataPoints);
    const decimated: ProcessedTrackPoint[] = [];

    // Always include first and last points
    decimated.push(points[0]);

    // Decimate middle points using adaptive sampling
    for (let i = decimationFactor; i < points.length - 1; i += decimationFactor) {
      // Use importance-based sampling - keep points with significant changes
      const current = points[i];
      const prev = points[i - decimationFactor];
      
      const speedChange = Math.abs(current.sog - prev.sog);
      const headingChange = this.calculateAngularDifference(current.cog, prev.cog);
      
      // Keep point if it represents significant change (now configurable)
      if (speedChange > this.settings.decimation.significantChange.speedThreshold || 
          headingChange > this.settings.decimation.significantChange.headingThreshold) {
        decimated.push(current);
      } else {
        // Sample at regular intervals for less significant points
        decimated.push(current);
      }
    }

    decimated.push(points[points.length - 1]);

    return decimated;
  }

  private filterManoeuvres(
    manoeuvres: ManoeuvreEvent[], 
    trackPoints: ProcessedTrackPoint[]
  ): ManoeuvreEvent[] {
    if (trackPoints.length === 0) return [];

    const startTime = trackPoints[0].utc;
    const endTime = trackPoints[trackPoints.length - 1].utc;

    return manoeuvres.filter(manoeuvre => 
      manoeuvre.timestamp >= startTime && manoeuvre.timestamp <= endTime
    );
  }

  // Utility methods for statistical calculations
  private calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateStdDev(values: number[], mean: number): number {
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateCircularMean(angles: number[]): number {
    let x = 0, y = 0;
    for (const angle of angles) {
      const rad = angle * Math.PI / 180;
      x += Math.cos(rad);
      y += Math.sin(rad);
    }
    return Math.atan2(y / angles.length, x / angles.length) * 180 / Math.PI;
  }

  private calculateCircularStdDev(angles: number[], mean: number): number {
    const differences = angles.map(angle => this.calculateAngularDifference(angle, mean));
    return this.calculateStdDev(differences, 0);
  }

  private calculateAngularDifference(angle1: number, angle2: number): number {
    let diff = angle1 - angle2;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return Math.abs(diff);
  }
}

// Factory function for creating optimized data processor
export function createDataOptimizer(customSettings?: Partial<OptimizationSettings>): DataOptimizer {
  const defaultSettings: OptimizationSettings = {
    maxDataPoints: 5000,
    smoothingWindow: 5,
    speedThreshold: {
      min: 0,
      max: 50
    },
    outlierRemoval: {
      enabled: true,
      threshold: 3
    },
    decimation: {
      enabled: true,
      factor: 2,
      significantChange: {
        speedThreshold: 0.5, // knots
        headingThreshold: 10 // degrees
      }
    }
  };

  const settings = { ...defaultSettings, ...customSettings };
  return new DataOptimizer(settings);
}

interface PerformanceMetric {
  count: number;
  average: number;
  min: number;
  max: number;
  total: number;
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  public startTimer(label: string): void {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label)!.push(performance.now());
  }

  public endTimer(label: string): number {
    const times = this.metrics.get(label);
    if (!times || times.length === 0) return 0;

    const startTime = times.pop()!;
    const duration = performance.now() - startTime;
    
    // Store the duration for analysis
    if (!this.metrics.has(`${label}_durations`)) {
      this.metrics.set(`${label}_durations`, []);
    }
    this.metrics.get(`${label}_durations`)!.push(duration);
    
    return duration;
  }

  public getAverageTime(label: string): number {
    const durations = this.metrics.get(`${label}_durations`);
    if (!durations || durations.length === 0) return 0;

    return durations.reduce((sum, d) => sum + d, 0) / durations.length;
  }

  public getPerformanceReport(): Record<string, PerformanceMetric> {
    const report: Record<string, PerformanceMetric> = {};
    
    for (const [key, values] of this.metrics.entries()) {
      if (key.endsWith('_durations') && values.length > 0) {
        const label = key.replace('_durations', '');
        report[label] = {
          count: values.length,
          average: this.getAverageTime(label),
          min: Math.min(...values),
          max: Math.max(...values),
          total: values.reduce((sum, d) => sum + d, 0)
        };
      }
    }
    
    return report;
  }

  public reset(): void {
    this.metrics.clear();
  }
}

interface MemoryUsage {
  used: number;
  total: number;
  limit: number;
}

// Memory usage monitoring
export function getMemoryUsage(): Record<string, number> | MemoryUsage {
  if ('memory' in performance) {
    const memory = (performance as Performance & { memory: MemoryUsage }).memory;
    return {
      used: Math.round(memory.used / 1048576), // MB
      total: Math.round(memory.total / 1048576), // MB
      limit: Math.round(memory.limit / 1048576) // MB
    };
  }
  return {};
}

// Data size estimation
export function estimateDataSize(data: unknown): number {
  const jsonString = JSON.stringify(data);
  return new Blob([jsonString]).size;
}