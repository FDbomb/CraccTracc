import { FileParser, GPXParser, VKXParser } from '../index';

describe('File Parser Tests', () => {
  let fileParser: FileParser;

  beforeEach(() => {
    fileParser = new FileParser();
  });

  describe('FileParser', () => {
    it('should identify supported formats', () => {
      const formats = fileParser.getSupportedFormats();
      expect(formats).toEqual(['gpx', 'vkx']);
    });

    it('should validate file types correctly', () => {
      const gpxFile = new File([''], 'test.gpx', { type: 'application/gpx+xml' });
      const vkxFile = new File([''], 'test.vkx', { type: 'application/octet-stream' });
      const txtFile = new File([''], 'test.txt', { type: 'text/plain' });

      expect(fileParser.validateFileType(gpxFile)).toBe(true);
      expect(fileParser.validateFileType(vkxFile)).toBe(true);
      expect(fileParser.validateFileType(txtFile)).toBe(false);
    });

    it('should reject files that are too large', async () => {
      const largeFile = new File(['x'.repeat(51 * 1024 * 1024)], 'large.gpx');
      const result = await fileParser.parseFile(largeFile);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FILE_TOO_LARGE');
    });

    it('should reject unsupported file types', async () => {
      const txtFile = new File(['content'], 'test.txt');
      const result = await fileParser.parseFile(txtFile);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UNSUPPORTED_FORMAT');
    });

    it('should provide format descriptions', () => {
      expect(fileParser.getFormatDescription('gpx')).toContain('GPS Exchange Format');
      expect(fileParser.getFormatDescription('vkx')).toContain('Vakaros Format');
      expect(fileParser.getFormatDescription('unknown')).toBe('Unknown format');
    });
  });

  describe('GPXParser', () => {
    let gpxParser: GPXParser;

    beforeEach(() => {
      gpxParser = new GPXParser();
    });

    it('should parse a valid GPX file', async () => {
      const gpxContent = `<?xml version="1.0"?>
<gpx version="1.1" creator="Test">
  <trk>
    <trkseg>
      <trkpt lat="37.7749" lon="-122.4194">
        <time>2023-01-01T12:00:00Z</time>
        <ele>10</ele>
        <extensions>
          <speed>5.0</speed>
          <course>180</course>
        </extensions>
      </trkpt>
      <trkpt lat="37.7750" lon="-122.4195">
        <time>2023-01-01T12:01:00Z</time>
        <ele>11</ele>
        <extensions>
          <speed>6.0</speed>
          <course>185</course>
        </extensions>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

      const file = new File([gpxContent], 'test.gpx', { type: 'application/gpx+xml' });
      const result = await gpxParser.parseGPXFile(file);

      expect(result.success).toBe(true);
      expect(result.data?.trackPoints).toHaveLength(2);
      expect(result.data?.metadata.fileType).toBe('gpx');
      expect(result.data?.metadata.filename).toBe('test.gpx');

      const firstPoint = result.data?.trackPoints[0];
      expect(firstPoint?.lat).toBe(37.7749);
      expect(firstPoint?.lon).toBe(-122.4194);
      expect(firstPoint?.alt).toBe(10);
    });

    it('should handle GPX file without extensions', async () => {
      const gpxContent = `<?xml version="1.0"?>
<gpx version="1.1" creator="Test">
  <trk>
    <trkseg>
      <trkpt lat="37.7749" lon="-122.4194">
        <time>2023-01-01T12:00:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

      const file = new File([gpxContent], 'simple.gpx', { type: 'application/gpx+xml' });
      const result = await gpxParser.parseGPXFile(file);

      expect(result.success).toBe(true);
      expect(result.data?.trackPoints).toHaveLength(1);
      
      const point = result.data?.trackPoints[0];
      expect(point?.lat).toBe(37.7749);
      expect(point?.lon).toBe(-122.4194);
      expect(point?.sog).toBe(0); // Default when no speed extension
      expect(point?.cog).toBe(0); // Default when no course extension
    });

    it('should reject invalid GPX content', async () => {
      const invalidContent = 'This is not XML';
      const file = new File([invalidContent], 'invalid.gpx');
      const result = await gpxParser.parseGPXFile(file);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_GPX');
    });

    it('should reject non-GPX XML', async () => {
      const nonGpxXml = '<?xml version="1.0"?><root><data>test</data></root>';
      const file = new File([nonGpxXml], 'notgpx.gpx');
      const result = await gpxParser.parseGPXFile(file);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_GPX');
    });

    it('should handle nested extension formats', async () => {
      const gpxContent = `<?xml version="1.0"?>
<gpx version="1.1" creator="Test">
  <trk>
    <trkseg>
      <trkpt lat="37.7749" lon="-122.4194">
        <time>2023-01-01T12:00:00Z</time>
        <extensions>
          <gpxtpx>
            <speed>2.5</speed>
            <course>90</course>
          </gpxtpx>
        </extensions>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

      const file = new File([gpxContent], 'nested.gpx');
      const result = await gpxParser.parseGPXFile(file);

      expect(result.success).toBe(true);
      const point = result.data?.trackPoints[0];
      expect(point?.sog).toBeCloseTo(4.86, 1); // 2.5 m/s * 1.943844 ≈ 4.86 knots
      expect(point?.cog).toBe(90);
    });
  });

  describe('VKXParser', () => {
    let vkxParser: VKXParser;

    beforeEach(() => {
      vkxParser = new VKXParser();
    });

    it('should handle empty VKX file', async () => {
      const file = new File([], 'empty.vkx');
      const result = await vkxParser.parseVKXFile(file);

      expect(result.success).toBe(true);
      expect(result.data?.trackPoints).toHaveLength(0);
      expect(result.data?.metadata.fileType).toBe('vkx');
    });

    it('should create proper metadata for VKX files', async () => {
      const file = new File([new ArrayBuffer(100)], 'test.vkx');
      const result = await vkxParser.parseVKXFile(file);

      expect(result.success).toBe(true);
      expect(result.data?.metadata.filename).toBe('test.vkx');
      expect(result.data?.metadata.fileType).toBe('vkx');
      expect(result.data?.metadata.fileSize).toBe(100);
    });

    it('should handle malformed binary data gracefully', async () => {
      // Create some random binary data that might cause parsing issues
      const badData = new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF, 0x02]);
      const file = new File([badData], 'bad.vkx');
      const result = await vkxParser.parseVKXFile(file);

      // Should not crash, but might not find valid data
      expect(result.success).toBe(true);
      // trackPoints might be empty due to invalid data, but parser shouldn't fail
    });
  });

  describe('File Content Validation', () => {
    it('should validate GPX content', async () => {
      const validGpx = new File(['<?xml version="1.0"?><gpx></gpx>'], 'valid.gpx');
      const result = await fileParser.validateFileContent(validGpx);
      expect(result.success).toBe(true);

      const invalidGpx = new File(['not xml content'], 'invalid.gpx');
      const invalidResult = await fileParser.validateFileContent(invalidGpx);
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error?.code).toBe('INVALID_GPX_FORMAT');
    });

    it('should validate VKX content', async () => {
      const validVkx = new File([new ArrayBuffer(100)], 'valid.vkx');
      const result = await fileParser.validateFileContent(validVkx);
      expect(result.success).toBe(true);

      const tooSmallVkx = new File([new ArrayBuffer(5)], 'small.vkx');
      const smallResult = await fileParser.validateFileContent(tooSmallVkx);
      expect(smallResult.success).toBe(false);
      expect(smallResult.error?.code).toBe('INVALID_VKX_FORMAT');
    });
  });

  describe('Multiple File Processing', () => {
    it('should parse multiple files in parallel', async () => {
      const gpxContent = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="37.7749" lon="-122.4194">
        <time>2023-01-01T12:00:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

      const file1 = new File([gpxContent], 'test1.gpx');
      const file2 = new File([gpxContent], 'test2.gpx');
      const file3 = new File([new ArrayBuffer(50)], 'test.vkx');

      const results = await fileParser.parseFiles([file1, file2, file3]);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
    });
  });
});