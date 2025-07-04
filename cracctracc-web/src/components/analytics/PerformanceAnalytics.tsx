'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { ProcessedTrackPoint, ManoeuvreEvent } from '../../lib/types/sailing';

interface PerformanceAnalyticsProps {
  trackPoints: ProcessedTrackPoint[];
  manoeuvres: ManoeuvreEvent[];
}

interface PerformanceMetrics {
  vmgAnalysis: {
    avgVMG: number;
    bestVMGUpwind: number;
    bestVMGDownwind: number;
    vmgEfficiency: number;
  };
  speedAnalysis: {
    speedByPointOfSail: { [key: string]: { avg: number; max: number; count: number } };
    speedDistribution: { range: string; count: number; percentage: number }[];
  };
  tacticAnalysis: {
    tackingAngle: number;
    avgTackDuration: number;
    tackingEfficiency: number;
    preferredTack: string;
  };
  timeAnalysis: {
    timeByPointOfSail: { [key: string]: number };
    timeByTack: { port: number; starboard: number };
  };
}

export function PerformanceAnalytics({ trackPoints, manoeuvres }: PerformanceAnalyticsProps) {
  const metrics = useMemo((): PerformanceMetrics => {
    if (!trackPoints.length) {
      return {
        vmgAnalysis: { avgVMG: 0, bestVMGUpwind: 0, bestVMGDownwind: 0, vmgEfficiency: 0 },
        speedAnalysis: { speedByPointOfSail: {}, speedDistribution: [] },
        tacticAnalysis: { tackingAngle: 0, avgTackDuration: 0, tackingEfficiency: 0, preferredTack: 'Port' },
        timeAnalysis: { timeByPointOfSail: {}, timeByTack: { port: 0, starboard: 0 } }
      };
    }

    // VMG Analysis
    const vmgData = trackPoints.map(point => {
      const vmg = point.sog * Math.cos(Math.abs(point.twa) * Math.PI / 180);
      return { ...point, vmg };
    });

    const avgVMG = vmgData.reduce((sum, p) => sum + p.vmg, 0) / vmgData.length;
    const upwindVMG = vmgData.filter(p => Math.abs(p.twa) <= 90);
    const downwindVMG = vmgData.filter(p => Math.abs(p.twa) > 90);
    
    const bestVMGUpwind = upwindVMG.length > 0 ? Math.max(...upwindVMG.map(p => p.vmg)) : 0;
    const bestVMGDownwind = downwindVMG.length > 0 ? Math.max(...downwindVMG.map(p => Math.abs(p.vmg))) : 0;
    const vmgEfficiency = avgVMG / (trackPoints.reduce((sum, p) => sum + p.sog, 0) / trackPoints.length) * 100;

    // Speed Analysis by Point of Sail
    const speedByPointOfSail: { [key: string]: { avg: number; max: number; count: number } } = {};
    const posGroups = trackPoints.reduce((groups, point) => {
      if (!groups[point.pos]) groups[point.pos] = [];
      groups[point.pos].push(point);
      return groups;
    }, {} as { [key: string]: ProcessedTrackPoint[] });

    Object.entries(posGroups).forEach(([pos, points]) => {
      const speeds = points.map(p => p.sog);
      speedByPointOfSail[pos] = {
        avg: speeds.reduce((sum, s) => sum + s, 0) / speeds.length,
        max: Math.max(...speeds),
        count: points.length
      };
    });

    // Speed Distribution
    const speedRanges = [
      { min: 0, max: 2, label: '0-2 kts' },
      { min: 2, max: 4, label: '2-4 kts' },
      { min: 4, max: 6, label: '4-6 kts' },
      { min: 6, max: 8, label: '6-8 kts' },
      { min: 8, max: 10, label: '8-10 kts' },
      { min: 10, max: 50, label: '10+ kts' }
    ];

    const speedDistribution = speedRanges.map(range => {
      const count = trackPoints.filter(p => p.sog >= range.min && p.sog < range.max).length;
      return {
        range: range.label,
        count,
        percentage: (count / trackPoints.length) * 100
      };
    });

    // Tacking Analysis
    const tacks = manoeuvres.filter(m => m.type === 'tack');
    const tackingAngle = tacks.length > 0 
      ? tacks.reduce((sum, t) => sum + Math.abs((t.endTwa || 0) - (t.startTwa || 0)), 0) / tacks.length 
      : 0;
    
    const avgTackDuration = tacks.length > 0 
      ? tacks.reduce((sum, t) => sum + (t.duration || 0), 0) / tacks.length 
      : 0;

    const tackingEfficiency = tackingAngle > 0 ? (180 - tackingAngle) / 180 * 100 : 0;

    // Time Analysis
    const totalTime = trackPoints.length > 1 
      ? (trackPoints[trackPoints.length - 1].utc - trackPoints[0].utc) / 1000 
      : 0;

    const timeByPointOfSail: { [key: string]: number } = {};
    Object.keys(speedByPointOfSail).forEach(pos => {
      timeByPointOfSail[pos] = (speedByPointOfSail[pos].count / trackPoints.length) * totalTime;
    });

    const portTime = trackPoints.filter(p => p.tack === 'Port').length / trackPoints.length * totalTime;
    const starboardTime = trackPoints.filter(p => p.tack === 'Starboard').length / trackPoints.length * totalTime;

    const preferredTack = portTime > starboardTime ? 'Port' : 'Starboard';

    return {
      vmgAnalysis: { avgVMG, bestVMGUpwind, bestVMGDownwind, vmgEfficiency },
      speedAnalysis: { speedByPointOfSail, speedDistribution },
      tacticAnalysis: { tackingAngle, avgTackDuration, tackingEfficiency, preferredTack },
      timeAnalysis: { timeByPointOfSail, timeByTack: { port: portTime, starboard: starboardTime } }
    };
  }, [trackPoints, manoeuvres]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const speedByPosData = Object.entries(metrics.speedAnalysis.speedByPointOfSail).map(([pos, data]) => ({
    pointOfSail: pos,
    avgSpeed: Number(data.avg.toFixed(1)),
    maxSpeed: Number(data.max.toFixed(1)),
    count: data.count
  }));

  const timeByPosData = Object.entries(metrics.timeAnalysis.timeByPointOfSail).map(([pos, time]) => ({
    pointOfSail: pos,
    time: Number((time / 60).toFixed(1)), // Convert to minutes
    percentage: Number(((time / (metrics.timeAnalysis.timeByTack.port + metrics.timeAnalysis.timeByTack.starboard)) * 100).toFixed(1))
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-6">
      {/* VMG Analysis */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">VMG (Velocity Made Good) Analysis</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{metrics.vmgAnalysis.avgVMG.toFixed(1)}</div>
            <div className="text-sm text-gray-600">Average VMG (kts)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{metrics.vmgAnalysis.bestVMGUpwind.toFixed(1)}</div>
            <div className="text-sm text-gray-600">Best Upwind VMG</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{metrics.vmgAnalysis.bestVMGDownwind.toFixed(1)}</div>
            <div className="text-sm text-gray-600">Best Downwind VMG</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{metrics.vmgAnalysis.vmgEfficiency.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">VMG Efficiency</div>
          </div>
        </div>
      </div>

      {/* Speed by Point of Sail */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Speed by Point of Sail</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={speedByPosData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="pointOfSail" />
              <YAxis label={{ value: 'Speed (kts)', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${value} kts`, 
                  name === 'avgSpeed' ? 'Average Speed' : 'Max Speed'
                ]}
              />
              <Legend />
              <Bar dataKey="avgSpeed" fill="#8884d8" name="Average Speed" />
              <Bar dataKey="maxSpeed" fill="#82ca9d" name="Max Speed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Time Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Time by Point of Sail</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={timeByPosData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ pointOfSail, percentage }) => `${pointOfSail}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="time"
                >
                  {timeByPosData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} min`, 'Time']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Tacking Analysis</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{metrics.tacticAnalysis.tackingAngle.toFixed(0)}°</div>
                <div className="text-sm text-gray-600">Average Tacking Angle</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{metrics.tacticAnalysis.avgTackDuration.toFixed(1)}s</div>
                <div className="text-sm text-gray-600">Average Tack Duration</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{metrics.tacticAnalysis.tackingEfficiency.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Tacking Efficiency</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{metrics.tacticAnalysis.preferredTack}</div>
                <div className="text-sm text-gray-600">Preferred Tack</div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <div className="text-sm">
                <div className="flex justify-between mb-1">
                  <span>Port Tack:</span>
                  <span>{formatTime(metrics.timeAnalysis.timeByTack.port)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Starboard Tack:</span>
                  <span>{formatTime(metrics.timeAnalysis.timeByTack.starboard)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Speed Distribution */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Speed Distribution</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics.speedAnalysis.speedDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  value, 
                  name === 'count' ? 'Data Points' : name
                ]}
              />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}