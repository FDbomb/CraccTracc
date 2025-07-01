import { TrackPoint, ProcessingResult, FileMetadata } from '../types/sailing';

export class VKXParser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async parseVKXFile(_file: File): Promise<
    ProcessingResult<{
      trackPoints: TrackPoint[];
      metadata: FileMetadata;
      courseData?: unknown;
    }>
  > {
    // TODO: Implement VKX parsing logic
    // This will be implemented in Phase 3
    return {
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'VKX parser not yet implemented',
      },
    };
  }
}
