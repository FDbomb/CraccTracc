# CraccTracc Implementation Plan - Phases 6-8

## Phase 6: User Interface Components

### Task 6.1: Create File Upload Component
**Objective**: Build drag-and-drop file upload with validation

**File**: `src/components/upload/FileUpload.tsx`

**Implementation**:
```typescript
'use client';

import { useState, useCallback } from 'react';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { FileParser } from '@/lib/parsers';
import { SailingAnalysis, ProcessingResult } from '@/lib/types/sailing';

interface FileUploadProps {
  onDataProcessed: (analysis: SailingAnalysis) => void;
  onError: (error: string) => void;
}

export function FileUpload({ onDataProcessed, onError }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setUploadStatus('idle');

    try {
      // Validate file
      const parser = new FileParser();
      if (!parser.validateFileType(file)) {
        throw new Error(`Unsupported file type. Please use: ${parser.getSupportedFormats().join(', ')}`);
      }

      if (file.size > parser.getMaxFileSize()) {
        throw new Error('File size too large. Maximum size is 50MB.');
      }

      // Send to API for processing
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const analysis: SailingAnalysis = await response.json();
      setUploadStatus('success');
      onDataProcessed(analysis);

    } catch (error) {
      setUploadStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : 'hover:border-gray-400'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center space-y-4">
          {isProcessing ? (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          ) : (
            <Upload className="h-12 w-12 text-gray-400" />
          )}
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isProcessing ? 'Processing file...' : 'Upload your sailing track'}
            </p>
            <p className="text-sm text-gray-500">
              Drag and drop your GPX or VKX file here, or click to browse
            </p>
          </div>

          {!isProcessing && (
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept=".gpx,.vkx"
                onChange={handleFileSelect}
              />
              <span className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                Choose File
              </span>
            </label>
          )}

          {uploadStatus === 'success' && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm">File processed successfully!</span>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">Upload failed. Please try again.</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p><strong>Supported formats:</strong> .gpx, .vkx</p>
        <p><strong>Max file size:</strong> 50MB</p>
      </div>
    </div>
  );
}
```

**Acceptance Criteria**:
- Drag and drop functionality works
- File validation prevents invalid uploads
- Loading states and error handling work
- Integration with API upload endpoint

### Task 6.2: Create Chart Components
**Objective**: Build interactive charts for sailing data visualization

**File**: `src/components/charts/PolarChart.tsx`

**Implementation**:
```typescript
'use client';

import dynamic from 'next/dynamic';
import { ProcessedTrackPoint } from '@/lib/types/sailing';

// Dynamic import to avoid SSR issues with Plotly
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface PolarChartProps {
  data: ProcessedTrackPoint[];
  title?: string;
}

export function PolarChart({ data, title = "Polar Speed Chart" }: PolarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No data available for polar chart</p>
      </div>
    );
  }

  // Prepare data for polar plot
  const polarData = data.map(point => ({
    r: point.sog,
    theta: point.cog,
    twa: point.twa,
    speed: point.sog,
    time: new Date(point.utc).toLocaleTimeString()
  }));

  const plotData = [{
    type: 'scatterpolar' as const,
    r: polarData.map(p => p.r),
    theta: polarData.map(p => p.theta),
    mode: 'markers' as const,
    marker: {
      color: polarData.map(p => p.twa),
      colorscale: 'RdYlBu',
      size: 6,
      colorbar: {
        title: 'True Wind Angle (°)',
      }
    },
    text: polarData.map(p => `Speed: ${p.speed.toFixed(1)} kts<br>TWA: ${p.twa}°<br>Time: ${p.time}`),
    hovertemplate: '%{text}<extra></extra>',
    name: 'Track Points'
  }];

  const layout = {
    title: {
      text: title,
      font: { size: 16 }
    },
    polar: {
      radialaxis: {
        title: 'Speed (knots)',
        visible: true,
        range: [0, Math.max(...polarData.map(p => p.r)) * 1.1]
      },
      angularaxis: {
        title: 'Course (degrees)',
        tickmode: 'linear',
        tick0: 0,
        dtick: 30,
        direction: 'clockwise',
        rotation: 90
      }
    },
    showlegend: true,
    width: 500,
    height: 500
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <Plot
        data={plotData}
        layout={layout}
        config={{ 
          responsive: true,
          displayModeBar: true,
          modeBarButtonsToRemove: ['pan2d', 'lasso2d']
        }}
      />
    </div>
  );
}
```

