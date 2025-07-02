/* eslint-disable @typescript-eslint/no-explicit-any */
import { TrackPoint, ProcessingResult, FileMetadata } from '../types/sailing';
import { sanitizeTrackPoint } from '../types/guards';

export class VKXParser {
  // VKX format structure based on Python vkx_parser.py
  private readonly ROW_KEY_SIZE = 1;
  private readonly formatStructures = {
    0xFF: { size: 7, description: 'Page Header' },
    0xFE: { size: 2, description: 'Page Terminator' },
    0x02: { size: 44, description: 'Position, Velocity, and Orientation' }, // Q(8)+i(4)+i(4)+7*f(4) = 44 bytes
    0x03: { size: 20, description: 'Declination' }, // Q(8)+f(4)+i(4)+i(4) = 20 bytes
    0x04: { size: 13, description: 'Race Timer Event' },
    0x05: { size: 17, description: 'Line Position' },
    0x06: { size: 18, description: 'Shift Angle' },
    0x08: { size: 13, description: 'Device Configuration' },
    0x0A: { size: 16, description: 'Wind Data' },
    0x01: { size: 32, description: 'Internal Message' },
    0x07: { size: 12, description: 'Internal Message' },
    0x0E: { size: 16, description: 'Internal Message' },
    0x20: { size: 13, description: 'Internal Message' },
  };

  async parseVKXFile(file: File): Promise<ProcessingResult<{
    trackPoints: TrackPoint[];
    metadata: FileMetadata;
    courseData?: any;
  }>> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const dataView = new DataView(arrayBuffer);
      
      const result = this.parseVKXBinary(dataView);
      const metadata = this.createMetadata(file, result.trackPoints);

