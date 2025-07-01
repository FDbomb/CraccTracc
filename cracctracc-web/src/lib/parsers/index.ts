/* eslint-disable @typescript-eslint/no-explicit-any */
import { GPXParser } from './gpxParser';
import { VKXParser } from './vkxParser';
import { TrackPoint, ProcessingResult, FileMetadata } from '../types/sailing';

export interface ParsedFileData {
  trackPoints: TrackPoint[];
  metadata: FileMetadata;
  courseData?: any;
}

export class FileParser {
  private static readonly MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
  private static readonly MIN_VKX_FILE_SIZE_BYTES = 10;
  
  private gpxParser: GPXParser;
  private vkxParser: VKXParser;

  constructor() {
    this.gpxParser = new GPXParser();
    this.vkxParser = new VKXParser();
  }

  async parseFile(file: File): Promise<ProcessingResult<ParsedFileData>> {
    // Validate file size first
    if (file.size > FileParser.MAX_FILE_SIZE_BYTES) {
      return {
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the maximum allowed size (${FileParser.MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB).`
        }
      };
    }

    // Validate file type
    if (!this.validateFileType(file)) {
      const extension = this.getFileExtension(file.name);
      return {
        success: false,
        error: {
          code: 'UNSUPPORTED_FORMAT',
          message: `File format '.${extension}' is not supported. Please use .gpx or .vkx files.`
        }
      };
    }

    const fileExtension = this.getFileExtension(file.name);

    try {
      switch (fileExtension) {
        case 'gpx':
          return await this.gpxParser.parseGPXFile(file);
        case 'vkx':
          return await this.vkxParser.parseVKXFile(file);
        default:
          return {
            success: false,
            error: {
              code: 'UNSUPPORTED_FORMAT',
              message: `File format '.${fileExtension}' is not supported. Please use .gpx or .vkx files.`
            }
          };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown parsing error occurred'
        }
      };
    }
  }

  /**
   * Parse multiple files in parallel
   */
  async parseFiles(files: File[]): Promise<ProcessingResult<ParsedFileData>[]> {
    const parsePromises = files.map(file => this.parseFile(file));
    return Promise.all(parsePromises);
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  getSupportedFormats(): string[] {
    return ['gpx', 'vkx'];
  }

  validateFileType(file: File): boolean {
    const extension = this.getFileExtension(file.name);
    return this.getSupportedFormats().includes(extension);
  }

  getMaxFileSize(): number {
    return FileParser.MAX_FILE_SIZE_BYTES;
  }

  /**
   * Get file format description for UI display
   */
  getFormatDescription(extension: string): string {
    switch (extension.toLowerCase()) {
      case 'gpx':
        return 'GPS Exchange Format - Standard GPS track format used by most GPS devices and sailing apps';
      case 'vkx':
        return 'Vakaros Format - Binary format from Vakaros sailing computers with additional orientation data';
      default:
        return 'Unknown format';
    }
  }

  /**
   * Check if a file appears to be valid based on basic checks
   */
  async validateFileContent(file: File): Promise<ProcessingResult<boolean>> {
    try {
      const extension = this.getFileExtension(file.name);
      
      if (extension === 'gpx') {
        // Quick GPX validation - check if it starts with XML
        const text = await file.text();
        if (!text.trim().startsWith('<?xml') && !text.trim().startsWith('<gpx')) {
          return {
            success: false,
            error: {
              code: 'INVALID_GPX_FORMAT',
              message: 'File does not appear to be a valid GPX file (missing XML header)'
            }
          };
        }
             } else if (extension === 'vkx') {
         // Quick VKX validation - check if it has binary data
         if (file.size < FileParser.MIN_VKX_FILE_SIZE_BYTES) {
           return {
             success: false,
             error: {
               code: 'INVALID_VKX_FORMAT',
               message: 'VKX file appears to be too small to contain valid data'
             }
           };
         }
       }

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'File validation failed'
        }
      };
    }
  }
}

export { GPXParser, VKXParser };