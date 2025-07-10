/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  TrackPoint,
  ProcessedTrackPoint,
  ManoeuvreType,
  PointOfSail,
  Tack,
} from './sailing';

export function isTrackPoint(obj: any): obj is TrackPoint {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.utc === 'number' &&
    typeof obj.lat === 'number' &&
    typeof obj.lon === 'number' &&
    typeof obj.cog === 'number' &&
    typeof obj.sog === 'number' &&
    (obj.hdg === undefined || typeof obj.hdg === 'number') &&
    (obj.alt === undefined || typeof obj.alt === 'number') &&
    (obj.roll === undefined || typeof obj.roll === 'number') &&
    (obj.pitch === undefined || typeof obj.pitch === 'number')
  );
}

export function isProcessedTrackPoint(obj: any): obj is ProcessedTrackPoint {
  return (
    isTrackPoint(obj) &&
    typeof (obj as any).twd === 'number' &&
    typeof (obj as any).tws === 'number' &&
    typeof (obj as any).twa === 'number' &&
    isValidPointOfSail((obj as any).pos) &&
    isValidTack((obj as any).tack) &&
    ((obj as any).manoeuvre === undefined ||
      isValidManoeuvreType((obj as any).manoeuvre))
  );
}

export function isValidManoeuvreType(value: string): value is ManoeuvreType {
  return Object.values(ManoeuvreType).includes(value as ManoeuvreType);
}

export function isValidPointOfSail(value: string): value is PointOfSail {
  return Object.values(PointOfSail).includes(value as PointOfSail);
}

export function isValidTack(value: string): value is Tack {
  return Object.values(Tack).includes(value as Tack);
}

export function validateTrackPointArray(data: any[]): data is TrackPoint[] {
  return Array.isArray(data) && data.every(isTrackPoint);
}

export function validateProcessedTrackPointArray(
  data: any[]
): data is ProcessedTrackPoint[] {
  return Array.isArray(data) && data.every(isProcessedTrackPoint);
}

export function isValidLatitude(lat: number): boolean {
  return typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90;
}

export function isValidLongitude(lon: number): boolean {
  return typeof lon === 'number' && !isNaN(lon) && lon >= -180 && lon <= 180;
}

export function isValidSpeed(speed: number): boolean {
  return (
    typeof speed === 'number' && !isNaN(speed) && speed >= 0 && speed <= 100
  ); // max 100 knots
}

export function isValidCourse(course: number): boolean {
  return (
    typeof course === 'number' && !isNaN(course) && course >= 0 && course < 360
  );
}

export function isValidTimestamp(timestamp: number): boolean {
  return typeof timestamp === 'number' && !isNaN(timestamp) && timestamp > 0;
}

/**
 * Validates a complete TrackPoint with bounds checking
 */
export function validateTrackPoint(point: any): point is TrackPoint {
  if (!isTrackPoint(point)) {
    return false;
  }

  return (
    isValidLatitude(point.lat) &&
    isValidLongitude(point.lon) &&
    isValidSpeed(point.sog) &&
    isValidCourse(point.cog) &&
    isValidTimestamp(point.utc)
  );
}

/**
 * Sanitizes and validates track point data
 * Returns null if the point is invalid
 */
export function sanitizeTrackPoint(obj: any): TrackPoint | null {
  if (!obj || typeof obj !== 'object') {
    return null;
  }

  try {
    const lat = parseFloat(obj.lat);
    const lon = parseFloat(obj.lon);
    const cog = parseFloat(obj.cog);
    const sog = parseFloat(obj.sog);
    const utc =
      typeof obj.utc === 'number' ? obj.utc : new Date(obj.utc).getTime();

    if (
      !isValidLatitude(lat) ||
      !isValidLongitude(lon) ||
      !isValidSpeed(sog) ||
      !isValidCourse(cog) ||
      !isValidTimestamp(utc)
    ) {
      return null;
    }

    const point: TrackPoint = {
      lat,
      lon,
      cog,
      sog,
      utc,
    };

    // Add optional fields if present and valid
    if (obj.hdg !== undefined && !isNaN(parseFloat(obj.hdg))) {
      point.hdg = parseFloat(obj.hdg);
    }
    if (obj.alt !== undefined && !isNaN(parseFloat(obj.alt))) {
      point.alt = parseFloat(obj.alt);
    }
    if (obj.roll !== undefined && !isNaN(parseFloat(obj.roll))) {
      point.roll = parseFloat(obj.roll);
    }
    if (obj.pitch !== undefined && !isNaN(parseFloat(obj.pitch))) {
      point.pitch = parseFloat(obj.pitch);
    }

    return point;
  } catch {
    // Return null if any parsing fails
    return null;
  }
}
