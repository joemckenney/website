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
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    wind_speed_10m: number[];
    cloud_cover: number[];
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
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,weather_code,shortwave_radiation&hourly=temperature_2m,precipitation_probability,wind_speed_10m,cloud_cover&temperature_unit=fahrenheit&wind_speed_unit=mph&forecast_days=1`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch weather data");
  }

  const data: OpenMeteoResponse = await response.json();

  // Get next 12 hours of forecast data
  const next12Hours = {
    temperature: data.hourly.temperature_2m.slice(0, 12),
    precipitationProbability: data.hourly.precipitation_probability.slice(0, 12),
    windSpeed: data.hourly.wind_speed_10m.slice(0, 12),
    cloudCover: data.hourly.cloud_cover.slice(0, 12),
  };

  return {
    temperature: data.current.temperature_2m,
    conditions: weatherCodeMap[data.current.weather_code] || "Unknown",
    windSpeed: data.current.wind_speed_10m,
    humidity: data.current.relative_humidity_2m,
    pressure: data.current.surface_pressure,
    location: {
      latitude: coords.latitude,
      longitude: coords.longitude,
    },
    hourly: next12Hours,
    solar: {
      shortwaveRadiation: data.current.shortwave_radiation || 0,
    },
  };
}