      return {
        success: true,
        data: {
          trackPoints: result.trackPoints,
          metadata,
          courseData: result.courseData
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VKX_PARSE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown VKX parsing error'
        }
      };
    }
  }

  private parseVKXBinary(dataView: DataView): {
    trackPoints: TrackPoint[];
    courseData?: any;
  } {
    const trackPoints: TrackPoint[] = [];
    const courseData: { [key: number]: any[] } = {};
    let offset = 0;

    try {
      while (offset < dataView.byteLength) {
        // Read row key (1 byte)
        if (offset + this.ROW_KEY_SIZE > dataView.byteLength) break;
        
        const rowKey = dataView.getUint8(offset);
        offset += this.ROW_KEY_SIZE;

        const format = this.formatStructures[rowKey as keyof typeof this.formatStructures];
        
        if (!format) {
          console.warn(`Unrecognized VKX row key: 0x${rowKey.toString(16)}`);
          // Try to continue parsing by skipping this byte
          continue;
        }

        // Check if we have enough bytes for this packet
        if (offset + format.size > dataView.byteLength) {
          console.warn(`Not enough data for packet 0x${rowKey.toString(16)}`);
          break;
        }

        // Parse based on row key
        if (rowKey === 0x02) {
          // Position, Velocity, and Orientation packet
          const trackPoint = this.parsePositionPacket(dataView, offset);
          if (trackPoint) {
            trackPoints.push(trackPoint);
          }
        } else if ([0x04, 0x05, 0x06, 0x0A].includes(rowKey)) {
          // Course-related data (Race Timer, Line Position, Shift Angle, Wind Data)
          const courseDataPoint = this.parseCourseDataPacket(dataView, offset, rowKey);
          if (courseDataPoint) {
            if (!courseData[rowKey]) {
              courseData[rowKey] = [];
            }
            courseData[rowKey].push(courseDataPoint);
          }
        }
        // For other packet types, just skip them for now

        offset += format.size;
      }
    } catch (error) {
      console.warn('Error parsing VKX binary data:', error);
    }

    return {
      trackPoints,
      courseData: Object.keys(courseData).length > 0 ? courseData : undefined
    };
  }

  private parsePositionPacket(dataView: DataView, offset: number): TrackPoint | null {
    try {
      // Structure: <Qii7f> = UTC(8), lat(4), lon(4), sog(4), cog(4), alt(4), Q_w(4), Q_x(4), Q_y(4), Q_z(4)
      const utc = Number(dataView.getBigUint64(offset, true)); // little-endian
      const lat = dataView.getInt32(offset + 8, true) / 1e7; // Convert from int to degrees
      const lon = dataView.getInt32(offset + 12, true) / 1e7; // Convert from int to degrees
      const sog = dataView.getFloat32(offset + 16, true);
      const cog = dataView.getFloat32(offset + 20, true);
      const alt = dataView.getFloat32(offset + 24, true);
      
      // Quaternions for orientation (we'll calculate heading from these)
      const qw = dataView.getFloat32(offset + 28, true);
      const qx = dataView.getFloat32(offset + 32, true);
      const qy = dataView.getFloat32(offset + 36, true);
      const qz = dataView.getFloat32(offset + 40, true);

      // Convert quaternions to Euler angles (roll, pitch, heading)
      const [roll, pitch, hdg] = this.quaternionToEuler(qw, qx, qy, qz);

      // Convert COG from radians to degrees
      const cogDegrees = (cog * 180) / Math.PI;

      const rawPoint = {
        utc: utc / 1000, // Convert from microseconds to milliseconds
        lat,
        lon,
        cog: cogDegrees,
        sog,
        hdg,
        alt,
        roll,
        pitch
      };

      return sanitizeTrackPoint(rawPoint);
    } catch (error) {
      console.warn('Failed to parse VKX position packet:', error);
      return null;
    }
  }

  private parseCourseDataPacket(dataView: DataView, offset: number, rowKey: number): any {
    try {
      switch (rowKey) {
        case 0x04: // Race Timer Event
          return {
            timestamp: Number(dataView.getBigUint64(offset, true)) / 1000,
            event: dataView.getUint8(offset + 8),
            value: dataView.getInt32(offset + 9, true)
          };
        case 0x05: // Line Position
          return {
            timestamp: Number(dataView.getBigUint64(offset, true)) / 1000,
            line: dataView.getUint8(offset + 8),
            lat: dataView.getInt32(offset + 9, true) / 1e7,
            lon: dataView.getInt32(offset + 13, true) / 1e7
          };
        case 0x06: // Shift Angle
          return {
            timestamp: Number(dataView.getBigUint64(offset, true)) / 1000,
            type: dataView.getUint8(offset + 8),
            angle: dataView.getUint8(offset + 9),
            value1: dataView.getFloat32(offset + 10, true),
            value2: dataView.getFloat32(offset + 14, true)
          };
        case 0x0A: // Wind Data
          return {
            timestamp: Number(dataView.getBigUint64(offset, true)) / 1000,
            windSpeed: dataView.getFloat32(offset + 8, true),
            windDirection: dataView.getFloat32(offset + 12, true)
          };
        default:
          return null;
      }
    } catch (error) {
      console.warn(`Failed to parse VKX course data packet 0x${rowKey.toString(16)}:`, error);
      return null;
    }
  }

  private quaternionToEuler(w: number, x: number, y: number, z: number): [number, number, number] {
    // Convert quaternions to Euler angles (roll, pitch, yaw)
    // Based on the Python implementation in vkx_parser.py
    
    // Roll (x-axis rotation)
    const sinrCosp = 2.0 * (w * x + y * z);
    const cosrCosp = 1.0 - 2.0 * (x * x + y * y);
    const roll = Math.atan2(sinrCosp, cosrCosp);

    // Pitch (y-axis rotation)
    let sinp = 2.0 * (w * y - z * x);
    sinp = Math.max(-1.0, Math.min(1.0, sinp)); // Clamp to [-1, 1]
    const pitch = Math.asin(sinp);

    // Yaw (z-axis rotation) - this becomes our heading
    const sinyCosp = 2.0 * (w * z + x * y);
    const cosyCosp = 1.0 - 2.0 * (y * y + z * z);
    const yaw = Math.atan2(sinyCosp, cosyCosp);

    // Convert from radians to degrees
    return [
      (roll * 180) / Math.PI,
      (pitch * 180) / Math.PI,
      (yaw * 180) / Math.PI
    ];
  }

  private createMetadata(file: File, trackPoints: TrackPoint[]): FileMetadata {
    return {
      filename: file.name,
      fileType: 'vkx',
      fileSize: file.size,
      trackPointCount: trackPoints.length,
      startTime: trackPoints.length > 0 ? trackPoints[0].utc : 0,
      endTime: trackPoints.length > 0 ? trackPoints[trackPoints.length - 1].utc : 0
    };
  }
}
