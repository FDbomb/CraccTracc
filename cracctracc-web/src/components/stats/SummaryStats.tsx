'use client';

import { SailingAnalysis } from '../../lib/types/sailing';
import { Clock, Navigation, Wind, TrendingUp } from 'lucide-react';

interface SummaryStatsProps {
  analysis: SailingAnalysis;
}

export function SummaryStats({ analysis }: SummaryStatsProps) {
  const { summary, manoeuvres } = analysis;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const stats = [
    {
      label: 'Total Distance',
      value: `${summary.totalDistance} nm`,
      icon: Navigation,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Duration',
      value: formatTime(summary.totalTime),
      icon: Clock,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'Average Speed',
      value: `${summary.averageSpeed} kts`,
      icon: TrendingUp,
      color: 'text-orange-600 bg-orange-50',
    },
    {
      label: 'Max Speed',
      value: `${summary.maxSpeed} kts`,
      icon: TrendingUp,
      color: 'text-red-600 bg-red-50',
    },
    {
      label: 'Tacks',
      value: summary.tackCount.toString(),
      icon: Wind,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      label: 'Gybes',
      value: summary.gybeCount.toString(),
      icon: Wind,
      color: 'text-indigo-600 bg-indigo-50',
    },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Sailing Session Summary</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="text-center">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${stat.color} mb-2`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Additional metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {summary.averageTwa}°
          </div>
          <div className="text-sm text-gray-600">Average TWA</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {manoeuvres.length}
          </div>
          <div className="text-sm text-gray-600">Total Manoeuvres</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {analysis.trackPoints.length}
          </div>
          <div className="text-sm text-gray-600">Track Points</div>
        </div>
      </div>
    </div>
  );
}