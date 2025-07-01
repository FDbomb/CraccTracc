# CraccTracc NextJS/TypeScript Porting Analysis

## Project Overview

**CraccTracc** is a sailing VMG (Velocity Made Good) analysis tool that processes GPX tracks from GNSS-enabled smartwatches to generate polar VMG plots for sailing performance analysis.

### Current Architecture (Python)
- **Language**: Python 3.11-3.13
- **CLI Tool**: Uses Click for command-line interface
- **Data Processing**: Pandas for data manipulation
- **Visualization**: Matplotlib for plotting
- **Input Formats**: GPX and VKX files
- **Core Dependencies**: 
  - pandas (data processing)
  - matplotlib (visualization)
  - geographiclib (geographic calculations)
  - click (CLI interface)

## Feasibility Assessment: ✅ **HIGHLY FEASIBLE**

Yes, this project can definitely be ported to NextJS/TypeScript. Here's why:

### ✅ **Favorable Factors**
1. **Data Processing Logic**: All core algorithms are mathematical/analytical - easily portable
2. **File-based Input**: GPX/VKX parsing can be done in JavaScript/TypeScript
3. **Visualization**: Can be replaced with modern web charting libraries
4. **No Complex Python-specific Dependencies**: Core logic doesn't rely on Python-only features
5. **Self-contained**: No external databases or complex infrastructure

### ⚠️ **Challenges to Address**
1. **Mathematical Libraries**: Need JavaScript equivalents for geographic calculations
2. **File Processing**: Need robust GPX/VKX parsing in TypeScript
3. **Data Visualization**: Replace matplotlib with web-based charting
4. **Performance**: Large dataset processing optimization

## Detailed Porting Plan

### Phase 1: Project Setup & Foundation (1-2 weeks)

#### 1.1 NextJS Project Structure
```
cracctracc-web/
├── src/
│   ├── app/                    # Next.js 13+ app directory
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Main dashboard
│   │   └── api/               # API routes for file processing
│   ├── components/
│   │   ├── FileUpload.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Charts/
│   │   │   ├── PolarChart.tsx
│   │   │   ├── CourseChart.tsx
│   │   │   ├── SpeedChart.tsx
│   │   │   └── WindChart.tsx
│   │   └── DataTable.tsx
│   ├── lib/
│   │   ├── parsers/
│   │   │   ├── gpxParser.ts
│   │   │   └── vkxParser.ts
│   │   ├── calculations/
│   │   │   ├── wind.ts
│   │   │   ├── manoeuvres.ts
│   │   │   └── geographic.ts
│   │   ├── types/
│   │   │   └── sailing.ts
│   │   └── utils/
│   │       └── dataProcessing.ts
│   └── styles/
├── public/
├── package.json
├── tsconfig.json
└── tailwind.config.js
```

