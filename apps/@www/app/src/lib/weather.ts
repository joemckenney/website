import type { WeatherData } from "../types/weather";
import type { Coordinates } from "./geolocation";

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    surface_pressure: number;
    weather_code: number;
    shortwave_radiation?: number;
    apparent_temperature: number;
    dew_point_2m: number;
    cloud_cover: number;
    cloud_cover_low: number;
    cloud_cover_mid: number;
    cloud_cover_high: number;
    visibility: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
    uv_index: number;
    uv_index_clear_sky: number;
    is_day: number;
    cape: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    wind_speed_10m: number[];
    cloud_cover: number[];
    uv_index: number[];
    wind_direction_10m: number[];
    dew_point_2m: number[];
    cape: number[];
  };
}

// WMO Weather interpretation codes
const weatherCodeMap: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

export async function fetchWeatherData(
  coords: Coordinates,
): Promise<WeatherData> {
  // Expanded parameter list for richer audio synthesis
  const currentParams = [
    "temperature_2m",
    "relative_humidity_2m",
    "apparent_temperature",
    "dew_point_2m",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m",
    "surface_pressure",
    "cloud_cover",
    "cloud_cover_low",
    "cloud_cover_mid",
    "cloud_cover_high",
    "visibility",
    "weather_code",
    "shortwave_radiation",
    "uv_index",
    "uv_index_clear_sky",
    "is_day",
    "cape",
  ].join(",");

  const hourlyParams = [
    "temperature_2m",
    "precipitation_probability",
    "wind_speed_10m",
    "wind_direction_10m",
    "cloud_cover",
    "uv_index",
    "dew_point_2m",
    "cape",
  ].join(",");

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=${currentParams}&hourly=${hourlyParams}&temperature_unit=fahrenheit&wind_speed_unit=mph&forecast_days=1`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch weather data");
  }

  const data: OpenMeteoResponse = await response.json();

  // Log the raw API response for debugging
  console.log("Raw Open-Meteo API Response:");
  console.log(JSON.stringify(data, null, 2));

  // Get next 12 hours of forecast data
  const next12Hours = {
    temperature: data.hourly.temperature_2m.slice(0, 12),
    precipitationProbability: data.hourly.precipitation_probability.slice(
      0,
      12,
    ),
    windSpeed: data.hourly.wind_speed_10m.slice(0, 12),
    cloudCover: data.hourly.cloud_cover.slice(0, 12),
    uvIndex: data.hourly.uv_index.slice(0, 12),
    windDirection: data.hourly.wind_direction_10m.slice(0, 12),
    dewPoint: data.hourly.dew_point_2m.slice(0, 12),
    cape: data.hourly.cape.slice(0, 12),
  };

  return {
    temperature: data.current.temperature_2m,
    conditions: weatherCodeMap[data.current.weather_code] || "Unknown",
    windSpeed: data.current.wind_speed_10m,
    humidity: data.current.relative_humidity_2m,
    pressure: data.current.surface_pressure,
    apparentTemperature: data.current.apparent_temperature,
    dewPoint: data.current.dew_point_2m,
    cloudCover: data.current.cloud_cover,
    cloudCoverLow: data.current.cloud_cover_low,
    cloudCoverMid: data.current.cloud_cover_mid,
    cloudCoverHigh: data.current.cloud_cover_high,
    visibility: data.current.visibility,
    windDirection: data.current.wind_direction_10m,
    windGusts: data.current.wind_gusts_10m,
    uvIndex: data.current.uv_index,
    isDay: data.current.is_day,
    cape: data.current.cape,
    location: {
      latitude: coords.latitude,
      longitude: coords.longitude,
    },
    hourly: next12Hours,
    solar: {
      shortwaveRadiation: data.current.shortwave_radiation || 0,
      uvIndex: data.current.uv_index,
      uvIndexClearSky: data.current.uv_index_clear_sky,
    },
  };
}
