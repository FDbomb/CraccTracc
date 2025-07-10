'use client';

import { ManoeuvreEvent } from '../../lib/types/sailing';

interface ManoeuvreTableProps {
  manoeuvres: ManoeuvreEvent[];
}

export function ManoeuvreTable({ manoeuvres }: ManoeuvreTableProps) {
  if (!manoeuvres || manoeuvres.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Manoeuvres</h3>
        <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No manoeuvres detected</p>
        </div>
      </div>
    );
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A';
    return `${duration}s`;
  };

  const getManoeuvreIcon = (type: string) => {
    switch (type) {
      case 'tack': return '⟲';
      case 'gybe': return '⟳';
      case 'round_up': return '↗';
      case 'bear_away': return '↘';
      default: return '•';
    }
  };

  const getManoeuvreColor = (type: string) => {
    switch (type) {
      case 'tack': return 'text-blue-600 bg-blue-50';
      case 'gybe': return 'text-green-600 bg-green-50';
      case 'round_up': return 'text-orange-600 bg-orange-50';
      case 'bear_away': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Group by manoeuvre type for summary
  const summary = manoeuvres.reduce((acc, manoeuvre) => {
    acc[manoeuvre.type] = (acc[manoeuvre.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">Manoeuvres</h3>
      
      {/* Summary stats */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          {Object.entries(summary).map(([type, count]) => (
            <div key={type} className="text-center">
              <div className="font-medium text-gray-900">{count}</div>
              <div className="text-gray-600 capitalize">{type.replace('_', ' ')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Manoeuvres table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Start TWA
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                End TWA
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {manoeuvres.map((manoeuvre, index) => (
              <tr key={manoeuvre.id || index} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getManoeuvreColor(manoeuvre.type)}`}>
                    <span className="mr-1">{getManoeuvreIcon(manoeuvre.type)}</span>
                    {manoeuvre.type.replace('_', ' ')}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {formatTime(manoeuvre.timestamp)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {formatDuration(manoeuvre.duration)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {manoeuvre.startTwa ? `${manoeuvre.startTwa}°` : 'N/A'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {manoeuvre.endTwa ? `${manoeuvre.endTwa}°` : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {manoeuvres.length > 10 && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          Showing {manoeuvres.length} manoeuvres
        </div>
      )}
    </div>
  );
}