import { NextRequest, NextResponse } from 'next/server';
import { SailingAnalysis, FileMetadata } from '../../../lib/types/sailing';

interface ExportRequest {
  data: SailingAnalysis;
  format: 'csv' | 'json' | 'gpx';
  options?: {
    includeTrackPoints?: boolean;
    includeManoeuvres?: boolean;
    includeSummary?: boolean;
    speedFilter?: {
      min: number;
      max: number;
    };
    dateRange?: {
      start: number;
      end: number;
    };
  };
}

interface ExportMetadata extends FileMetadata {
  exportedAt: string;
  exportOptions?: ExportRequest['options'];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ExportRequest;
    const { data, format, options = {} } = body;

    if (!data || !data.trackPoints) {
      return NextResponse.json(
        { error: 'No analysis data provided' },
        { status: 400 }
      );
    }

    // Apply filters if specified
    const filteredData = applyFilters(data, options);

    switch (format) {
      case 'csv':
        return exportCSV(filteredData, options);
      case 'json':
        return exportJSON(filteredData, options);
      case 'gpx':
        return exportGPX(filteredData, options);
      default:
        return NextResponse.json(
          { error: 'Unsupported export format. Use csv, json, or gpx.' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Export failed: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Data export endpoint',
    supportedFormats: ['csv', 'json', 'gpx'],
    description: 'POST analysis data to export in specified format'
  });
}

function applyFilters(data: SailingAnalysis, options: ExportRequest['options']): SailingAnalysis {
  let filteredTrackPoints = data.trackPoints;
  let filteredManoeuvres = data.manoeuvres;

  // Apply speed filter
  if (options?.speedFilter) {
    filteredTrackPoints = filteredTrackPoints.filter(point =>
      point.sog >= options.speedFilter!.min && point.sog <= options.speedFilter!.max
    );
  }

  // Apply date range filter
  if (options?.dateRange) {
    filteredTrackPoints = filteredTrackPoints.filter(point =>
      point.utc >= options.dateRange!.start && point.utc <= options.dateRange!.end
    );
    filteredManoeuvres = filteredManoeuvres.filter(manoeuvre =>
      manoeuvre.timestamp >= options.dateRange!.start && manoeuvre.timestamp <= options.dateRange!.end
    );
  }

  return {
    ...data,
    trackPoints: filteredTrackPoints,
    manoeuvres: filteredManoeuvres
  };
}

function exportCSV(analysis: SailingAnalysis, options: ExportRequest['options']): NextResponse {
  let csvContent = '';

  // Track Points Section
  if (options?.includeTrackPoints !== false && analysis.trackPoints.length > 0) {
    csvContent += 'Track Points\n';
    const headers = [
      'timestamp_iso',
      'timestamp_utc',
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
    csvContent += headers.join(',') + '\n';

    analysis.trackPoints.forEach(point => {
      const row = [
        new Date(point.utc).toISOString(),
        point.utc,
        point.lat,
        point.lon,
        point.sog,
        point.cog,
        point.twd,
        point.tws,
        point.twa,
        `"${point.pos}"`,
        point.tack,
        point.manoeuvre || ''
      ];
      csvContent += row.join(',') + '\n';
    });
    csvContent += '\n';
  }

  // Manoeuvres Section
  if (options?.includeManoeuvres !== false && analysis.manoeuvres.length > 0) {
    csvContent += 'Manoeuvres\n';
    csvContent += 'timestamp_iso,timestamp_utc,type,start_twa,end_twa,duration_seconds\n';
    
    analysis.manoeuvres.forEach(manoeuvre => {
      const row = [
        new Date(manoeuvre.timestamp).toISOString(),
        manoeuvre.timestamp,
        manoeuvre.type,
        manoeuvre.startTwa || '',
        manoeuvre.endTwa || '',
        manoeuvre.duration || ''
      ];
      csvContent += row.join(',') + '\n';
    });
    csvContent += '\n';
  }

  // Summary Section
  if (options?.includeSummary !== false && analysis.summary) {
    csvContent += 'Summary Statistics\n';
    csvContent += 'metric,value,unit\n';
    csvContent += `total_distance,${analysis.summary.totalDistance},nautical_miles\n`;
    csvContent += `total_time,${analysis.summary.totalTime},minutes\n`;
    csvContent += `average_speed,${analysis.summary.averageSpeed},knots\n`;
    csvContent += `max_speed,${analysis.summary.maxSpeed},knots\n`;
    csvContent += `tack_count,${analysis.summary.tackCount},count\n`;
    csvContent += `gybe_count,${analysis.summary.gybeCount},count\n`;
    csvContent += `average_twa,${analysis.summary.averageTwa},degrees\n`;
  }

  const filename = `sailing-analysis-${new Date().toISOString().split('T')[0]}.csv`;
  
  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache'
    }
  });
}

