import {
  isTrackPoint,
  isProcessedTrackPoint,
  isValidManoeuvreType,
  isValidPointOfSail,
  isValidTack,
  sanitizeTrackPoint,
  isValidLatitude,
  isValidLongitude,
  isValidSpeed,
  isValidCourse,
  isValidTimestamp,
} from '../guards';
import { ManoeuvreType, PointOfSail, Tack } from '../sailing';

describe('Type Guards', () => {
  describe('isTrackPoint', () => {
    it('should validate a valid TrackPoint', () => {
      const validPoint = {
        utc: 1640995200000,
        lat: 37.7749,
        lon: -122.4194,
        cog: 180,
        sog: 5.5,
      };
      expect(isTrackPoint(validPoint)).toBe(true);
    });

    it('should reject invalid TrackPoint', () => {
      expect(isTrackPoint(null)).toBe(false);
      expect(isTrackPoint({})).toBe(false);
      expect(isTrackPoint({ lat: 37.7749 })).toBe(false);
      expect(isTrackPoint({ lat: 'invalid', lon: -122.4194, cog: 180, sog: 5.5, utc: 1640995200000 })).toBe(false);
    });

    it('should validate optional fields', () => {
      const pointWithOptionals = {
        utc: 1640995200000,
        lat: 37.7749,
        lon: -122.4194,
        cog: 180,
        sog: 5.5,
        hdg: 175,
        alt: 10,
        roll: 2.5,
        pitch: -1.2,
      };
      expect(isTrackPoint(pointWithOptionals)).toBe(true);
    });
  });

  describe('isProcessedTrackPoint', () => {
    it('should validate a valid ProcessedTrackPoint', () => {
      const validProcessedPoint = {
        utc: 1640995200000,
        lat: 37.7749,
        lon: -122.4194,
        cog: 180,
        sog: 5.5,
        twd: 270,
        tws: 10,
        twa: -90,
        pos: PointOfSail.Reach,
        tack: Tack.Port,
      };
      expect(isProcessedTrackPoint(validProcessedPoint)).toBe(true);
    });

    it('should validate with optional manoeuvre', () => {
      const pointWithManoeuvre = {
        utc: 1640995200000,
        lat: 37.7749,
        lon: -122.4194,
        cog: 180,
        sog: 5.5,
        twd: 270,
        tws: 10,
        twa: -90,
        pos: PointOfSail.Reach,
        tack: Tack.Port,
        manoeuvre: ManoeuvreType.Tack,
      };
      expect(isProcessedTrackPoint(pointWithManoeuvre)).toBe(true);
    });
  });

  describe('Enum validators', () => {
    it('should validate ManoeuvreType', () => {
      expect(isValidManoeuvreType('tack')).toBe(true);
      expect(isValidManoeuvreType('gybe')).toBe(true);
      expect(isValidManoeuvreType('invalid')).toBe(false);
    });

    it('should validate PointOfSail', () => {
      expect(isValidPointOfSail('Upwind')).toBe(true);
      expect(isValidPointOfSail('Reach')).toBe(true);
      expect(isValidPointOfSail('invalid')).toBe(false);
    });

    it('should validate Tack', () => {
      expect(isValidTack('Port')).toBe(true);
      expect(isValidTack('Starboard')).toBe(true);
      expect(isValidTack('invalid')).toBe(false);
    });
  });

  describe('Value validators', () => {
    it('should validate latitude', () => {
      expect(isValidLatitude(0)).toBe(true);
      expect(isValidLatitude(90)).toBe(true);
      expect(isValidLatitude(-90)).toBe(true);
      expect(isValidLatitude(91)).toBe(false);
      expect(isValidLatitude(-91)).toBe(false);
    });

    it('should validate longitude', () => {
      expect(isValidLongitude(0)).toBe(true);
      expect(isValidLongitude(180)).toBe(true);
      expect(isValidLongitude(-180)).toBe(true);
      expect(isValidLongitude(181)).toBe(false);
      expect(isValidLongitude(-181)).toBe(false);
    });

    it('should validate speed', () => {
      expect(isValidSpeed(0)).toBe(true);
      expect(isValidSpeed(50)).toBe(true);
      expect(isValidSpeed(100)).toBe(true);
      expect(isValidSpeed(-1)).toBe(false);
      expect(isValidSpeed(101)).toBe(false);
    });

    it('should validate course', () => {
      expect(isValidCourse(0)).toBe(true);
      expect(isValidCourse(180)).toBe(true);
      expect(isValidCourse(359)).toBe(true);
      expect(isValidCourse(360)).toBe(false);
      expect(isValidCourse(-1)).toBe(false);
    });

    it('should validate timestamp', () => {
      expect(isValidTimestamp(1640995200000)).toBe(true);
      expect(isValidTimestamp(0)).toBe(false);
      expect(isValidTimestamp(-1)).toBe(false);
    });
  });

  describe('sanitizeTrackPoint', () => {
    it('should sanitize valid data', () => {
      const input = {
        lat: '37.7749',
        lon: '-122.4194',
        cog: '180',
        sog: '5.5',
        utc: 1640995200000,
      };
      const result = sanitizeTrackPoint(input);
      expect(result).toEqual({
        lat: 37.7749,
        lon: -122.4194,
        cog: 180,
        sog: 5.5,
        utc: 1640995200000,
      });
    });

    it('should return null for invalid data', () => {
      expect(sanitizeTrackPoint(null)).toBe(null);
      expect(sanitizeTrackPoint({ lat: 'invalid' })).toBe(null);
      expect(sanitizeTrackPoint({ lat: 91, lon: 0, cog: 0, sog: 0, utc: 1640995200000 })).toBe(null);
    });

    it('should handle optional fields', () => {
      const input = {
        lat: '37.7749',
        lon: '-122.4194',
        cog: '180',
        sog: '5.5',
        utc: 1640995200000,
        hdg: '175',
        alt: '10',
      };
      const result = sanitizeTrackPoint(input);
      expect(result?.hdg).toBe(175);
      expect(result?.alt).toBe(10);
    });
  });
});