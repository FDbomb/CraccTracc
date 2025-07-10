import { NextRequest, NextResponse } from 'next/server';

interface WeatherRequest {
  lat: number;
  lon: number;
  timestamp: number; // Unix timestamp
}

interface WeatherData {
  timestamp: number;
  windSpeed: number; // m/s
  windDirection: number; // degrees
  windGust?: number; // m/s
  temperature?: number; // Celsius
  pressure?: number; // hPa
  humidity?: number; // %
  visibility?: number; // km
  source: string;
}

interface WeatherResponse {
  success: boolean;
  data?: WeatherData;
  error?: string;
  cached?: boolean;
}

// Simple in-memory cache for weather data
const weatherCache = new Map<string, { data: WeatherData; expires: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WeatherRequest;
    const { lat, lon, timestamp } = body;

    if (!lat || !lon || !timestamp) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: lat, lon, timestamp',
        } as WeatherResponse,
        { status: 400 }
      );
    }

    // Validate coordinates
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid coordinates',
        } as WeatherResponse,
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}_${Math.floor(timestamp / 3600000)}`;
    const cached = weatherCache.get(cacheKey);

    if (cached && Date.now() < cached.expires) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true,
      } as WeatherResponse);
    }

    // Try to fetch weather data from multiple sources
    let weatherData: WeatherData | null = null;

    // Try OpenMeteo first (free service)
    weatherData = await fetchOpenMeteoWeather(lat, lon, timestamp);

    if (!weatherData) {
      // Fallback to mock data for development
      weatherData = generateMockWeatherData(lat, lon, timestamp);
    }

    // Cache the result
    weatherCache.set(cacheKey, {
      data: weatherData,
      expires: Date.now() + CACHE_DURATION,
    });

    return NextResponse.json({
      success: true,
      data: weatherData,
    } as WeatherResponse);
  } catch (error) {
    console.error('Weather fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch weather data',
      } as WeatherResponse,
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Weather data endpoint',
    description:
      'POST coordinates and timestamp to get historical weather data',
    parameters: {
      lat: 'Latitude (-90 to 90)',
      lon: 'Longitude (-180 to 180)',
      timestamp: 'Unix timestamp in milliseconds',
    },
    dataSources: ['Open-Meteo (primary)', 'Mock data (fallback)'],
  });
}

async function fetchOpenMeteoWeather(
  lat: number,
  lon: number,
  timestamp: number
): Promise<WeatherData | null> {
  try {
    const date = new Date(timestamp);
    const dateStr = date.toISOString().split('T')[0];

    // Open-Meteo historical weather API
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${dateStr}&end_date=${dateStr}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,surface_pressure,relative_humidity_2m&timezone=UTC`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CraccTracc/1.0 (sailing-analysis)',
      },
    });

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.hourly || !data.hourly.time) {
      throw new Error('Invalid response format from Open-Meteo');
    }

    // Find the closest hour to our timestamp
    const targetHour = Math.floor(timestamp / 3600000) * 3600000;
    const hourIndex = data.hourly.time.findIndex((timeStr: string) => {
      return new Date(timeStr).getTime() === targetHour;
    });

    if (hourIndex === -1) {
      throw new Error('No data available for requested time');
    }

    return {
      timestamp: targetHour,
      windSpeed: data.hourly.wind_speed_10m[hourIndex] || 0,
      windDirection: data.hourly.wind_direction_10m[hourIndex] || 0,
      windGust: data.hourly.wind_gusts_10m[hourIndex],
      temperature: data.hourly.temperature_2m[hourIndex],
      pressure: data.hourly.surface_pressure[hourIndex],
      humidity: data.hourly.relative_humidity_2m[hourIndex],
      source: 'Open-Meteo',
    };
  } catch (error) {
    console.warn('Open-Meteo fetch failed:', error);
    return null;
  }
}

function generateMockWeatherData(
  lat: number,
  lon: number,
  timestamp: number
): WeatherData {
  // Generate realistic mock weather data based on location and season
  const date = new Date(timestamp);
  const month = date.getMonth(); // 0-11
  const hour = date.getHours();

  // Seasonal wind patterns
  const isWinter = month >= 10 || month <= 2;
  const baseWindSpeed = isWinter ? 8 : 6; // Higher winds in winter

  // Daily wind variation (typically stronger in afternoon)
  const dailyVariation = Math.sin(((hour - 6) * Math.PI) / 12) * 0.3;

  // Location-based adjustments
  const latFactor = Math.abs(lat) / 90; // Higher latitudes = more wind
  const coastalEffect = Math.sin((lon * Math.PI) / 180) * 0.2; // Coastal approximation

  const windSpeed = Math.max(
    0,
    baseWindSpeed +
      (Math.random() - 0.5) * 4 + // Random variation ±2 m/s
      dailyVariation * 3 + // Daily cycle up to ±1.5 m/s
      latFactor * 3 + // Latitude effect up to 3 m/s
      coastalEffect * 2 // Coastal effect up to ±1 m/s
  );

  // Wind direction (prevailing westerlies adjusted by location)
  const baseDirection = 270; // West
  const windDirection =
    (baseDirection +
      (Math.random() - 0.5) * 60 + // Random ±30°
      lat * 0.5 + // Latitude effect
      Math.sin(timestamp / 86400000) * 20) % // Daily shift
    360;

  return {
    timestamp: Math.floor(timestamp / 3600000) * 3600000, // Round to hour
    windSpeed: Math.round(windSpeed * 10) / 10,
    windDirection: Math.round(windDirection),
    windGust: Math.round(windSpeed * (1.2 + Math.random() * 0.3) * 10) / 10,
    temperature:
      Math.round(
        (20 -
          month * 2 +
          Math.sin((hour * Math.PI) / 12) * 5 +
          (Math.random() - 0.5) * 6) *
          10
      ) / 10,
    pressure: Math.round((1013 + (Math.random() - 0.5) * 40) * 10) / 10,
    humidity: Math.round(60 + (Math.random() - 0.5) * 40),
    source: 'Mock Data',
  };
}

// Cleanup old cache entries
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function cleanupWeatherCache(): void {
  const now = Date.now();
  for (const [key, entry] of weatherCache.entries()) {
    if (now > entry.expires) {
      weatherCache.delete(key);
    }
  }
}
