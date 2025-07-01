import { TrackPoint, ProcessingResult, FileMetadata } from '../types/sailing';

export class GPXParser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async parseGPXFile(_file: File): Promise<
    ProcessingResult<{
      trackPoints: TrackPoint[];
      metadata: FileMetadata;
    }>
  > {
    // TODO: Implement GPX parsing logic
    // This will be implemented in Phase 3
    return {
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'GPX parser not yet implemented',
      },
    };
  }
}
