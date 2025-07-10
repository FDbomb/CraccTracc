'use client';

import { useState, useEffect } from 'react';
import { SailingAnalysis, ProcessedTrackPoint } from '../../lib/types/sailing';
import { Wind, Thermometer, Eye, BarChart3, RefreshCw } from 'lucide-react';

interface WeatherIntegrationProps {
  analysisData: SailingAnalysis;
}

interface WeatherData {
  timestamp: number;
  windSpeed: number;
  windDirection: number;
  windGust?: number;
  temperature?: number;
  pressure?: number;
  humidity?: number;
  visibility?: number;
  source: string;
}

interface WeatherAnalysis {
  averageWindSpeed: number;
  averageWindDirection: number;
  windSpeedRange: { min: number; max: number };
  temperatureRange?: { min: number; max: number };
  weatherSummary: string;
  dataPoints: number;
  coverage: number; // percentage of track covered by weather data
}

export function WeatherIntegration({ analysisData }: WeatherIntegrationProps) {
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weatherAnalysis, setWeatherAnalysis] = useState<WeatherAnalysis | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const fetchWeatherData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Sample weather requests from track points (every 30 minutes to avoid API limits)
      const samplePoints = sampleTrackPoints(analysisData.trackPoints, 30);
      
      const weatherPromises = samplePoints.map(async (point) => {
        try {
          const response = await fetch('/api/weather', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              lat: point.lat,
              lon: point.lon,
              timestamp: point.utc
            })
          });

          if (!response.ok) {
            throw new Error(`Weather API error: ${response.status}`);
          }

          const result = await response.json();
          return result.success ? result.data : null;
        } catch (err) {
          console.warn('Failed to fetch weather for point:', err);
          return null;
        }
      });

      const results = await Promise.all(weatherPromises);
      const validWeatherData = results.filter((data): data is WeatherData => data !== null);
      
      setWeatherData(validWeatherData);
      setWeatherAnalysis(analyzeWeatherData(validWeatherData, analysisData.trackPoints));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  };

  const compareWindData = () => {
    if (weatherData.length === 0) return null;

    const trackWinds = analysisData.trackPoints.map(p => ({
      time: p.utc,
      calculatedSpeed: p.tws,
      calculatedDirection: p.twd
    }));

    const weatherWinds = weatherData.map(w => ({
      time: w.timestamp,
      observedSpeed: w.windSpeed * 1.943844, // Convert m/s to knots
      observedDirection: w.windDirection
    }));

    // Find matching time periods and compare
    const comparisons = trackWinds
      .map(track => {
        const closestWeather = weatherWinds.reduce((prev, curr) => 
          Math.abs(curr.time - track.time) < Math.abs(prev.time - track.time) ? curr : prev
        );
        
        const timeDiff = Math.abs(closestWeather.time - track.time) / (1000 * 60 * 60); // hours
        if (timeDiff > 2) return null; // Only compare if within 2 hours
        
        return {
          time: track.time,
          speedDiff: track.calculatedSpeed - closestWeather.observedSpeed,
          directionDiff: normalizeAngleDifference(track.calculatedDirection - closestWeather.observedDirection),
          calculated: track,
          observed: closestWeather
        };
      })
      .filter(Boolean);

    return comparisons;
  };

  useEffect(() => {
    // Auto-fetch weather data when component mounts
    if (analysisData.trackPoints.length > 0) {
      fetchWeatherData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisData]);

  const windComparison = compareWindData();

  return (
    <div className="space-y-6">
      {/* Weather Data Overview */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-medium text-gray-900">Historical Weather Data</h4>
          <p className="text-sm text-gray-600">
            Compare calculated wind with actual weather conditions
          </p>
        </div>
        <button
          onClick={fetchWeatherData}
          disabled={loading}
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Fetching...' : 'Refresh'}
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Fetching weather data...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Weather Analysis Results */}
      {weatherAnalysis && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Wind className="w-5 h-5 text-blue-600 mr-2" />
              <h5 className="font-medium text-blue-900">Average Wind</h5>
            </div>
            <p className="text-2xl font-bold text-blue-800">
              {weatherAnalysis.averageWindSpeed.toFixed(1)} kts
            </p>
            <p className="text-sm text-blue-600">
              From {weatherAnalysis.averageWindDirection.toFixed(0)}°
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <BarChart3 className="w-5 h-5 text-green-600 mr-2" />
              <h5 className="font-medium text-green-900">Wind Range</h5>
            </div>
            <p className="text-2xl font-bold text-green-800">
              {weatherAnalysis.windSpeedRange.min.toFixed(1)} - {weatherAnalysis.windSpeedRange.max.toFixed(1)}
            </p>
            <p className="text-sm text-green-600">knots</p>
          </div>

          {weatherAnalysis.temperatureRange && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Thermometer className="w-5 h-5 text-orange-600 mr-2" />
                <h5 className="font-medium text-orange-900">Temperature</h5>
              </div>
              <p className="text-2xl font-bold text-orange-800">
                {weatherAnalysis.temperatureRange.min.toFixed(0)}° - {weatherAnalysis.temperatureRange.max.toFixed(0)}°
              </p>
              <p className="text-sm text-orange-600">Celsius</p>
            </div>
          )}

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Eye className="w-5 h-5 text-purple-600 mr-2" />
              <h5 className="font-medium text-purple-900">Data Coverage</h5>
            </div>
            <p className="text-2xl font-bold text-purple-800">
              {weatherAnalysis.coverage.toFixed(0)}%
            </p>
            <p className="text-sm text-purple-600">
              {weatherAnalysis.dataPoints} points
            </p>
          </div>
        </div>
      )}

      {/* Weather Summary */}
      {weatherAnalysis && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-2">Weather Summary</h5>
          <p className="text-gray-700">{weatherAnalysis.weatherSummary}</p>
        </div>
      )}

      {/* Wind Comparison */}
      {windComparison && windComparison.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="font-medium text-gray-900">Wind Calculation vs Observations</h5>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          {/* Comparison Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h6 className="font-medium text-gray-800 mb-2">Speed Accuracy</h6>
              <div className="space-y-1">
                {(() => {
                  const speedDiffs = windComparison.map(c => Math.abs(c!.speedDiff));
                  const avgError = speedDiffs.reduce((a, b) => a + b, 0) / speedDiffs.length;
                  const accuracy = Math.max(0, 100 - (avgError / 5) * 100); // Assume 5kts = 0% accuracy
                  
                  return (
                    <>
                      <p className="text-sm text-gray-600">
                        Average error: {avgError.toFixed(1)} kts
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${accuracy}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500">{accuracy.toFixed(0)}% accuracy</p>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h6 className="font-medium text-gray-800 mb-2">Direction Accuracy</h6>
              <div className="space-y-1">
                {(() => {
                  const directionDiffs = windComparison.map(c => Math.abs(c!.directionDiff));
                  const avgError = directionDiffs.reduce((a, b) => a + b, 0) / directionDiffs.length;
                  const accuracy = Math.max(0, 100 - (avgError / 30) * 100); // Assume 30° = 0% accuracy
                  
                  return (
                    <>
                      <p className="text-sm text-gray-600">
                        Average error: {avgError.toFixed(0)}°
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${accuracy}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500">{accuracy.toFixed(0)}% accuracy</p>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Detailed Comparison Table */}
          {showDetails && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h6 className="font-medium text-gray-900">Detailed Comparison</h6>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Time</th>
                      <th className="px-4 py-2 text-right">Calc Speed</th>
                      <th className="px-4 py-2 text-right">Obs Speed</th>
                      <th className="px-4 py-2 text-right">Calc Dir</th>
                      <th className="px-4 py-2 text-right">Obs Dir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {windComparison.slice(0, 20).map((comp, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          {new Date(comp!.time).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {comp!.calculated.calculatedSpeed.toFixed(1)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {comp!.observed.observedSpeed.toFixed(1)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {comp!.calculated.calculatedDirection.toFixed(0)}°
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {comp!.observed.observedDirection.toFixed(0)}°
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data Sources */}
      {weatherData.length > 0 && (
        <div className="text-sm text-gray-600">
          <p>
            Weather data sources: {Array.from(new Set(weatherData.map(w => w.source))).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}

// Helper functions
function sampleTrackPoints(points: ProcessedTrackPoint[], intervalMinutes: number): ProcessedTrackPoint[] {
  if (points.length === 0) return [];
  
  const intervalMs = intervalMinutes * 60 * 1000;
  const sampled = [points[0]]; // Always include first point
  
  let lastTime = points[0].utc;
  
  for (const point of points) {
    if (point.utc - lastTime >= intervalMs) {
      sampled.push(point);
      lastTime = point.utc;
    }
  }
  
  // Always include last point
  if (sampled[sampled.length - 1] !== points[points.length - 1]) {
    sampled.push(points[points.length - 1]);
  }
  
  return sampled;
}

function analyzeWeatherData(weatherData: WeatherData[], trackPoints: ProcessedTrackPoint[]): WeatherAnalysis {
  if (weatherData.length === 0) {
    return {
      averageWindSpeed: 0,
      averageWindDirection: 0,
      windSpeedRange: { min: 0, max: 0 },
      weatherSummary: 'No weather data available',
      dataPoints: 0,
      coverage: 0
    };
  }

  const windSpeeds = weatherData.map(w => w.windSpeed * 1.943844); // Convert to knots
  const windDirections = weatherData.map(w => w.windDirection);
  const temperatures = weatherData.filter(w => w.temperature !== undefined).map(w => w.temperature!);

  const avgWindSpeed = windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length;
  const avgWindDirection = calculateCircularMean(windDirections);
  
  const coverage = Math.min(100, (weatherData.length / Math.max(1, trackPoints.length / 30)) * 100);

  let summary = `Conditions during your sail: `;
  
  if (avgWindSpeed < 5) {
    summary += 'Light winds';
  } else if (avgWindSpeed < 15) {
    summary += 'Moderate winds';
  } else if (avgWindSpeed < 25) {
    summary += 'Fresh winds';
  } else {
    summary += 'Strong winds';
  }
  
  summary += ` averaging ${avgWindSpeed.toFixed(1)} knots from ${avgWindDirection.toFixed(0)}°.`;
  
  if (temperatures.length > 0) {
    const avgTemp = temperatures.reduce((a, b) => a + b, 0) / temperatures.length;
    summary += ` Temperature averaged ${avgTemp.toFixed(1)}°C.`;
  }

  return {
    averageWindSpeed: avgWindSpeed,
    averageWindDirection: avgWindDirection,
    windSpeedRange: {
      min: Math.min(...windSpeeds),
      max: Math.max(...windSpeeds)
    },
    temperatureRange: temperatures.length > 0 ? {
      min: Math.min(...temperatures),
      max: Math.max(...temperatures)
    } : undefined,
    weatherSummary: summary,
    dataPoints: weatherData.length,
    coverage
  };
}

function calculateCircularMean(angles: number[]): number {
  const radians = angles.map(a => a * Math.PI / 180);
  const x = radians.reduce((sum, angle) => sum + Math.cos(angle), 0) / radians.length;
  const y = radians.reduce((sum, angle) => sum + Math.sin(angle), 0) / radians.length;
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function normalizeAngleDifference(diff: number): number {
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return diff;
}