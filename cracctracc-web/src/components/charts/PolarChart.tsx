'use client';

import { ProcessedTrackPoint } from '../../lib/types/sailing';

interface PolarChartProps {
  data: ProcessedTrackPoint[];
  title?: string;
}

export function PolarChart({ data, title = "Polar Speed Chart" }: PolarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border">
        <p className="text-gray-500">No data available for polar chart</p>
      </div>
    );
  }

  // Calculate some basic statistics for display
  const speeds = data.map(point => point.sog);
  const avgSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
  const maxSpeed = Math.max(...speeds);
  const twaValues = data.map(point => Math.abs(point.twa));
  const avgTwa = twaValues.reduce((sum, twa) => sum + twa, 0) / twaValues.length;

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg mb-4">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-gray-600">Polar Chart (Coming Soon)</p>
          <p className="text-sm text-gray-500">Interactive polar speed visualization will be available in a future update</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-blue-600">{avgSpeed.toFixed(1)}</div>
          <div className="text-sm text-gray-600">Avg Speed (kts)</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-green-600">{maxSpeed.toFixed(1)}</div>
          <div className="text-sm text-gray-600">Max Speed (kts)</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-purple-600">{avgTwa.toFixed(0)}°</div>
          <div className="text-sm text-gray-600">Avg TWA</div>
        </div>
      </div>
    </div>
  );
}