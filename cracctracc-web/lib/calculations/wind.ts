import {
  TrackPoint,
  ProcessedTrackPoint,
  WindData,
  PointOfSail,
  Tack,
} from '../types/sailing';
import { WeatherResponse } from '@/app/api/weather/route';

// Constants
// const METERS_PER_SECOND_TO_KNOTS = 1.943844; // TODO: Use for future wind speed conversions

export class WindCalculations {
  /**
   * Convert heading to True Wind Angle (TWA) given True Wind Direction (TWD)
   * Ported from Python hdg2twa function
   */
  static calculateTWA(heading: number, twd: number): number {
    // Convert heading to 0-360 range exactly as in Python
    const hdg = heading < 0 ? 360 - Math.abs(heading) : heading;

    // Center the heading to the wind angle
    let twa = hdg - twd;

    // Normalize to -180 to 180 range exactly as in Python
    if (twa > 180) {
      twa = -180 + Math.abs(180 - twa);
    } else if (twa <= -180) {
      twa = 180 - Math.abs(180 + twa);
    }

    return Math.round(twa);
  }

  /**
   * Add True Wind Direction (TWD) to track points
   * Can use fixed wind direction or fetch from weather API
   */
  static async addWindData(
    trackPoints: TrackPoint[],
    options: {
      fixedTwd?: number;
      useWeatherAPI?: boolean;
      date?: string;
    } = {}
  ): Promise<ProcessedTrackPoint[]> {
    if (options.fixedTwd !== undefined) {
      return this.addFixedWind(trackPoints, options.fixedTwd);
    }

    if (options.useWeatherAPI && options.date) {
      return await this.addWeatherAPIWind(trackPoints, options.date);
    }

    // Default to fixed wind direction of 0 degrees
    return this.addFixedWind(trackPoints, 0);
  }

  /**
   * Add fixed wind direction to all track points
   */
  private static addFixedWind(
    trackPoints: TrackPoint[],
    twd: number
  ): ProcessedTrackPoint[] {
    return trackPoints.map((point) => ({
      ...point,
      twd,
      tws: 10, // Default wind speed
      twa: this.calculateTWA(point.cog, twd),
      pos: this.calculatePointOfSail(this.calculateTWA(point.cog, twd)),
      tack: this.calculateTack(this.calculateTWA(point.cog, twd)),
    }));
  }

  /**
   * Fetch wind data from weather API and interpolate for track points
   */
  private static async addWeatherAPIWind(
    trackPoints: TrackPoint[],
    date: string
  ): Promise<ProcessedTrackPoint[]> {
    if (trackPoints.length === 0) return [];

    try {
      // Use the first track point's location for the weather query
      const { lat, lon } = trackPoints[0];
      const windData = await this.fetchWindData(date, lat, lon);
      return this.interpolateWindData(trackPoints, windData);
    } catch (error) {
      console.warn('Failed to fetch wind data, using fixed wind:', error);
      return this.addFixedWind(trackPoints, 0);
    }
  }

  /**
   * Fetch wind data from weather API
   */
  static async fetchWindData(
    date: string,
    lat: number,
    lon: number
  ): Promise<WindData[]> {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/weather`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat,
          lon,
          timestamp: new Date(date).getTime(),
        }),
      });
      if (!response.ok) {
        throw new Error(
          `Weather API request failed with status ${response.status}`
        );
      }
      const data: WeatherResponse = await response.json();
      // Assuming the API returns a single data point for now
      return [
        {
          timestamp: data.data?.timestamp || new Date(date).getTime(),
          speed: data.data?.windSpeed || 10, // m/s
          direction: data.data?.windDirection || 180, // degrees
        },
      ];
    } catch (error) {
      console.error('Error fetching wind data:', error);
      // Fallback to default values if API fails
      return [
        {
          timestamp: new Date(date).getTime(),
          speed: 10,
          direction: 180,
        },
      ];
    }
  }

  /**
   * Interpolate wind data for each track point
   * Ported from Python angular_interpolation function
   */
  private static interpolateWindData(
    trackPoints: TrackPoint[],
    windData: WindData[]
  ): ProcessedTrackPoint[] {
    return trackPoints.map((point) => {
      const { speed, direction } = this.interpolateWindAtTime(
        point.utc,
        windData
      );
      const twa = this.calculateTWA(point.cog, direction);

      return {
        ...point,
        twd: direction,
        tws: speed,
        twa,
        pos: this.calculatePointOfSail(twa),
        tack: this.calculateTack(twa),
      };
    });
  }

  /**
   * Interpolate wind speed and direction at a specific timestamp
   */
  private static interpolateWindAtTime(
    timestamp: number,
    windData: WindData[]
  ): {
    speed: number;
    direction: number;
  } {
    if (windData.length === 0) {
      return { speed: 10, direction: 0 };
    }
    if (windData.length === 1) {
      return { speed: windData[0].speed, direction: windData[0].direction };
    }

    // Find the two wind data points that bracket the timestamp
    let before = windData[0];
    let after = windData[windData.length - 1];

    for (let i = 0; i < windData.length - 1; i++) {
      if (
        windData[i].timestamp <= timestamp &&
        windData[i + 1].timestamp >= timestamp
      ) {
        before = windData[i];
        after = windData[i + 1];
        break;
      }
    }

    // Linear interpolation for wind speed
    const timeDiff = after.timestamp - before.timestamp;
    const timeRatio =
      timeDiff === 0 ? 0 : (timestamp - before.timestamp) / timeDiff;
    const speed = before.speed + (after.speed - before.speed) * timeRatio;

    // Angular interpolation for wind direction
    const direction = this.interpolateAngle(
      before.direction,
      after.direction,
      timeRatio
    );

    return {
      speed: Math.round(speed * 10) / 10,
      direction: Math.round(direction),
    };
  }

  /**
   * Interpolate between two angles, handling wrap-around
   * Based on Python angular_interpolation function
   */
  private static interpolateAngle(
    angle1: number,
    angle2: number,
    ratio: number
  ): number {
    // Unwrap the angle difference to handle 0/360 boundary
    const diff = ((angle2 - angle1 + 540) % 360) - 180;
    return (angle1 + diff * ratio + 360) % 360;
  }

  /**
   * Calculate point of sail based on True Wind Angle
   * Ported from Python apply_PoS function
   */
  private static calculatePointOfSail(twa: number): PointOfSail {
    const absTwa = Math.abs(twa);

    if (absTwa <= 30) return PointOfSail.HeadToWind;
    if (absTwa <= 60) return PointOfSail.Upwind;
    if (absTwa <= 95) return PointOfSail.Reach;
    return PointOfSail.Downwind;
  }

  /**
   * Calculate tack (Port/Starboard) based on True Wind Angle
   * Ported from Python apply_PoS function
   */
  private static calculateTack(twa: number): Tack {
    return twa < 0 ? Tack.Port : Tack.Starboard;
  }
}
