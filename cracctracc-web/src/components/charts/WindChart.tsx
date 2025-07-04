'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ProcessedTrackPoint } from '../../lib/types/sailing';

interface WindChartProps {
  data: ProcessedTrackPoint[];
}

export function WindChart({ data }: WindChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border">
        <p className="text-gray-500">No data available for wind chart</p>
      </div>
    );
  }

  // Prepare data for wind analysis chart
  const chartData = data.map((point, index) => ({
    index,
    twa: point.twa,
    twd: point.twd,
    tws: point.tws,
    speed: parseFloat(point.sog.toFixed(1)),
    pointOfSail: point.pos,
    time: new Date(point.utc).toLocaleTimeString(),
  }));

  // Color mapping for point of sail
  const getPointOfSailColor = (pos: string) => {
    switch (pos) {
      case 'Head to Wind': return '#ef4444';
      case 'Upwind': return '#f97316';
      case 'Reach': return '#eab308';
      case 'Downwind': return '#22c55e';
      default: return '#6b7280';
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">Wind Analysis</h3>
      
      {/* True Wind Angle over time */}
      <div className="h-48 mb-6">
        <h4 className="text-md font-medium mb-2">True Wind Angle Over Time</h4>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="index"
              label={{ value: 'Time Points', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              label={{ value: 'TWA (degrees)', angle: -90, position: 'insideLeft' }}
              domain={[-180, 180]}
            />
                         <Tooltip 
               formatter={(value: number, name: string) => [
                 `${value}°`, 
                 name === 'twa' ? 'True Wind Angle' : name
               ]}
              labelFormatter={(label) => `Point: ${label}`}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="twa" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={false}
              name="TWA"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Wind Speed and Boat Speed comparison */}
      <div className="h-48">
        <h4 className="text-md font-medium mb-2">Wind Speed vs Boat Speed</h4>
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
               formatter={(value: number, name: string) => [
                 `${value} knots`, 
                 name === 'tws' ? 'True Wind Speed' : 'Boat Speed'
               ]}
              labelFormatter={(label) => `Point: ${label}`}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="tws" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={false}
              name="Wind Speed"
            />
            <Line 
              type="monotone" 
              dataKey="speed" 
              stroke="#f59e0b" 
              strokeWidth={2}
              dot={false}
              name="Boat Speed"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Point of Sail distribution */}
      <div className="mt-4">
        <h4 className="text-md font-medium mb-2">Point of Sail Distribution</h4>
        <div className="flex flex-wrap gap-2">
          {['Head to Wind', 'Upwind', 'Reach', 'Downwind'].map(pos => {
            const count = chartData.filter(d => d.pointOfSail === pos).length;
            const percentage = ((count / chartData.length) * 100).toFixed(1);
            return (
              <div key={pos} className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: getPointOfSailColor(pos) }}
                />
                <span className="text-sm text-gray-700">
                  {pos}: {percentage}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}