**File**: `src/components/charts/CourseChart.tsx`

**Implementation**:
```typescript
'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ProcessedTrackPoint } from '@/lib/types/sailing';

interface CourseChartProps {
  data: ProcessedTrackPoint[];
}

export function CourseChart({ data }: CourseChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No data available for course chart</p>
      </div>
    );
  }

  // Prepare data for time series chart
  const chartData = data.map((point, index) => ({
    index,
    lat: point.lat,
    lon: point.lon,
    speed: point.sog,
    heading: point.cog,
    twa: point.twa,
    time: new Date(point.utc).toLocaleTimeString(),
    timestamp: point.utc
  }));

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">Course Track</h3>
      
      {/* Map-like view */}
      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="lon" 
              domain={['dataMin', 'dataMax']}
              type="number"
              label={{ value: 'Longitude', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              dataKey="lat"
              domain={['dataMin', 'dataMax']}
              type="number"
              label={{ value: 'Latitude', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value, name) => [
                typeof value === 'number' ? value.toFixed(6) : value, 
                name
              ]}
              labelFormatter={(label) => `Point: ${label}`}
            />
            <Line 
              type="monotone" 
              dataKey="lat" 
              stroke="#2563eb" 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Speed over time */}
      <div className="h-48">
        <h4 className="text-md font-medium mb-2">Speed Over Time</h4>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="index"
              label={{ value: 'Time Points', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              label={{ value: 'Speed (knots)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value) => [value, 'Speed (knots)']}
              labelFormatter={(label) => `Point: ${label}`}
            />
            <Line 
              type="monotone" 
              dataKey="speed" 
              stroke="#dc2626" 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

**Acceptance Criteria**:
- Polar chart displays speed/course data correctly
- Course chart shows track path and speed over time
- Charts are interactive with tooltips and zoom
- Responsive design works on different screen sizes

### Task 6.3: Create Dashboard Layout
**Objective**: Build main dashboard that orchestrates all components

**File**: `src/components/Dashboard.tsx`

**Implementation**:
```typescript
'use client';

import { useState } from 'react';
import { FileUpload } from './upload/FileUpload';
import { PolarChart } from './charts/PolarChart';
import { CourseChart } from './charts/CourseChart';
import { WindChart } from './charts/WindChart';
import { ManoeuvreTable } from './tables/ManoeuvreTable';
import { SummaryStats } from './stats/SummaryStats';
import { SailingAnalysis } from '@/lib/types/sailing';
import { AlertTriangle } from 'lucide-react';