function exportJSON(analysis: SailingAnalysis, options: ExportRequest['options']): NextResponse {
  const exportData: Partial<SailingAnalysis> & { metadata: ExportMetadata } = {
    metadata: {
      ...analysis.metadata,
      exportedAt: new Date().toISOString(),
      exportOptions: options
    }
  };

  if (options?.includeTrackPoints !== false) {
    exportData.trackPoints = analysis.trackPoints;
  }

  if (options?.includeManoeuvres !== false) {
    exportData.manoeuvres = analysis.manoeuvres;
  }

  if (options?.includeSummary !== false) {
    exportData.summary = analysis.summary;
  }

  const jsonContent = JSON.stringify(exportData, null, 2);
  const filename = `sailing-analysis-${new Date().toISOString().split('T')[0]}.json`;
  
  return new NextResponse(jsonContent, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache'
    }
  });
}

function exportGPX(analysis: SailingAnalysis, options: ExportRequest['options']): NextResponse {
  if (options?.includeTrackPoints === false || !analysis.trackPoints.length) {
    return NextResponse.json(
      { error: 'GPX export requires track points data' },
      { status: 400 }
    );
  }

  let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="CraccTracc" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <metadata>
    <name>CraccTracc Sailing Analysis Export</name>
    <desc>Processed sailing track data with wind analysis</desc>
    <time>${new Date().toISOString()}</time>
    <bounds minlat="${Math.min(...analysis.trackPoints.map(p => p.lat))}" 
            minlon="${Math.min(...analysis.trackPoints.map(p => p.lon))}" 
            maxlat="${Math.max(...analysis.trackPoints.map(p => p.lat))}" 
            maxlon="${Math.max(...analysis.trackPoints.map(p => p.lon))}" />
  </metadata>
  <trk>
    <name>Sailing Track</name>
    <desc>Track with sailing performance analysis</desc>
    <trkseg>
`;

  analysis.trackPoints.forEach(point => {
    gpxContent += `      <trkpt lat="${point.lat}" lon="${point.lon}">
        <time>${new Date(point.utc).toISOString()}</time>
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:speed>${point.sog * 0.514444}</gpxtpx:speed>
            <gpxtpx:course>${point.cog}</gpxtpx:course>
          </gpxtpx:TrackPointExtension>
          <sailing:extensions xmlns:sailing="http://cracctracc.com/xmlschemas/Sailing/v1">
            <sailing:trueWindDirection>${point.twd}</sailing:trueWindDirection>
            <sailing:trueWindSpeed>${point.tws}</sailing:trueWindSpeed>
            <sailing:trueWindAngle>${point.twa}</sailing:trueWindAngle>
            <sailing:pointOfSail>${point.pos}</sailing:pointOfSail>
            <sailing:tack>${point.tack}</sailing:tack>
            ${point.manoeuvre ? `<sailing:manoeuvre>${point.manoeuvre}</sailing:manoeuvre>` : ''}
          </sailing:extensions>
        </extensions>
      </trkpt>
`;
  });

  gpxContent += `    </trkseg>
  </trk>`;

  // Add waypoints for manoeuvres if included
  if (options?.includeManoeuvres !== false && analysis.manoeuvres.length > 0) {
    analysis.manoeuvres.forEach((manoeuvre, index) => {
      // Find closest track point to manoeuvre timestamp
      const closestPoint = analysis.trackPoints.reduce((prev, curr) =>
        Math.abs(curr.utc - manoeuvre.timestamp) < Math.abs(prev.utc - manoeuvre.timestamp) ? curr : prev
      );

      gpxContent += `
  <wpt lat="${closestPoint.lat}" lon="${closestPoint.lon}">
    <time>${new Date(manoeuvre.timestamp).toISOString()}</time>
    <name>${manoeuvre.type.toUpperCase()}_${index + 1}</name>
    <desc>${manoeuvre.type} manoeuvre - Duration: ${manoeuvre.duration || 'unknown'}s</desc>
    <type>sailing_manoeuvre</type>
  </wpt>`;
    });
  }

  gpxContent += `
</gpx>`;

  const filename = `sailing-track-${new Date().toISOString().split('T')[0]}.gpx`;
  
  return new NextResponse(gpxContent, {
    headers: {
      'Content-Type': 'application/gpx+xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache'
    }
  });
}