#### 1.2 Core Dependencies
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "recharts": "^2.8.0",          // For charts
    "plotly.js-react": "^2.6.0",   // For polar plots
    "geographiclib-geodesic": "^2.0.0", // Geographic calculations
    "fast-xml-parser": "^4.3.0",   // GPX parsing
    "date-fns": "^2.30.0",         // Date utilities
    "tailwindcss": "^3.3.0",       // Styling
    "lucide-react": "^0.290.0",    // Icons
    "@tanstack/react-table": "^8.10.0" // Data tables
  },
  "devDependencies": {
    "@types/plotly.js": "^2.12.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

### Phase 2: Core Data Types & Models (1 week)

#### 2.1 TypeScript Interfaces
```typescript
// src/lib/types/sailing.ts
interface TrackPoint {
  utc: number;           // Unix timestamp in milliseconds
  lat: number;           // Latitude
  lon: number;           // Longitude
  cog: number;           // Course over ground (degrees)
  sog: number;           // Speed over ground (knots)
  hdg?: number;          // Heading (degrees) - VKX only
  alt?: number;          // Altitude - optional
  roll?: number;         // Roll angle - VKX only
  pitch?: number;        // Pitch angle - VKX only
}

interface ProcessedTrackPoint extends TrackPoint {
  twd: number;           // True wind direction
  tws: number;           // True wind speed
  twa: number;           // True wind angle
  pos: PointOfSail;      // Point of sail
  tack: Tack;            // Port/Starboard
  manoeuvre?: ManoeuvreType;
}

enum PointOfSail {
  HeadToWind = "Head to Wind",
  Upwind = "Upwind", 
  Reach = "Reach",
  Downwind = "Downwind"
}

enum Tack {
  Port = "Port",
  Starboard = "Starboard"
}

enum ManoeuvreType {
  Tack = "tack",
  Gybe = "gybe", 
  RoundUp = "roundup",
  BearAway = "bearaway"
}

interface SailingAnalysis {
  trackPoints: ProcessedTrackPoint[];
  manoeuvres: ManoeuvreAnalysis[];
  summary: AnalysisSummary;
}
```

### Phase 3: File Parsing & Data Processing (2-3 weeks)

#### 3.1 GPX Parser
```typescript
// src/lib/parsers/gpxParser.ts
import { XMLParser } from 'fast-xml-parser';

export class GPXParser {
  async parseGPXFile(file: File): Promise<TrackPoint[]> {
    const text = await file.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
    
    const result = parser.parse(text);
    return this.extractTrackPoints(result);
  }
  
  private extractTrackPoints(gpxData: any): TrackPoint[] {
    // Implementation to extract track points from GPX structure
    // Convert GPX trkpt elements to TrackPoint interface
  }
}
```

#### 3.2 Wind Calculations
```typescript
// src/lib/calculations/wind.ts
import { Geodesic } from 'geographiclib-geodesic';

export class WindCalculations {
  static calculateTWA(heading: number, twd: number): number {
    // Port from Python hdg2twa function
    let normalizedHeading = heading < 0 ? 360 - Math.abs(heading) : heading;
    let twa = normalizedHeading - twd;
    
    if (twa > 180) {
      twa = -180 + Math.abs(180 - twa);
    } else if (twa <= -180) {
      twa = 180 - Math.abs(180 + twa);
    }
    
    return twa;
  }
  
  static async fetchWindData(date: string): Promise<WindData[]> {
    // Implementation for wind API integration
    // Could use OpenWeatherMap or similar service
  }
}
```

#### 3.3 Manoeuvre Detection
```typescript
// src/lib/calculations/manoeuvres.ts
export class ManoeuvreDetection {
  static detectManoeuvres(trackPoints: ProcessedTrackPoint[]): ProcessedTrackPoint[] {
    return trackPoints.map((point, index) => {
      if (index === 0) return point;
      
      const prevPoint = trackPoints[index - 1];
      const manoeuvre = this.identifyManoeuvre(prevPoint, point);
      
      return { ...point, manoeuvre };
    });
  }
  
  private static identifyManoeuvre(prev: ProcessedTrackPoint, current: ProcessedTrackPoint): ManoeuvreType | undefined {
    // Port logic from Python identify_manoeuvres function
    if (prev.tack !== current.tack && Math.abs(current.twa) <= 90) {
      return ManoeuvreType.Tack;
    }
    if (prev.tack !== current.tack && Math.abs(current.twa) > 90) {
      return ManoeuvreType.Gybe;
    }
    // Additional conditions...
  }
}
```

### Phase 4: Web Interface & Visualization (2-3 weeks)

#### 4.1 Main Dashboard Component
```typescript
// src/components/Dashboard.tsx
'use client';

import { useState } from 'react';
import { FileUpload } from './FileUpload';
import { PolarChart } from './Charts/PolarChart';
import { CourseChart } from './Charts/CourseChart';
import { SpeedChart } from './Charts/SpeedChart';

export function Dashboard() {
  const [analysisData, setAnalysisData] = useState<SailingAnalysis | null>(null);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      <FileUpload onDataProcessed={setAnalysisData} />
      {analysisData && (
        <>
          <CourseChart data={analysisData.trackPoints} />
          <SpeedChart data={analysisData.trackPoints} />
          <PolarChart data={analysisData.trackPoints} />
          <WindChart data={analysisData.trackPoints} />
        </>
      )}
    </div>
  );
}
```

#### 4.2 Polar Chart (Replacing matplotlib)
```typescript
// src/components/Charts/PolarChart.tsx
import Plot from 'react-plotly.js';

export function PolarChart({ data }: { data: ProcessedTrackPoint[] }) {
  const polarData = data.map(point => ({
    r: point.sog,
    theta: point.cog
  }));

  return (
    <Plot
      data={[{
        type: 'scatterpolar',
        r: polarData.map(p => p.r),
        theta: polarData.map(p => p.theta),
        mode: 'markers',
        name: 'Speed/Course'
      }]}
      layout={{
        title: 'Polar Speed Chart',
        polar: {
          radialaxis: { title: 'Speed (knots)' },
          angularaxis: { title: 'Course (degrees)' }
        }
      }}
    />
  );
}
```

### Phase 5: API Integration & File Processing (1-2 weeks)

#### 5.1 File Upload API Route
```typescript
// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GPXParser } from '@/lib/parsers/gpxParser';
import { processTrackData } from '@/lib/utils/dataProcessing';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    const parser = new GPXParser();
    const trackPoints = await parser.parseGPXFile(file);
    const analysis = await processTrackData(trackPoints);
    
    return NextResponse.json(analysis);
  } catch (error) {
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
```

### Phase 6: Advanced Features (2-3 weeks)

#### 6.1 Real-time Wind Data Integration
- Integrate with weather APIs (OpenWeatherMap, NOAA, etc.)
- Implement wind interpolation algorithms
- Cache wind data for performance

#### 6.2 Export Functionality
- CSV export for processed data
- PDF reports generation
- GPX export with enhanced data

#### 6.3 Analysis Tools
- VMG analysis dashboard
- Performance comparisons
- Manoeuvre analysis reports

## Technology Stack Comparison

| Feature | Python (Current) | NextJS/TypeScript (Proposed) |
|---------|------------------|------------------------------|
| **Data Processing** | Pandas | Custom TypeScript classes + utilities |
| **Visualization** | Matplotlib | Plotly.js + Recharts |
| **File Parsing** | Custom parsers | fast-xml-parser + custom logic |
| **Geographic Calc** | geographiclib | geographiclib-geodesic (JS port) |
| **Interface** | CLI | Modern web interface |
| **Deployment** | Local Python env | Vercel/Netlify/Docker |
| **Data Export** | CSV/PKL files | CSV/JSON/PDF + cloud storage |

## Potential Downsides & Challenges

### 🚨 **Major Considerations**

#### 1. **Performance Concerns**
- **Large File Processing**: GPX files can be 2MB+ with thousands of track points
- **Client-side Limitations**: Browser memory constraints for large datasets
- **Solution**: Implement server-side processing with streaming for large files

#### 2. **Mathematical Precision**
- **Floating Point Differences**: JavaScript vs Python floating-point arithmetic
- **Geographic Calculations**: Ensure accuracy matches Python geographiclib
- **Solution**: Extensive testing with identical datasets, use proven JS libraries

#### 3. **Library Ecosystem**
- **Python Ecosystem**: Mature scientific computing libraries
- **JavaScript Limitations**: Fewer specialized sailing/marine libraries
- **Solution**: Port key algorithms, leverage web-specific advantages

#### 4. **Data Processing Complexity**
- **Pandas Equivalent**: No direct pandas replacement in JavaScript
- **Memory Management**: Less sophisticated than Python for large datasets
- **Solution**: Custom data processing utilities, consider WebAssembly for intensive calculations

### ⚠️ **Medium Impact Issues**

#### 1. **Development Time**
- **Learning Curve**: If unfamiliar with sailing domain concepts
- **Algorithm Porting**: Time to convert and test Python logic
- **Estimated Timeline**: 8-12 weeks for full port vs. extending Python version

#### 2. **Feature Parity**
- **VKX Format**: May need reverse engineering if Python parser is custom
- **Wind Data Sources**: Different APIs/sources than current implementation
- **Edge Cases**: Python version may handle edge cases not immediately obvious

#### 3. **User Experience Trade-offs**
- **Offline Usage**: CLI works offline, web app may need internet for wind data
- **File Handling**: Web browser security restrictions vs. direct file system access
- **Installation**: Web app simpler but requires hosting

### ✅ **Advantages of Web Version**

#### 1. **User Experience**
- **Visual Interface**: Much more intuitive than CLI
- **Interactive Charts**: Zoom, pan, hover details
- **Shareable Results**: Easy to share analyses via URLs
- **Mobile Friendly**: Use on boats with tablets/phones

#### 2. **Distribution & Updates**
- **No Installation**: Works in any modern browser
- **Automatic Updates**: Users always get latest version
- **Cross-platform**: Works on any OS

#### 3. **Enhanced Features**
- **Real-time Data**: Integration with live weather APIs
- **Cloud Storage**: Save and compare multiple analyses
- **Collaboration**: Share results with crew/coaches
- **Integration**: Connect with other sailing apps/services

## Recommended Implementation Strategy

### Option 1: Full Port (Recommended)
**Timeline**: 10-12 weeks
**Benefits**: Modern UX, better distribution, enhanced features
**Risks**: Initial development time, need to replicate all functionality

### Option 2: Hybrid Approach
**Timeline**: 6-8 weeks
**Approach**: Keep Python processing backend, build NextJS frontend
**Benefits**: Leverage existing Python code, faster development
**Trade-offs**: More complex deployment, still need Python environment

### Option 3: Progressive Migration
**Timeline**: 14-16 weeks
**Approach**: Start with core features, gradually add advanced functionality
**Benefits**: Earlier usable version, incremental risk
**Trade-offs**: Longer total timeline

## Conclusion

**Recommendation**: ✅ **Proceed with full NextJS/TypeScript port**

The project is well-suited for web implementation. The core algorithms are mathematical and data processing focused, which translates well to TypeScript. The main benefits (modern UI, better distribution, enhanced features) significantly outweigh the challenges.

**Key Success Factors**:
1. Start with robust data type definitions
2. Implement comprehensive test suite with Python-generated reference data
3. Focus on performance optimization for large datasets
4. Plan for progressive enhancement of features

The sailing community would likely prefer a modern web interface over a CLI tool, making this port not just feasible but highly valuable.