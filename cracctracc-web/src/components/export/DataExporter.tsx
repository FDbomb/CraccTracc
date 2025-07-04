'use client';

import { useState } from 'react';
import { Download, Filter, FileText, Database } from 'lucide-react';
import { SailingAnalysis, ProcessedTrackPoint, ManoeuvreEvent } from '../../lib/types/sailing';

interface DataExporterProps {
  analysis: SailingAnalysis;
}

interface ExportOptions {
  format: 'json' | 'csv' | 'gpx';
  includeTrackPoints: boolean;
  includeManoeuvres: boolean;
  includeSummary: boolean;
  dateRange?: {
    start: number;
    end: number;
  };
  speedFilter?: {
    min: number;
    max: number;
  };
}

interface FilteredData {
  trackPoints: ProcessedTrackPoint[];
  manoeuvres: ManoeuvreEvent[];
  summary: SailingAnalysis['summary'];
  metadata: SailingAnalysis['metadata'];
}

export function DataExporter({ analysis }: DataExporterProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'json',
    includeTrackPoints: true,
    includeManoeuvres: true,
    includeSummary: true
  });

  const filterData = (options: ExportOptions): FilteredData => {
    let filteredTrackPoints = analysis.trackPoints;
    let filteredManoeuvres = analysis.manoeuvres;

    // Apply date range filter
    if (options.dateRange) {
      filteredTrackPoints = filteredTrackPoints.filter(
        point => point.utc >= options.dateRange!.start && point.utc <= options.dateRange!.end
      );
      filteredManoeuvres = filteredManoeuvres.filter(
        manoeuvre => manoeuvre.timestamp >= options.dateRange!.start && manoeuvre.timestamp <= options.dateRange!.end
      );
    }

    // Apply speed filter
    if (options.speedFilter) {
      filteredTrackPoints = filteredTrackPoints.filter(
        point => point.sog >= options.speedFilter!.min && point.sog <= options.speedFilter!.max
      );
    }

    return {
      trackPoints: filteredTrackPoints,
      manoeuvres: filteredManoeuvres,
      summary: analysis.summary,
      metadata: analysis.metadata
    };
  };

  const exportAsJSON = (data: FilteredData, filename: string) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    downloadBlob(blob, `${filename}.json`);
  };

  const exportAsCSV = (data: FilteredData, filename: string) => {
    let csvContent = '';

    if (exportOptions.includeTrackPoints && data.trackPoints) {
      csvContent += 'Track Points\n';
      csvContent += 'timestamp,latitude,longitude,speed_kts,course_deg,twa_deg,twd_deg,tws_kts,point_of_sail,tack\n';
      
      data.trackPoints.forEach((point: ProcessedTrackPoint) => {
        csvContent += [
          new Date(point.utc).toISOString(),
          point.lat,
          point.lon,
          point.sog,
          point.cog,
          point.twa,
          point.twd,
          point.tws,
          point.pos,
          point.tack
        ].join(',') + '\n';
      });
      csvContent += '\n';
    }

    if (exportOptions.includeManoeuvres && data.manoeuvres) {
      csvContent += 'Manoeuvres\n';
      csvContent += 'timestamp,type,start_twa,end_twa,duration_seconds\n';
      
      data.manoeuvres.forEach((manoeuvre: ManoeuvreEvent) => {
        csvContent += [
          new Date(manoeuvre.timestamp).toISOString(),
          manoeuvre.type,
          manoeuvre.startTwa || '',
          manoeuvre.endTwa || '',
          manoeuvre.duration || ''
        ].join(',') + '\n';
      });
      csvContent += '\n';
    }

    if (exportOptions.includeSummary && data.summary) {
      csvContent += 'Summary\n';
      csvContent += 'metric,value,unit\n';
      csvContent += `total_distance,${data.summary.totalDistance},nautical_miles\n`;
      csvContent += `total_time,${data.summary.totalTime},minutes\n`;
      csvContent += `average_speed,${data.summary.averageSpeed},knots\n`;
      csvContent += `max_speed,${data.summary.maxSpeed},knots\n`;
      csvContent += `tack_count,${data.summary.tackCount},count\n`;
      csvContent += `gybe_count,${data.summary.gybeCount},count\n`;
      csvContent += `average_twa,${data.summary.averageTwa},degrees\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    downloadBlob(blob, `${filename}.csv`);
  };

  const exportAsGPX = (data: FilteredData, filename: string) => {
    let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="CraccTracc" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>CraccTracc Sailing Analysis Export</name>
    <desc>Processed sailing track data</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>Sailing Track</name>
    <trkseg>
`;

    if (data.trackPoints) {
      data.trackPoints.forEach((point: ProcessedTrackPoint) => {
        gpxContent += `      <trkpt lat="${point.lat}" lon="${point.lon}">
        <time>${new Date(point.utc).toISOString()}</time>
        <extensions>
          <speed>${point.sog}</speed>
          <course>${point.cog}</course>
          <twa>${point.twa}</twa>
          <twd>${point.twd}</twd>
          <tws>${point.tws}</tws>
          <pointofsail>${point.pos}</pointofsail>
          <tack>${point.tack}</tack>
        </extensions>
      </trkpt>
`;
      });
    }

    gpxContent += `    </trkseg>
  </trk>
</gpx>`;

    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    downloadBlob(blob, `${filename}.gpx`);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const filteredData = filterData(exportOptions);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `cracctracc-sailing-data-${timestamp}`;

      switch (exportOptions.format) {
        case 'json':
          exportAsJSON(filteredData, filename);
          break;
        case 'csv':
          exportAsCSV(filteredData, filename);
          break;
        case 'gpx':
          exportAsGPX(filteredData, filename);
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const getDataSize = () => {
    const data = filterData(exportOptions);
    const trackPointsCount = exportOptions.includeTrackPoints ? data.trackPoints.length : 0;
    const manoeuvresCount = exportOptions.includeManoeuvres ? data.manoeuvres.length : 0;
    
    return {
      trackPoints: trackPointsCount,
      manoeuvres: manoeuvresCount,
      estimatedSize: Math.round((trackPointsCount * 0.2 + manoeuvresCount * 0.1) * 10) / 10 // Rough KB estimate
    };
  };

  const dataSize = getDataSize();

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Export Data</h3>
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="flex items-center px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          <Filter className="w-4 h-4 mr-1" />
          Options
        </button>
      </div>

      {showOptions && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
            <div className="flex gap-2">
              {(['json', 'csv', 'gpx'] as const).map(format => (
                <button
                  key={format}
                  onClick={() => setExportOptions(prev => ({ ...prev, format }))}
                  className={`px-3 py-1 text-sm rounded ${
                    exportOptions.format === format 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Include Data</label>
            <div className="space-y-2">
              {[
                { key: 'includeTrackPoints', label: 'Track Points', icon: FileText },
                { key: 'includeManoeuvres', label: 'Manoeuvres', icon: Database },
                { key: 'includeSummary', label: 'Summary Statistics', icon: Database }
              ].map(({ key, label, icon: Icon }) => (
                <label key={key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions[key as keyof ExportOptions] as boolean}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      [key]: e.target.checked 
                    }))}
                    className="mr-2"
                  />
                  <Icon className="w-4 h-4 mr-1" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Speed (kts)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  speedFilter: { 
                    ...prev.speedFilter, 
                    min: parseFloat(e.target.value) || 0,
                    max: prev.speedFilter?.max || 50
                  }
                }))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Speed (kts)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="50"
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  speedFilter: { 
                    min: prev.speedFilter?.min || 0,
                    max: parseFloat(e.target.value) || 50
                  }
                }))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <p>{dataSize.trackPoints} track points, {dataSize.manoeuvres} manoeuvres</p>
          <p>Estimated size: ~{dataSize.estimatedSize} KB</p>
        </div>
        
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isExporting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          {isExporting ? 'Exporting...' : 'Export'}
        </button>
      </div>
    </div>
  );
}