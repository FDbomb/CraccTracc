'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { ProcessedTrackPoint } from '../../lib/types/sailing';

interface CourseChartProps {
  data: ProcessedTrackPoint[];
}

export function CourseChart({ data }: CourseChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border">
        <p className="text-gray-500">No data available for course chart</p>
      </div>
    );
  }

  // Prepare data for time series chart
  const chartData = data.map((point, index) => ({
    index,
    lat: parseFloat(point.lat.toFixed(6)),
    lon: parseFloat(point.lon.toFixed(6)),
    speed: parseFloat(point.sog.toFixed(1)),
    heading: point.cog,
    twa: point.twa,
    time: new Date(point.utc).toLocaleTimeString(),
    timestamp: point.utc
  }));

  // Calculate bounds for the track
  const lats = chartData.map(p => p.lat);
  const lons = chartData.map(p => p.lon);
  const latRange = [Math.min(...lats), Math.max(...lats)];
  const lonRange = [Math.min(...lons), Math.max(...lons)];

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">Course Track</h3>
      
      {/* Map-like view */}
      <div className="h-64 mb-6">
        <h4 className="text-md font-medium mb-2">Track Path (Lat/Lon)</h4>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="lon" 
              domain={lonRange}
              type="number"
              label={{ value: 'Longitude', position: 'insideBottom', offset: -5 }}
              tickFormatter={(value) => value.toFixed(4)}
            />
            <YAxis 
              dataKey="lat"
              domain={latRange}
              type="number"
              label={{ value: 'Latitude', angle: -90, position: 'insideLeft' }}
              tickFormatter={(value) => value.toFixed(4)}
            />
                         <Tooltip 
               formatter={(value: number | string, name: string) => [
                 typeof value === 'number' ? value.toFixed(6) : value, 
                 name
               ]}
              labelFormatter={(label) => `Point: ${label}`}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
            <Scatter 
              dataKey="lat" 
              fill="#2563eb"
              name="Track Points"
            />
          </ScatterChart>
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
               formatter={(value: number) => [value, 'Speed (knots)']}
               labelFormatter={(label) => `Point: ${label}`}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="speed" 
              stroke="#dc2626" 
              strokeWidth={2}
              dot={false}
              name="Speed"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}