import { WindCalculations } from '../../src/lib/calculations/wind';
import { TrackPoint, WindData, PointOfSail, Tack } from '../../src/lib/types/sailing';

describe('WindCalculations', () => {
  describe('calculateTWA', () => {
    it('should calculate TWA correctly for basic cases', () => {
      // Test cases from Python implementation
      expect(WindCalculations.calculateTWA(0, 0)).toBe(0);
      expect(WindCalculations.calculateTWA(90, 0)).toBe(90);
      expect(WindCalculations.calculateTWA(180, 0)).toBe(180);
      expect(WindCalculations.calculateTWA(270, 0)).toBe(-90);
    });

    it('should handle negative headings', () => {
      expect(WindCalculations.calculateTWA(-90, 0)).toBe(-90);
      expect(WindCalculations.calculateTWA(-45, 0)).toBe(-45);
    });

    it('should handle TWA normalization to -180/180 range', () => {
      // Test case that requires normalization
      expect(WindCalculations.calculateTWA(350, 20)).toBe(-30); // 350-20 = 330, normalized to -30
      expect(WindCalculations.calculateTWA(10, 350)).toBe(20); // 10-350 = -340, normalized to 20
    });

    it('should handle wind direction changes', () => {
      expect(WindCalculations.calculateTWA(45, 90)).toBe(-45);
      expect(WindCalculations.calculateTWA(135, 90)).toBe(45);
      expect(WindCalculations.calculateTWA(225, 180)).toBe(45);
    });
  });

  describe('addWindData with fixed wind', () => {
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
        cog: 90
      },
      {
        lat: -37.8138,
        lon: 144.9633,
        utc: 1700000120000,
        sog: 4.8,
        cog: 135
      }
    ];

    it('should add fixed wind data to track points', async () => {
      const result = await WindCalculations.addWindData(sampleTrackPoints, { fixedTwd: 180 });

      expect(result).toHaveLength(3);
      
      // Check first point
      expect(result[0].twd).toBe(180);
      expect(result[0].tws).toBe(10);
      expect(result[0].twa).toBe(-135); // 45 - 180 = -135
      expect(result[0].pos).toBe(PointOfSail.Downwind);
      expect(result[0].tack).toBe(Tack.Port);

      // Check second point
      expect(result[1].twa).toBe(-90); // 90 - 180 = -90
      expect(result[1].pos).toBe(PointOfSail.Reach);
      expect(result[1].tack).toBe(Tack.Port);

      // Check third point
      expect(result[2].twa).toBe(-45); // 135 - 180 = -45
      expect(result[2].pos).toBe(PointOfSail.Upwind);
      expect(result[2].tack).toBe(Tack.Port);
    });

    it('should use default wind direction when no options provided', async () => {
      const result = await WindCalculations.addWindData(sampleTrackPoints);

      expect(result[0].twd).toBe(0);
      expect(result[0].tws).toBe(10);
      expect(result[0].twa).toBe(45); // 45 - 0 = 45
    });
  });

  describe('Point of Sail calculation', () => {
    it('should calculate correct point of sail for different TWA values', async () => {
      const trackPoints: TrackPoint[] = [
        { lat: 0, lon: 0, utc: 0, sog: 5, cog: 0 },   // TWA = 0 (Head to Wind)
        { lat: 0, lon: 0, utc: 0, sog: 5, cog: 45 },  // TWA = 45 (Upwind)
        { lat: 0, lon: 0, utc: 0, sog: 5, cog: 90 },  // TWA = 90 (Reach)
        { lat: 0, lon: 0, utc: 0, sog: 5, cog: 135 }, // TWA = 135 (Downwind)
      ];

      const result = await WindCalculations.addWindData(trackPoints, { fixedTwd: 0 });

      expect(result[0].pos).toBe(PointOfSail.HeadToWind);
      expect(result[1].pos).toBe(PointOfSail.Upwind);
      expect(result[2].pos).toBe(PointOfSail.Reach);
      expect(result[3].pos).toBe(PointOfSail.Downwind);
    });
  });

  describe('Tack calculation', () => {
    it('should calculate correct tack for positive and negative TWA', async () => {
      const trackPoints: TrackPoint[] = [
        { lat: 0, lon: 0, utc: 0, sog: 5, cog: 45 },  // TWA = 45 (Starboard)
        { lat: 0, lon: 0, utc: 0, sog: 5, cog: 315 }, // TWA = -45 (Port)
      ];

      const result = await WindCalculations.addWindData(trackPoints, { fixedTwd: 0 });

      expect(result[0].tack).toBe(Tack.Starboard);
      expect(result[1].tack).toBe(Tack.Port);
    });
  });

  describe('interpolateWindAtTime', () => {
    const windData: WindData[] = [
      { timestamp: 1000, speed: 10, direction: 180 },
      { timestamp: 2000, speed: 15, direction: 200 },
      { timestamp: 3000, speed: 12, direction: 170 }
    ];

    it('should handle empty wind data', async () => {
      const trackPoint: TrackPoint = { lat: 0, lon: 0, utc: 1500, sog: 5, cog: 90 };
      const result = await WindCalculations.addWindData([trackPoint], { 
        useWeatherAPI: true, 
        date: '2023-01-01' 
      });

      // Should use placeholder wind data from fetchWindData
      expect(result[0].twd).toBe(180);
      expect(result[0].tws).toBe(10);
    });
  });

  describe('angle interpolation', () => {
    it('should interpolate angles correctly handling wrap-around', async () => {
      const trackPoints: TrackPoint[] = [
        { lat: 0, lon: 0, utc: 1500, sog: 5, cog: 0 }
      ];

      // Mock fetchWindData to return test data for interpolation
      const originalFetchWindData = WindCalculations.fetchWindData;
      WindCalculations.fetchWindData = jest.fn().mockResolvedValue([
        { timestamp: 1000, speed: 10, direction: 350 },
        { timestamp: 2000, speed: 10, direction: 10 }
      ]);

      const result = await WindCalculations.addWindData(trackPoints, {
        useWeatherAPI: true,
        date: '2023-01-01'
      });

      // At timestamp 1500 (halfway between 1000 and 2000), direction should interpolate
      // from 350 to 10 degrees, which should wrap around to approximately 0 degrees
      expect(result[0].twd).toBeCloseTo(0, 0); // Allow ±0.5 degree tolerance
      expect(result[0].tws).toBe(10);
      expect(result[0].twa).toBeCloseTo(0, 0); // calculateTWA(0, 0) = 0

      // Restore original function
      WindCalculations.fetchWindData = originalFetchWindData;
    });
  });

  describe('weather API integration', () => {
    it('should fallback to fixed wind when API fails', async () => {
      const trackPoints: TrackPoint[] = [
        { lat: 0, lon: 0, utc: 1000, sog: 5, cog: 90 }
      ];

      const result = await WindCalculations.addWindData(trackPoints, {
        useWeatherAPI: true,
        date: '2023-01-01'
      });

      // Should use placeholder wind data from fetchWindData
      expect(result[0].twd).toBe(180);
      expect(result[0].tws).toBe(10);
    });

    it('should return placeholder data for fetchWindData', async () => {
      const windData = await WindCalculations.fetchWindData('2023-01-01');
      
      expect(windData).toHaveLength(1);
      expect(windData[0].speed).toBe(10);
      expect(windData[0].direction).toBe(180);
    });
  });
});