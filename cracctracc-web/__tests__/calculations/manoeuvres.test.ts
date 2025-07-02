import { ManoeuvreDetection } from '../../src/lib/calculations/manoeuvres';
import { ProcessedTrackPoint, ManoeuvreType, Tack, PointOfSail } from '../../src/lib/types/sailing';

describe('ManoeuvreDetection', () => {
  const createTrackPoint = (
    twa: number,
    tack: Tack,
    pos: PointOfSail,
    utc: number = 1000
  ): ProcessedTrackPoint => ({
    lat: -37.8136,
    lon: 144.9631,
    utc,
    sog: 5.5,
    cog: 45,
    twd: 180,
    tws: 10,
    twa,
    pos,
    tack
  });

  describe('detectManoeuvres', () => {
    it('should return empty array for insufficient track points', () => {
      const result = ManoeuvreDetection.detectManoeuvres([]);
      expect(result).toEqual([]);

      const singlePoint = [createTrackPoint(45, Tack.Starboard, PointOfSail.Upwind)];
      const result2 = ManoeuvreDetection.detectManoeuvres(singlePoint);
      expect(result2).toEqual(singlePoint);
    });

    it('should detect tacks (upwind tack changes)', () => {
      const trackPoints: ProcessedTrackPoint[] = [
        createTrackPoint(45, Tack.Starboard, PointOfSail.Upwind, 1000),
        createTrackPoint(-45, Tack.Port, PointOfSail.Upwind, 2000), // Tack
        createTrackPoint(-50, Tack.Port, PointOfSail.Upwind, 3000)
      ];

      const result = ManoeuvreDetection.detectManoeuvres(trackPoints);

      expect(result[1].manoeuvre).toBe(ManoeuvreType.Tack);
      expect(result[0].manoeuvre).toBeUndefined();
      expect(result[2].manoeuvre).toBeUndefined();
    });

    it('should detect gybes (downwind tack changes)', () => {
      const trackPoints: ProcessedTrackPoint[] = [
        createTrackPoint(120, Tack.Starboard, PointOfSail.Downwind, 1000),
        createTrackPoint(-120, Tack.Port, PointOfSail.Downwind, 2000), // Gybe
        createTrackPoint(-130, Tack.Port, PointOfSail.Downwind, 3000)
      ];

      const result = ManoeuvreDetection.detectManoeuvres(trackPoints);

      expect(result[1].manoeuvre).toBe(ManoeuvreType.Gybe);
      expect(result[0].manoeuvre).toBeUndefined();
      expect(result[2].manoeuvre).toBeUndefined();
    });

    it('should detect round ups (downwind to upwind)', () => {
      const trackPoints: ProcessedTrackPoint[] = [
        createTrackPoint(120, Tack.Starboard, PointOfSail.Downwind, 1000),
        createTrackPoint(45, Tack.Starboard, PointOfSail.Upwind, 2000), // Round up
        createTrackPoint(40, Tack.Starboard, PointOfSail.Upwind, 3000)
      ];

      const result = ManoeuvreDetection.detectManoeuvres(trackPoints);

      expect(result[1].manoeuvre).toBe(ManoeuvreType.RoundUp);
    });

    it('should detect bear aways (upwind to downwind)', () => {
      const trackPoints: ProcessedTrackPoint[] = [
        createTrackPoint(45, Tack.Starboard, PointOfSail.Upwind, 1000),
        createTrackPoint(120, Tack.Starboard, PointOfSail.Downwind, 2000), // Bear away
        createTrackPoint(130, Tack.Starboard, PointOfSail.Downwind, 3000)
      ];

      const result = ManoeuvreDetection.detectManoeuvres(trackPoints);

      expect(result[1].manoeuvre).toBe(ManoeuvreType.BearAway);
    });

    it('should not detect manoeuvres when conditions are not met', () => {
      const trackPoints: ProcessedTrackPoint[] = [
        createTrackPoint(45, Tack.Starboard, PointOfSail.Upwind, 1000),
        createTrackPoint(50, Tack.Starboard, PointOfSail.Upwind, 2000), // Same tack, same point of sail
        createTrackPoint(40, Tack.Starboard, PointOfSail.Upwind, 3000)
      ];

      const result = ManoeuvreDetection.detectManoeuvres(trackPoints);

      expect(result[0].manoeuvre).toBeUndefined();
      expect(result[1].manoeuvre).toBeUndefined();
      expect(result[2].manoeuvre).toBeUndefined();
    });
  });

  describe('extractManoeuvreEvents', () => {
    it('should extract manoeuvre events from track points', () => {
      const trackPoints: ProcessedTrackPoint[] = [
        createTrackPoint(45, Tack.Starboard, PointOfSail.Upwind, 1000),
        { ...createTrackPoint(-45, Tack.Port, PointOfSail.Upwind, 2000), manoeuvre: ManoeuvreType.Tack },
        createTrackPoint(-50, Tack.Port, PointOfSail.Upwind, 3000),
        { ...createTrackPoint(-120, Tack.Port, PointOfSail.Downwind, 4000), manoeuvre: ManoeuvreType.BearAway }
      ];

      const events = ManoeuvreDetection.extractManoeuvreEvents(trackPoints);

      expect(events).toHaveLength(2);
      
      // Check tack event
      expect(events[0].type).toBe(ManoeuvreType.Tack);
      expect(events[0].timestamp).toBe(2000);
      expect(events[0].startTwa).toBe(45);
      expect(events[0].endTwa).toBe(-45);
      expect(events[0].duration).toBe(1); // (2000-1000)/1000 = 1 second

      // Check bear away event
      expect(events[1].type).toBe(ManoeuvreType.BearAway);
      expect(events[1].timestamp).toBe(4000);
      expect(events[1].startTwa).toBe(-50);
      expect(events[1].endTwa).toBe(-120);
    });

    it('should return empty array when no manoeuvres present', () => {
      const trackPoints: ProcessedTrackPoint[] = [
        createTrackPoint(45, Tack.Starboard, PointOfSail.Upwind, 1000),
        createTrackPoint(50, Tack.Starboard, PointOfSail.Upwind, 2000)
      ];

      const events = ManoeuvreDetection.extractManoeuvreEvents(trackPoints);
      expect(events).toHaveLength(0);
    });
  });

  describe('analyzeManoeuvres', () => {
    it('should analyze manoeuvre performance correctly', () => {
      const events = [
        {
          id: 'tack-1',
          type: ManoeuvreType.Tack,
          timestamp: 1000,
          startTwa: 45,
          endTwa: -45,
          duration: 5
        },
        {
          id: 'tack-2',
          type: ManoeuvreType.Tack,
          timestamp: 2000,
          startTwa: -40,
          endTwa: 40,
          duration: 7
        },
        {
          id: 'gybe-1',
          type: ManoeuvreType.Gybe,
          timestamp: 3000,
          startTwa: 120,
          endTwa: -120,
          duration: 10
        },
        {
          id: 'roundup-1',
          type: ManoeuvreType.RoundUp,
          timestamp: 4000,
          startTwa: 120,
          endTwa: 45,
          duration: 8
        }
      ];

      const analysis = ManoeuvreDetection.analyzeManoeuvres(events);

      expect(analysis.tackCount).toBe(2);
      expect(analysis.gybeCount).toBe(1);
      expect(analysis.roundUpCount).toBe(1);
      expect(analysis.bearAwayCount).toBe(0);
      expect(analysis.averageTackDuration).toBe(6); // (5+7)/2
      expect(analysis.averageGybeDuration).toBe(10);
      expect(analysis.manoeuvreFrequency).toBeCloseTo(4800); // 4 manoeuvres in (4000-1000)/1000/3600 hours
    });

    it('should handle empty events array', () => {
      const analysis = ManoeuvreDetection.analyzeManoeuvres([]);

      expect(analysis.tackCount).toBe(0);
      expect(analysis.gybeCount).toBe(0);
      expect(analysis.averageTackDuration).toBe(0);
      expect(analysis.averageGybeDuration).toBe(0);
      expect(analysis.manoeuvreFrequency).toBe(0);
    });
  });

  describe('filterManoeuvres', () => {
    const events = [
      {
        id: 'tack-1',
        type: ManoeuvreType.Tack,
        timestamp: 1000,
        startTwa: 45,
        endTwa: -45,
        duration: 5
      },
      {
        id: 'gybe-1',
        type: ManoeuvreType.Gybe,
        timestamp: 2000,
        startTwa: 120,
        endTwa: -120,
        duration: 10
      },
      {
        id: 'roundup-1',
        type: ManoeuvreType.RoundUp,
        timestamp: 3000,
        startTwa: 120,
        endTwa: 45,
        duration: 8
      }
    ];

    it('should filter by manoeuvre type', () => {
      const filtered = ManoeuvreDetection.filterManoeuvres(events, {
        types: [ManoeuvreType.Tack, ManoeuvreType.Gybe]
      });

      expect(filtered).toHaveLength(2);
      expect(filtered[0].type).toBe(ManoeuvreType.Tack);
      expect(filtered[1].type).toBe(ManoeuvreType.Gybe);
    });

    it('should filter by time range', () => {
      const filtered = ManoeuvreDetection.filterManoeuvres(events, {
        startTime: 1500,
        endTime: 2500
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe(ManoeuvreType.Gybe);
    });

    it('should apply multiple filters', () => {
      const filtered = ManoeuvreDetection.filterManoeuvres(events, {
        types: [ManoeuvreType.Gybe, ManoeuvreType.RoundUp],
        startTime: 1500
      });

      expect(filtered).toHaveLength(2);
      expect(filtered[0].type).toBe(ManoeuvreType.Gybe);
      expect(filtered[1].type).toBe(ManoeuvreType.RoundUp);
    });
  });

  describe('getManoeuvreStatistics', () => {
    it('should calculate statistics by manoeuvre type', () => {
      const events = [
        {
          id: 'tack-1',
          type: ManoeuvreType.Tack,
          timestamp: 1000,
          startTwa: 45,
          endTwa: -45,
          duration: 5
        },
        {
          id: 'tack-2',
          type: ManoeuvreType.Tack,
          timestamp: 2000,
          startTwa: -40,
          endTwa: 40,
          duration: 7
        },
        {
          id: 'gybe-1',
          type: ManoeuvreType.Gybe,
          timestamp: 3000,
          startTwa: 120,
          endTwa: -120,
          duration: 10
        }
      ];

      const stats = ManoeuvreDetection.getManoeuvreStatistics(events);

      expect(stats.get(ManoeuvreType.Tack)).toEqual({
        count: 2,
        averageDuration: 6,
        totalDuration: 12
      });

      expect(stats.get(ManoeuvreType.Gybe)).toEqual({
        count: 1,
        averageDuration: 10,
        totalDuration: 10
      });

      expect(stats.get(ManoeuvreType.RoundUp)).toEqual({
        count: 0,
        averageDuration: 0,
        totalDuration: 0
      });
    });
  });
});