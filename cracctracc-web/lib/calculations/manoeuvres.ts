import { ProcessedTrackPoint, ManoeuvreType, ManoeuvreEvent } from '../types/sailing';

export class ManoeuvreDetection {
  /**
   * Detect sailing manoeuvres in processed track points
   * Ported from Python identify_manoeuvres function
   */
  static detectManoeuvres(trackPoints: ProcessedTrackPoint[]): ProcessedTrackPoint[] {
    if (trackPoints.length < 2) return trackPoints;

    const enhancedPoints = [...trackPoints];

    for (let i = 1; i < enhancedPoints.length; i++) {
      const current = enhancedPoints[i];
      const previous = enhancedPoints[i - 1];

      const manoeuvre = this.identifyManoeuvre(previous, current);
      if (manoeuvre) {
        enhancedPoints[i] = { ...current, manoeuvre };
      }
    }

    return enhancedPoints;
  }

  /**
   * Identify specific manoeuvre type between two track points
   * Ported from Python identify_manoeuvres conditions
   */
  private static identifyManoeuvre(
    previous: ProcessedTrackPoint,
    current: ProcessedTrackPoint
  ): ManoeuvreType | undefined {
    const prevTwa = Math.abs(previous.twa);
    const currTwa = Math.abs(current.twa);
    const tackChanged = previous.tack !== current.tack;

    // Tack: change in tack while sailing upwind (TWA <= 90 degrees)
    if (tackChanged && currTwa <= 90) {
      return ManoeuvreType.Tack;
    }

    // Gybe: change in tack while sailing downwind (TWA > 90 degrees)
    if (tackChanged && currTwa > 90) {
      return ManoeuvreType.Gybe;
    }

    // Round up: transition from downwind to upwind
    if (prevTwa > 90 && currTwa <= 90) {
      return ManoeuvreType.RoundUp;
    }

    // Bear away: transition from upwind to downwind
    if (prevTwa <= 90 && currTwa > 90) {
      return ManoeuvreType.BearAway;
    }

    return undefined;
  }

  /**
   * Extract all manoeuvre events from track points
   * Similar to Python manoeuvres_analysis function
   */
  static extractManoeuvreEvents(trackPoints: ProcessedTrackPoint[]): ManoeuvreEvent[] {
    const events: ManoeuvreEvent[] = [];

    trackPoints.forEach((point, index) => {
      if (point.manoeuvre && index > 0) {
        const previousPoint = trackPoints[index - 1];
        
        events.push({
          id: `${point.manoeuvre}-${point.utc}`,
          type: point.manoeuvre,
          timestamp: point.utc,
          startTwa: previousPoint.twa,
          endTwa: point.twa,
          duration: this.calculateManoeuvreDuration(trackPoints, index)
        });
      }
    });

    return events;
  }

  /**
   * Calculate duration of a manoeuvre by looking at surrounding points
   */
  private static calculateManoeuvreDuration(
    trackPoints: ProcessedTrackPoint[],
    manoeuvreIndex: number
  ): number {
    // Simple implementation: use time difference with previous point
    if (manoeuvreIndex === 0) return 0;
    
    const current = trackPoints[manoeuvreIndex];
    const previous = trackPoints[manoeuvreIndex - 1];
    
    return Math.round((current.utc - previous.utc) / 1000); // seconds
  }

  /**
   * Analyze manoeuvre performance
   */
  static analyzeManoeuvres(events: ManoeuvreEvent[]): {
    tackCount: number;
    gybeCount: number;
    roundUpCount: number;
    bearAwayCount: number;
    averageTackDuration: number;
    averageGybeDuration: number;
    manoeuvreFrequency: number; // per hour
  } {
    const tacks = events.filter(e => e.type === ManoeuvreType.Tack);
    const gybes = events.filter(e => e.type === ManoeuvreType.Gybe);
    const roundUps = events.filter(e => e.type === ManoeuvreType.RoundUp);
    const bearAways = events.filter(e => e.type === ManoeuvreType.BearAway);

    const averageTackDuration = tacks.length > 0
      ? tacks.reduce((sum, t) => sum + (t.duration || 0), 0) / tacks.length
      : 0;

    const averageGybeDuration = gybes.length > 0
      ? gybes.reduce((sum, g) => sum + (g.duration || 0), 0) / gybes.length
      : 0;

    const totalTime = events.length > 0
      ? (events[events.length - 1].timestamp - events[0].timestamp) / (1000 * 60 * 60) // hours
      : 1;

    const manoeuvreFrequency = events.length / totalTime;

    return {
      tackCount: tacks.length,
      gybeCount: gybes.length,
      roundUpCount: roundUps.length,
      bearAwayCount: bearAways.length,
      averageTackDuration,
      averageGybeDuration,
      manoeuvreFrequency
    };
  }

  /**
   * Filter manoeuvres by type and time range
   */
  static filterManoeuvres(
    events: ManoeuvreEvent[],
    filters: {
      types?: ManoeuvreType[];
      startTime?: number;
      endTime?: number;
    }
  ): ManoeuvreEvent[] {
    return events.filter(event => {
      if (filters.types && !filters.types.includes(event.type)) {
        return false;
      }
      
      if (filters.startTime && event.timestamp < filters.startTime) {
        return false;
      }
      
      if (filters.endTime && event.timestamp > filters.endTime) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Get manoeuvre statistics grouped by type
   */
  static getManoeuvreStatistics(events: ManoeuvreEvent[]): Map<ManoeuvreType, {
    count: number;
    averageDuration: number;
    totalDuration: number;
  }> {
    const stats = new Map();

    Object.values(ManoeuvreType).forEach(type => {
      const typeEvents = events.filter(e => e.type === type);
      const totalDuration = typeEvents.reduce((sum, e) => sum + (e.duration || 0), 0);
      const averageDuration = typeEvents.length > 0 ? totalDuration / typeEvents.length : 0;

      stats.set(type, {
        count: typeEvents.length,
        averageDuration,
        totalDuration
      });
    });

    return stats;
  }
}
