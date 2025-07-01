import { TrackPoint, ProcessingResult, FileMetadata } from '../types/sailing';

export class GPXParser {
  async parseGPXFile(file: File): Promise<ProcessingResult<{
    trackPoints: TrackPoint[];
    metadata: FileMetadata;
  }>> {
    // TODO: Implement GPX parsing logic
    // This will be implemented in Phase 3
    return {
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'GPX parser not yet implemented' }
    };
  }
}