// Base track point from GPX/VKX files
export interface TrackPoint {
  utc: number; // Unix timestamp in milliseconds
  lat: number; // Latitude in decimal degrees
  lon: number; // Longitude in decimal degrees
  cog: number; // Course over ground (degrees 0-360)
  sog: number; // Speed over ground (knots)
  hdg?: number; // Heading (degrees) - VKX only
  alt?: number; // Altitude in meters - optional
  roll?: number; // Roll angle (degrees) - VKX only
  pitch?: number; // Pitch angle (degrees) - VKX only
}

// Enhanced track point with calculated sailing data
export interface ProcessedTrackPoint extends TrackPoint {
  twd: number; // True wind direction (degrees)
  tws: number; // True wind speed (knots)
  twa: number; // True wind angle (degrees)
  pos: PointOfSail; // Point of sail classification
  tack: Tack; // Port/Starboard tack
  manoeuvre?: ManoeuvreType; // Detected manoeuvre
}

export enum PointOfSail {
  HeadToWind = 'Head to Wind',
  Upwind = 'Upwind',
  Reach = 'Reach',
  Downwind = 'Downwind',
}

export enum Tack {
  Port = 'Port',
  Starboard = 'Starboard',
}

export enum ManoeuvreType {
  Tack = 'tack',
  Gybe = 'gybe',
  RoundUp = 'roundup',
  BearAway = 'bearaway',
}

export interface ManoeuvreEvent {
  id: string;
  type: ManoeuvreType;
  timestamp: number;
  duration?: number;
  startTwa: number;
  endTwa: number;
}

export interface WindData {
  timestamp: number; // Unix timestamp in milliseconds
  speed: number; // Wind speed in knots
  direction: number; // Wind direction in degrees
}

export interface SailingAnalysis {
  trackPoints: ProcessedTrackPoint[];
  manoeuvres: ManoeuvreEvent[];
  summary: AnalysisSummary;
  metadata: FileMetadata;
}

export interface AnalysisSummary {
  totalDistance: number; // Nautical miles
  totalTime: number; // Minutes
  averageSpeed: number; // Knots
  maxSpeed: number; // Knots
  tackCount: number;
  gybeCount: number;
  averageTwa: number; // Degrees
}

export interface FileMetadata {
  filename: string;
  fileType: 'gpx' | 'vkx';
  fileSize: number; // Bytes
  trackPointCount: number;
  startTime: number; // Unix timestamp
  endTime: number; // Unix timestamp
}

// Error handling
export interface ParseError {
  code: string;
  message: string;
  line?: number;
}

export interface ProcessingResult<T> {
  success: boolean;
  data?: T;
  error?: ParseError;
}
