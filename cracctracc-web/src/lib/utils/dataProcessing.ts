import {
  TrackPoint,
  ProcessedTrackPoint,
  SailingAnalysis,
  PointOfSail,
  AnalysisSummary,
  FileMetadata,
  ManoeuvreEvent,
} from '../types/sailing';
import { WindCalculations } from '../calculations/wind';
import { ManoeuvreDetection } from '../calculations/manoeuvres';

export interface ProcessingOptions {
  windOptions?: {
    fixedTwd?: number;
    useWeatherAPI?: boolean;
    date?: string;
  };
  filterOptions?: {
    minSpeed?: number; // Filter out points below this speed (knots)
    maxSpeed?: number; // Filter out points above this speed (knots)
    startTime?: number; // Unix timestamp
    endTime?: number; // Unix timestamp
  };
}

export class DataProcessor {
  /**
   * Main processing pipeline: parse -> filter -> wind -> manoeuvres -> analyze
   */
  static async processTrackData(
    trackPoints: TrackPoint[],
    metadata: FileMetadata,
    options: ProcessingOptions = {}
  ): Promise<SailingAnalysis> {
    // Step 1: Filter track points if requested
    const filteredPoints = this.filterTrackPoints(trackPoints, options.filterOptions);

    // Step 2: Add wind data
    let processedPoints = await WindCalculations.addWindData(
      filteredPoints,
      options.windOptions || {}
    );

    // Step 3: Detect manoeuvres
    processedPoints = ManoeuvreDetection.detectManoeuvres(processedPoints);

    // Step 4: Extract manoeuvre events
    const manoeuvres = ManoeuvreDetection.extractManoeuvreEvents(processedPoints);

    // Step 5: Generate summary analysis
    const summary = this.generateSummary(processedPoints, manoeuvres);

    return {
      trackPoints: processedPoints,
      manoeuvres,
      summary,
      metadata
    };
  }

  /**
   * Filter track points based on speed, time, and other criteria
   */
  private static filterTrackPoints(
    trackPoints: TrackPoint[],
    filters?: ProcessingOptions['filterOptions']
  ): TrackPoint[] {
    if (!filters) return trackPoints;

    return trackPoints.filter(point => {
      // Speed filtering
      if (filters.minSpeed !== undefined && point.sog < filters.minSpeed) {
        return false;
      }
      if (filters.maxSpeed !== undefined && point.sog > filters.maxSpeed) {
        return false;
      }

      // Time filtering
      if (filters.startTime !== undefined && point.utc < filters.startTime) {
        return false;
      }
      if (filters.endTime !== undefined && point.utc > filters.endTime) {
        return false;
      }

      return true;
    });
  }

  /**
   * Generate analysis summary from processed track points
   */
  private static generateSummary(
    trackPoints: ProcessedTrackPoint[],
    manoeuvres: ManoeuvreEvent[]
  ): AnalysisSummary {
    if (trackPoints.length === 0) {
      return {
        totalDistance: 0,
        totalTime: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        tackCount: 0,
        gybeCount: 0,
        averageTwa: 0
      };
    }

    // Calculate total distance using haversine formula
    const totalDistance = this.calculateTotalDistance(trackPoints);

    // Calculate time duration
    const startTime = trackPoints[0].utc;
    const endTime = trackPoints[trackPoints.length - 1].utc;
    const totalTime = (endTime - startTime) / (1000 * 60); // minutes

    // Calculate speed statistics
    const speeds = trackPoints.map(p => p.sog);
    const averageSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
    const maxSpeed = Math.max(...speeds);

    // Calculate average TWA
    const twaValues = trackPoints.map(p => Math.abs(p.twa));
    const averageTwa = twaValues.reduce((sum, twa) => sum + twa, 0) / twaValues.length;

    // Calculate manoeuvre counts
    const manoeuvreAnalysis = ManoeuvreDetection.analyzeManoeuvres(manoeuvres);

    return {
      totalDistance: Math.round(totalDistance * 100) / 100, // Round to 2 decimal places
      totalTime: Math.round(totalTime),
      averageSpeed: Math.round(averageSpeed * 10) / 10,
      maxSpeed: Math.round(maxSpeed * 10) / 10,
      tackCount: manoeuvreAnalysis.tackCount,
      gybeCount: manoeuvreAnalysis.gybeCount,
      averageTwa: Math.round(averageTwa)
    };
  }

