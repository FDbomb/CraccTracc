import { DataProcessor, processTrackData } from '../../src/lib/utils/dataProcessing';
import { TrackPoint, FileMetadata, PointOfSail, Tack } from '../../src/lib/types/sailing';

describe('DataProcessor', () => {
  const sampleTrackPoints: TrackPoint[] = [
    {
      lat: -37.8136,
      lon: 144.9631,
      utc: 1700000000000,
      sog: 5.5,
      cog: 45
    },
    {
      lat: -37.8137,
      lon: 144.9632,
      utc: 1700000060000,
      sog: 6.2,
      cog: 315 // This should create a tack from starboard to port
    },
    {
      lat: -37.8138,
      lon: 144.9633,
      utc: 1700000120000,
      sog: 4.8,
      cog: 135
    }
  ];

  const sampleMetadata: FileMetadata = {
    filename: 'test.gpx',
    fileType: 'gpx',
    fileSize: 1024,
    trackPointCount: 3,
    startTime: 1700000000000,
    endTime: 1700000120000
  };

  describe('processTrackData', () => {
    it('should process track data with default options', async () => {
      const result = await DataProcessor.processTrackData(sampleTrackPoints, sampleMetadata);

      expect(result.trackPoints).toHaveLength(3);
      expect(result.metadata).toEqual(sampleMetadata);
      expect(result.summary).toBeDefined();
      expect(result.manoeuvres).toBeDefined();

      // Check that wind data was added
      expect(result.trackPoints[0].twd).toBeDefined();
      expect(result.trackPoints[0].tws).toBeDefined();
      expect(result.trackPoints[0].twa).toBeDefined();
      expect(result.trackPoints[0].pos).toBeDefined();
      expect(result.trackPoints[0].tack).toBeDefined();
    });

    it('should apply wind options correctly', async () => {
      const result = await DataProcessor.processTrackData(
        sampleTrackPoints,
        sampleMetadata,
        {
          windOptions: { fixedTwd: 270 }
        }
      );

      expect(result.trackPoints[0].twd).toBe(270);
      expect(result.trackPoints[0].tws).toBe(10);
    });

    it('should filter track points by speed', async () => {
      const result = await DataProcessor.processTrackData(
        sampleTrackPoints,
        sampleMetadata,
        {
          filterOptions: { minSpeed: 5.0, maxSpeed: 6.0 }
        }
      );

      // Should filter out point with speed 4.8 and 6.2 (outside 5.0-6.0 range)
      expect(result.trackPoints).toHaveLength(1);
      expect(result.trackPoints[0].sog).toBe(5.5);
    });

    it('should filter track points by time', async () => {
      const result = await DataProcessor.processTrackData(
        sampleTrackPoints,
        sampleMetadata,
        {
          filterOptions: { 
            startTime: 1700000030000, 
            endTime: 1700000090000 
          }
        }
      );

      // Should only include the middle point
      expect(result.trackPoints).toHaveLength(1);
      expect(result.trackPoints[0].utc).toBe(1700000060000);
    });

    it('should handle empty track points', async () => {
      const result = await DataProcessor.processTrackData([], sampleMetadata);

      expect(result.trackPoints).toHaveLength(0);
      expect(result.summary.totalDistance).toBe(0);
      expect(result.summary.totalTime).toBe(0);
      expect(result.summary.averageSpeed).toBe(0);
    });
  });

  describe('calculatePerformanceMetrics', () => {
    it('should calculate performance metrics for different points of sail', () => {
      const processedPoints = [
        {
          lat: 0, lon: 0, utc: 1000, sog: 5, cog: 45,
          twd: 0, tws: 10, twa: 45, pos: PointOfSail.Upwind, tack: Tack.Starboard
        },
        {
          lat: 0, lon: 0, utc: 2000, sog: 6, cog: 315,
          twd: 0, tws: 10, twa: -45, pos: PointOfSail.Upwind, tack: Tack.Port
        },
        {
          lat: 0, lon: 0, utc: 3000, sog: 8, cog: 90,
          twd: 0, tws: 10, twa: 90, pos: PointOfSail.Reach, tack: Tack.Starboard
        },
        {
          lat: 0, lon: 0, utc: 4000, sog: 7, cog: 135,
          twd: 0, tws: 10, twa: 135, pos: PointOfSail.Downwind, tack: Tack.Starboard
        }
      ];

      const metrics = DataProcessor.calculatePerformanceMetrics(processedPoints);

      expect(metrics.upwindPerformance.averageSpeed).toBe(5.5); // (5+6)/2
      expect(metrics.upwindPerformance.averageTwa).toBe(45); // (45+45)/2
      expect(metrics.upwindPerformance.efficiency).toBe(55); // 5.5/10*100

      expect(metrics.reachingPerformance.averageSpeed).toBe(8);
      expect(metrics.reachingPerformance.averageTwa).toBe(90);

      expect(metrics.downwindPerformance.averageSpeed).toBe(7);
      expect(metrics.downwindPerformance.averageTwa).toBe(135);

      expect(metrics.overallEfficiency).toBe(65); // (5+6+8+7)/4/10*100
    });

    it('should handle empty processed points', () => {
      const metrics = DataProcessor.calculatePerformanceMetrics([]);

      expect(metrics.upwindPerformance.averageSpeed).toBe(0);
      expect(metrics.reachingPerformance.averageSpeed).toBe(0);
      expect(metrics.downwindPerformance.averageSpeed).toBe(0);
      expect(metrics.overallEfficiency).toBe(0);
    });
  });

  describe('haversine distance calculation', () => {
    it('should calculate distance correctly', async () => {
      // Test with points that have a known distance
      const trackPoints: TrackPoint[] = [
        { lat: 0, lon: 0, utc: 1000, sog: 5, cog: 0 },
        { lat: 0, lon: 1, utc: 2000, sog: 5, cog: 0 }, // 1 degree longitude at equator ≈ 60 nm
      ];

      const result = await DataProcessor.processTrackData(trackPoints, sampleMetadata);

      // 1 degree longitude at equator is approximately 60 nautical miles
      expect(result.summary.totalDistance).toBeCloseTo(60, 0);
    });

    it('should handle single point', async () => {
      const trackPoints: TrackPoint[] = [
        { lat: 0, lon: 0, utc: 1000, sog: 5, cog: 0 }
      ];

      const result = await DataProcessor.processTrackData(trackPoints, sampleMetadata);
      expect(result.summary.totalDistance).toBe(0);
    });
  });

  describe('summary generation', () => {
    it('should generate accurate summary statistics', async () => {
      const trackPoints: TrackPoint[] = [
        { lat: 0, lon: 0, utc: 1000, sog: 5, cog: 45 },
        { lat: 0, lon: 0.1, utc: 61000, sog: 10, cog: 315 }, // Tack from starboard to port
        { lat: 0, lon: 0.2, utc: 121000, sog: 7, cog: 45 }   // Tack back to starboard
      ];

      const result = await DataProcessor.processTrackData(trackPoints, sampleMetadata, {
        windOptions: { fixedTwd: 0 }
      });

      expect(result.summary.totalTime).toBe(2); // 120 seconds = 2 minutes
      expect(result.summary.averageSpeed).toBeCloseTo(7.3, 1); // (5+10+7)/3
      expect(result.summary.maxSpeed).toBe(10);
      expect(result.summary.tackCount).toBeGreaterThan(0); // Should detect tacks
      expect(result.summary.averageTwa).toBeGreaterThan(0);
    });
  });

  describe('legacy processTrackData function', () => {
    it('should work with legacy interface', async () => {
      const result = await processTrackData(sampleTrackPoints);

      expect(result.trackPoints).toHaveLength(3);
      expect(result.metadata.trackPointCount).toBe(3);
      expect(result.metadata.filename).toBe('');
      expect(result.metadata.fileType).toBe('gpx');
    });
  });

  describe('integration with manoeuvre detection', () => {
    it('should detect and analyze manoeuvres in processed data', async () => {
      const trackPoints: TrackPoint[] = [
        { lat: 0, lon: 0, utc: 1000, sog: 5, cog: 45 },  // Starboard upwind
        { lat: 0, lon: 0.1, utc: 2000, sog: 6, cog: 315 }, // Port upwind (tack)
        { lat: 0, lon: 0.2, utc: 3000, sog: 7, cog: 135 }, // Port downwind (bear away)
        { lat: 0, lon: 0.3, utc: 4000, sog: 6, cog: 225 }  // Starboard downwind (gybe)
      ];

      const result = await DataProcessor.processTrackData(trackPoints, sampleMetadata, {
        windOptions: { fixedTwd: 0 }
      });

      // Should detect multiple manoeuvres
      expect(result.manoeuvres.length).toBeGreaterThan(0);
      
      // Verify manoeuvre analysis is included in summary
      expect(result.summary.tackCount).toBeGreaterThanOrEqual(0);
      expect(result.summary.gybeCount).toBeGreaterThanOrEqual(0);
    });
  });
});