export function Dashboard() {
  const [analysisData, setAnalysisData] = useState<SailingAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDataProcessed = (analysis: SailingAnalysis) => {
    setAnalysisData(analysis);
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">CraccTracc</h1>
              <p className="text-gray-600">Sailing VMG Analysis Tool</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Upload Section */}
        {!analysisData && (
          <div className="text-center py-12">
            <FileUpload 
              onDataProcessed={handleDataProcessed}
              onError={handleError}
            />
          </div>
        )}

        {/* Analysis Results */}
        {analysisData && (
          <div className="space-y-8">
            {/* Summary Statistics */}
            <SummaryStats analysis={analysisData} />

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CourseChart data={analysisData.trackPoints} />
              <PolarChart data={analysisData.trackPoints} />
              <WindChart data={analysisData.trackPoints} />
              <ManoeuvreTable manoeuvres={analysisData.manoeuvres} />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                onClick={() => setAnalysisData(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Upload New File
              </button>
              <button
                onClick={() => {/* TODO: Implement export */}}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Export Data
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
```

**Acceptance Criteria**:
- Dashboard layout is responsive and clean
- Error states are handled gracefully
- Component orchestration works correctly
- Upload and analysis flow is intuitive

## Phase 7: API Implementation

### Task 7.1: Create File Upload API Route
**Objective**: Handle file uploads and trigger data processing

**File**: `src/app/api/upload/route.ts`

**Implementation**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { FileParser } from '@/lib/parsers';
import { DataProcessor } from '@/lib/utils/dataProcessing';

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    const parser = new FileParser();
    if (!parser.validateFileType(file)) {
      return NextResponse.json(
        { error: `Unsupported file type. Supported: ${parser.getSupportedFormats().join(', ')}` },
        { status: 400 }
      );
    }

    if (file.size > parser.getMaxFileSize()) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    // Parse file
    const parseResult = await parser.parseFile(file);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error?.message || 'Failed to parse file' },
        { status: 400 }
      );
    }

    // Process data
    const analysis = await DataProcessor.processTrackData(
      parseResult.data!.trackPoints,
      parseResult.data!.metadata,
      {
        windOptions: {
          fixedTwd: 180 // Default wind direction
        }
      }
    );

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Upload processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'File upload endpoint. Use POST with multipart/form-data.' },
    { status: 200 }
  );
}
```

**Acceptance Criteria**:
- Handles file uploads correctly
- Validates file type and size
- Returns proper error messages
- Processes files and returns analysis data

### Task 7.2: Create Data Export API Route
**Objective**: Allow users to export processed data in various formats

**File**: `src/app/api/export/route.ts`

**Implementation**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { SailingAnalysis } from '@/lib/types/sailing';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, format } = body as { data: SailingAnalysis; format: 'csv' | 'json' };

    if (!data || !data.trackPoints) {
      return NextResponse.json(
        { error: 'No analysis data provided' },
        { status: 400 }
      );
    }

    switch (format) {
      case 'csv':
        return exportCSV(data);
      case 'json':
        return exportJSON(data);
      default:
        return NextResponse.json(
          { error: 'Unsupported export format. Use csv or json.' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
}

function exportCSV(analysis: SailingAnalysis): NextResponse {
  const headers = [
    'timestamp',
    'utc',
    'latitude',
    'longitude',
    'speed_knots',
    'course_degrees',
    'true_wind_direction',
    'true_wind_speed',
    'true_wind_angle',
    'point_of_sail',
    'tack',
    'manoeuvre'
  ];

  const csvRows = [
    headers.join(','),
    ...analysis.trackPoints.map(point => [
      new Date(point.utc).toISOString(),
      point.utc,
      point.lat,
      point.lon,
      point.sog,
      point.cog,
      point.twd,
      point.tws,
      point.twa,
      point.pos,
      point.tack,
      point.manoeuvre || ''
    ].join(','))
  ];

  const csvContent = csvRows.join('\n');
  
  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="sailing-analysis-${Date.now()}.csv"`
    }
  });
}

function exportJSON(analysis: SailingAnalysis): NextResponse {
  const jsonContent = JSON.stringify(analysis, null, 2);
  
  return new NextResponse(jsonContent, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="sailing-analysis-${Date.now()}.json"`
    }
  });
}
```

**Acceptance Criteria**:
- Exports data in CSV and JSON formats
- Proper file download headers
- All track point data included in exports
- Error handling for invalid requests

## Phase 8: Testing and Deployment

### Task 8.1: Set Up Testing Framework
**Objective**: Create comprehensive test suite

**File**: `__tests__/lib/parsers/gpxParser.test.ts`

**Implementation**:
```typescript
import { GPXParser } from '@/lib/parsers/gpxParser';

describe('GPXParser', () => {
  let parser: GPXParser;

  beforeEach(() => {
    parser = new GPXParser();
  });

  test('should parse valid GPX file', async () => {
    const gpxContent = `<?xml version="1.0"?>
      <gpx version="1.1">
        <trk>
          <trkseg>
            <trkpt lat="37.7749" lon="-122.4194">
              <time>2023-10-28T10:00:00Z</time>
              <extensions>
                <speed>5.0</speed>
                <course>180</course>
              </extensions>
            </trkpt>
          </trkseg>
        </trk>
      </gpx>`;

    const file = new File([gpxContent], 'test.gpx', { type: 'application/gpx+xml' });
    const result = await parser.parseGPXFile(file);

    expect(result.success).toBe(true);
    expect(result.data?.trackPoints).toHaveLength(1);
    expect(result.data?.trackPoints[0].lat).toBe(37.7749);
    expect(result.data?.trackPoints[0].lon).toBe(-122.4194);
  });

  test('should handle invalid GPX file', async () => {
    const invalidContent = 'not xml content';
    const file = new File([invalidContent], 'test.gpx', { type: 'application/gpx+xml' });
    const result = await parser.parseGPXFile(file);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('PARSE_ERROR');
  });
});
```

**Package.json test scripts**:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "@testing-library/react": "^13.0.0",
    "@testing-library/jest-dom": "^5.16.0"
  }
}
```

**Acceptance Criteria**:
- Unit tests for all parser functions
- Integration tests for data processing pipeline
- UI component tests for key interactions
- Test coverage above 80%

### Task 8.2: Configure Deployment
**Objective**: Set up production deployment configuration

**File**: `Dockerfile`

**Implementation**:
```dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

**File**: `docker-compose.yml`

**Implementation**:
```yaml
version: '3.8'

services:
  cracctracc-web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    volumes:
      - ./uploads:/app/uploads
```

**File**: `vercel.json` (for Vercel deployment)

**Implementation**:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "functions": {
    "src/app/api/upload/route.ts": {
      "maxDuration": 30
    }
  }
}
```

**Acceptance Criteria**:
- Docker builds successfully
- Vercel deployment configuration works
- Environment variables properly configured
- Production build optimizations enabled

### Task 8.3: Performance Optimization
**Objective**: Optimize for large file processing and performance

**File**: `src/lib/utils/performance.ts`

**Implementation**:
```typescript
export class PerformanceOptimizer {
  /**
   * Process large datasets in chunks to avoid blocking the main thread
   */
  static async processInChunks<T, R>(
    data: T[],
    processor: (chunk: T[]) => R[],
    chunkSize: number = 1000
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const chunkResults = processor(chunk);
      results.push(...chunkResults);
      
      // Allow other tasks to run
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return results;
  }

  /**
   * Debounce function for user input
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Memory-efficient data filtering
   */
  static filterLargeDataset<T>(
    data: T[],
    predicate: (item: T) => boolean,
    chunkSize: number = 10000
  ): T[] {
    const filtered: T[] = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      filtered.push(...chunk.filter(predicate));
    }
    
    return filtered;
  }
}
```

**Acceptance Criteria**:
- Large files (>10k track points) process without blocking UI
- Memory usage stays reasonable during processing
- Performance monitoring and optimization in place
- Progressive loading for large datasets

## Final Implementation Checklist

### Core Functionality ✅
- [ ] GPX file parsing
- [ ] VKX file parsing (structure ready)
- [ ] Wind calculations (TWA, TWD, TWS)
- [ ] Manoeuvre detection (tacks, gybes, etc.)
- [ ] Data processing pipeline

### User Interface ✅
- [ ] File upload with drag-and-drop
- [ ] Interactive polar charts
- [ ] Course tracking visualization
- [ ] Wind analysis charts
- [ ] Manoeuvre tables
- [ ] Summary statistics
- [ ] Responsive design

### API & Backend ✅
- [ ] File upload endpoint
- [ ] Data processing API
- [ ] Export functionality (CSV, JSON)
- [ ] Error handling
- [ ] File validation

### Testing & Quality ✅
- [ ] Unit tests for parsers
- [ ] Integration tests for processing
- [ ] UI component tests
- [ ] Performance tests
- [ ] Error handling tests

### Deployment ✅
- [ ] Docker configuration
- [ ] Vercel deployment setup
- [ ] Environment configuration
- [ ] Performance optimization
- [ ] Monitoring setup

### Documentation ✅
- [ ] API documentation
- [ ] User guide
- [ ] Developer setup instructions
- [ ] Deployment guide

**Estimated Total Timeline**: 10-12 weeks with parallel development of components.