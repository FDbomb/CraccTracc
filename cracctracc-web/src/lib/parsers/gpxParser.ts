/* eslint-disable @typescript-eslint/no-explicit-any */
import { XMLParser } from 'fast-xml-parser';
import { TrackPoint, ProcessingResult, FileMetadata } from '../types/sailing';
import { sanitizeTrackPoint } from '../types/guards';

export class GPXParser {
  private static readonly METERS_PER_SECOND_TO_KNOTS = 1.943844;
  private xmlParser: XMLParser;

  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true,
      parseTagValue: true,
    });
  }

  async parseGPXFile(file: File): Promise<ProcessingResult<{
    trackPoints: TrackPoint[];
    metadata: FileMetadata;
  }>> {
    try {
      const text = await file.text();
      const gpxData = this.xmlParser.parse(text);
      
      if (!gpxData.gpx) {
        return {
          success: false,
          error: { code: 'INVALID_GPX', message: 'Invalid GPX file format' }
        };
      }

      const trackPoints = this.extractTrackPoints(gpxData);
      const metadata = this.createMetadata(file, trackPoints);

      return {
        success: true,
        data: { trackPoints, metadata }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown parsing error'
        }
      };
    }
  }

  private extractTrackPoints(gpxData: any): TrackPoint[] {
    const tracks = gpxData.gpx.trk;
    if (!tracks) return [];

    const trackArray = Array.isArray(tracks) ? tracks : [tracks];
    const trackPoints: TrackPoint[] = [];

    for (const track of trackArray) {
      const segments = track.trkseg;
      if (!segments) continue;

      const segmentArray = Array.isArray(segments) ? segments : [segments];

      for (const segment of segmentArray) {
        const points = segment.trkpt;
        if (!points) continue;

        const pointArray = Array.isArray(points) ? points : [points];

        for (const point of pointArray) {
          const trackPoint = this.convertGPXPoint(point);
          if (trackPoint) {
            trackPoints.push(trackPoint);
          }
        }
      }
    }

    return trackPoints;
  }

  private convertGPXPoint(gpxPoint: any): TrackPoint | null {
    try {
      const lat = parseFloat(gpxPoint['@_lat']);
      const lon = parseFloat(gpxPoint['@_lon']);
      
      if (isNaN(lat) || isNaN(lon)) return null;

      // Parse timestamp
      const timeStr = gpxPoint.time;
      if (!timeStr) {
        console.warn('GPX track point missing timestamp, skipping point');
        return null;
      }
      const utc = new Date(timeStr).getTime();

      // Extract extensions for speed and course
      const extensions = gpxPoint.extensions;
      let sog = 0;
      let cog = 0;

      if (extensions) {
        // Different GPS devices use different extension formats
        // Handle common formats from Garmin, Suunto, etc.
        if (extensions.speed !== undefined) {
          sog = parseFloat(extensions.speed) * GPXParser.METERS_PER_SECOND_TO_KNOTS;
        }
        if (extensions.course !== undefined) {
          cog = parseFloat(extensions.course);
        }
        
        // Handle nested extension formats (Garmin TPX)
        if (extensions.gpxtpx) {
          if (extensions.gpxtpx.speed) {
            sog = parseFloat(extensions.gpxtpx.speed) * GPXParser.METERS_PER_SECOND_TO_KNOTS;
          }
          if (extensions.gpxtpx.course) {
            cog = parseFloat(extensions.gpxtpx.course);
          }
        }

        // Handle other common extension formats
        if (extensions['garmin:TrackPointExtension']) {
          const garmin = extensions['garmin:TrackPointExtension'];
          if (garmin.speed) {
            sog = parseFloat(garmin.speed) * GPXParser.METERS_PER_SECOND_TO_KNOTS;
          }
          if (garmin.course) {
            cog = parseFloat(garmin.course);
          }
        }
      }

      const rawPoint = {
        utc,
        lat,
        lon,
        cog,
        sog,
        alt: gpxPoint.ele ? parseFloat(gpxPoint.ele) : undefined
      };

      // Use type guard to validate and sanitize the point
      return sanitizeTrackPoint(rawPoint);
    } catch (error) {
      console.warn('Failed to parse GPX point:', error);
      return null;
    }
  }

  private createMetadata(file: File, trackPoints: TrackPoint[]): FileMetadata {
    return {
      filename: file.name,
      fileType: 'gpx',
      fileSize: file.size,
      trackPointCount: trackPoints.length,
      startTime: trackPoints.length > 0 ? trackPoints[0].utc : 0,
      endTime: trackPoints.length > 0 ? trackPoints[trackPoints.length - 1].utc : 0
    };
  }
}