  /**
   * Calculate total distance using Haversine formula
   */
  private static calculateTotalDistance(trackPoints: ProcessedTrackPoint[]): number {
    if (trackPoints.length < 2) return 0;

    let totalDistance = 0;

    for (let i = 1; i < trackPoints.length; i++) {
      const prev = trackPoints[i - 1];
      const curr = trackPoints[i];
      
      const distance = this.haversineDistance(
        prev.lat, prev.lon,
        curr.lat, curr.lon
      );
      
      totalDistance += distance;
    }

    return totalDistance;
  }

  /**
   * Calculate distance between two points using Haversine formula
   * Returns distance in nautical miles
   */
  private static haversineDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number {
    const R = 3440.065; // Earth's radius in nautical miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate sailing performance metrics
   */
  static calculatePerformanceMetrics(trackPoints: ProcessedTrackPoint[]): {
    upwindPerformance: { averageSpeed: number; averageTwa: number; efficiency: number };
    downwindPerformance: { averageSpeed: number; averageTwa: number; efficiency: number };
    reachingPerformance: { averageSpeed: number; averageTwa: number; efficiency: number };
    overallEfficiency: number;
  } {
    if (trackPoints.length === 0) {
      const emptyPerf = { averageSpeed: 0, averageTwa: 0, efficiency: 0 };
      return {
        upwindPerformance: emptyPerf,
        downwindPerformance: emptyPerf,
        reachingPerformance: emptyPerf,
        overallEfficiency: 0
      };
    }

    const upwindPoints = trackPoints.filter(p => p.pos === PointOfSail.Upwind);
    const downwindPoints = trackPoints.filter(p => p.pos === PointOfSail.Downwind);
    const reachingPoints = trackPoints.filter(p => p.pos === PointOfSail.Reach);

    const calculatePointPerformance = (points: ProcessedTrackPoint[]) => {
      if (points.length === 0) return { averageSpeed: 0, averageTwa: 0, efficiency: 0 };
      
      const avgSpeed = points.reduce((sum, p) => sum + p.sog, 0) / points.length;
      const avgTwa = points.reduce((sum, p) => sum + Math.abs(p.twa), 0) / points.length;
      const efficiency = avgSpeed / (points[0]?.tws || 10) * 100; // Speed/Wind Speed ratio
      
      return {
        averageSpeed: Math.round(avgSpeed * 10) / 10,
        averageTwa: Math.round(avgTwa),
        efficiency: Math.round(efficiency * 10) / 10
      };
    };

    const upwindPerformance = calculatePointPerformance(upwindPoints);
    const downwindPerformance = calculatePointPerformance(downwindPoints);
    const reachingPerformance = calculatePointPerformance(reachingPoints);

    const overallSpeed = trackPoints.reduce((sum, p) => sum + p.sog, 0) / trackPoints.length;
    const overallWindSpeed = trackPoints.reduce((sum, p) => sum + p.tws, 0) / trackPoints.length;
    const overallEfficiency = Math.round((overallSpeed / overallWindSpeed) * 100 * 10) / 10;

    return {
      upwindPerformance,
      downwindPerformance,
      reachingPerformance,
      overallEfficiency
    };
  }
}

// Legacy function for backward compatibility
export async function processTrackData(
  trackPoints: TrackPoint[]
): Promise<SailingAnalysis> {
  const metadata: FileMetadata = {
    filename: '',
    fileType: 'gpx',
    fileSize: 0,
    trackPointCount: trackPoints.length,
    startTime: trackPoints.length > 0 ? trackPoints[0].utc : 0,
    endTime: trackPoints.length > 0 ? trackPoints[trackPoints.length - 1].utc : 0,
  };

  return DataProcessor.processTrackData(trackPoints, metadata);
}
