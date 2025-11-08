import type { WeatherData } from "../types/weather";

export interface WeatherChange {
  parameter: string;
  oldValue: string;
  newValue: string;
  description: string;
}

/**
 * Compare two weather data objects and return a list of meaningful changes
 */
export function compareWeather(
  previous: WeatherData,
  current: WeatherData,
  threshold: {
    temperature?: number;
    windSpeed?: number;
    windDirection?: number;
    humidity?: number;
    pressure?: number;
    cloudCover?: number;
    visibility?: number;
    uvIndex?: number;
    cape?: number;
  } = {}
): WeatherChange[] {
  const changes: WeatherChange[] = [];

  // Default thresholds for meaningful changes
  const thresholds = {
    temperature: threshold.temperature ?? 1, // 1°F
    windSpeed: threshold.windSpeed ?? 2, // 2 mph
    windDirection: threshold.windDirection ?? 15, // 15 degrees
    humidity: threshold.humidity ?? 5, // 5%
    pressure: threshold.pressure ?? 2, // 2 hPa
    cloudCover: threshold.cloudCover ?? 10, // 10%
    visibility: threshold.visibility ?? 1000, // 1000 meters
    uvIndex: threshold.uvIndex ?? 1, // 1 UV index point
    cape: threshold.cape ?? 100, // 100 J/kg
  };

  // Temperature change
  const tempDiff = current.temperature - previous.temperature;
  if (Math.abs(tempDiff) >= thresholds.temperature) {
    changes.push({
      parameter: "temperature",
      oldValue: `${previous.temperature.toFixed(1)}°F`,
      newValue: `${current.temperature.toFixed(1)}°F`,
      description: tempDiff > 0
        ? `Temperature increased from ${previous.temperature.toFixed(1)}°F to ${current.temperature.toFixed(1)}°F`
        : `Temperature decreased from ${previous.temperature.toFixed(1)}°F to ${current.temperature.toFixed(1)}°F`,
    });
  }

  // Weather conditions change (text comparison)
  if (previous.conditions !== current.conditions) {
    changes.push({
      parameter: "conditions",
      oldValue: previous.conditions,
      newValue: current.conditions,
      description: `Weather conditions changed from "${previous.conditions}" to "${current.conditions}"`,
    });
  }

  // Wind speed change
  const windSpeedDiff = current.windSpeed - previous.windSpeed;
  if (Math.abs(windSpeedDiff) >= thresholds.windSpeed) {
    changes.push({
      parameter: "windSpeed",
      oldValue: `${previous.windSpeed.toFixed(1)} mph`,
      newValue: `${current.windSpeed.toFixed(1)} mph`,
      description: windSpeedDiff > 0
        ? `Wind speed increased from ${previous.windSpeed.toFixed(1)} mph to ${current.windSpeed.toFixed(1)} mph`
        : `Wind speed decreased from ${previous.windSpeed.toFixed(1)} mph to ${current.windSpeed.toFixed(1)} mph`,
    });
  }

  // Wind direction change
  const windDirDiff = Math.abs(current.windDirection - previous.windDirection);
  // Handle wrapping (e.g., 350° to 10° is only 20° difference)
  const normalizedDiff = windDirDiff > 180 ? 360 - windDirDiff : windDirDiff;
  if (normalizedDiff >= thresholds.windDirection) {
    changes.push({
      parameter: "windDirection",
      oldValue: `${previous.windDirection.toFixed(0)}°`,
      newValue: `${current.windDirection.toFixed(0)}°`,
      description: `Wind direction shifted from ${previous.windDirection.toFixed(0)}° to ${current.windDirection.toFixed(0)}° (${getCompassDirection(previous.windDirection)} → ${getCompassDirection(current.windDirection)})`,
    });
  }

  // Wind gusts change
  const gustDiff = current.windGusts - previous.windGusts;
  if (Math.abs(gustDiff) >= thresholds.windSpeed) {
    changes.push({
      parameter: "windGusts",
      oldValue: `${previous.windGusts.toFixed(1)} mph`,
      newValue: `${current.windGusts.toFixed(1)} mph`,
      description: gustDiff > 0
        ? `Wind gusts increased from ${previous.windGusts.toFixed(1)} mph to ${current.windGusts.toFixed(1)} mph`
        : `Wind gusts decreased from ${previous.windGusts.toFixed(1)} mph to ${current.windGusts.toFixed(1)} mph`,
    });
  }

  // Humidity change
  const humidityDiff = current.humidity - previous.humidity;
  if (Math.abs(humidityDiff) >= thresholds.humidity) {
    changes.push({
      parameter: "humidity",
      oldValue: `${previous.humidity.toFixed(0)}%`,
      newValue: `${current.humidity.toFixed(0)}%`,
      description: humidityDiff > 0
        ? `Humidity increased from ${previous.humidity.toFixed(0)}% to ${current.humidity.toFixed(0)}%`
        : `Humidity decreased from ${previous.humidity.toFixed(0)}% to ${current.humidity.toFixed(0)}%`,
    });
  }

  // Cloud cover change
  const cloudDiff = current.cloudCover - previous.cloudCover;
  if (Math.abs(cloudDiff) >= thresholds.cloudCover) {
    changes.push({
      parameter: "cloudCover",
      oldValue: `${previous.cloudCover.toFixed(0)}%`,
      newValue: `${current.cloudCover.toFixed(0)}%`,
      description: cloudDiff > 0
        ? `Cloud cover increased from ${previous.cloudCover.toFixed(0)}% to ${current.cloudCover.toFixed(0)}%`
        : `Cloud cover decreased from ${previous.cloudCover.toFixed(0)}% to ${current.cloudCover.toFixed(0)}%`,
    });
  }

  // Visibility change
  const visibilityDiff = current.visibility - previous.visibility;
  if (Math.abs(visibilityDiff) >= thresholds.visibility) {
    changes.push({
      parameter: "visibility",
      oldValue: `${(previous.visibility / 1000).toFixed(1)} km`,
      newValue: `${(current.visibility / 1000).toFixed(1)} km`,
      description: visibilityDiff > 0
        ? `Visibility improved from ${(previous.visibility / 1000).toFixed(1)} km to ${(current.visibility / 1000).toFixed(1)} km`
        : `Visibility decreased from ${(previous.visibility / 1000).toFixed(1)} km to ${(current.visibility / 1000).toFixed(1)} km`,
    });
  }

  // UV Index change
  const uvDiff = current.uvIndex - previous.uvIndex;
  if (Math.abs(uvDiff) >= thresholds.uvIndex) {
    changes.push({
      parameter: "uvIndex",
      oldValue: `${previous.uvIndex.toFixed(1)}`,
      newValue: `${current.uvIndex.toFixed(1)}`,
      description: uvDiff > 0
        ? `UV index increased from ${previous.uvIndex.toFixed(1)} to ${current.uvIndex.toFixed(1)}`
        : `UV index decreased from ${previous.uvIndex.toFixed(1)} to ${current.uvIndex.toFixed(1)}`,
    });
  }

  // Pressure change
  const pressureDiff = current.pressure - previous.pressure;
  if (Math.abs(pressureDiff) >= thresholds.pressure) {
    changes.push({
      parameter: "pressure",
      oldValue: `${previous.pressure.toFixed(1)} hPa`,
      newValue: `${current.pressure.toFixed(1)} hPa`,
      description: pressureDiff > 0
        ? `Atmospheric pressure increased from ${previous.pressure.toFixed(1)} hPa to ${current.pressure.toFixed(1)} hPa`
        : `Atmospheric pressure decreased from ${previous.pressure.toFixed(1)} hPa to ${current.pressure.toFixed(1)} hPa`,
    });
  }

  // CAPE change (atmospheric instability)
  const capeDiff = current.cape - previous.cape;
  if (Math.abs(capeDiff) >= thresholds.cape) {
    changes.push({
      parameter: "cape",
      oldValue: `${previous.cape.toFixed(0)} J/kg`,
      newValue: `${current.cape.toFixed(0)} J/kg`,
      description: capeDiff > 0
        ? `Atmospheric instability (CAPE) increased from ${previous.cape.toFixed(0)} J/kg to ${current.cape.toFixed(0)} J/kg`
        : `Atmospheric instability (CAPE) decreased from ${previous.cape.toFixed(0)} J/kg to ${current.cape.toFixed(0)} J/kg`,
    });
  }

  // Day/Night transition
  if (previous.isDay !== current.isDay) {
    changes.push({
      parameter: "isDay",
      oldValue: previous.isDay ? "Day" : "Night",
      newValue: current.isDay ? "Day" : "Night",
      description: current.isDay
        ? "Sun has risen (day time)"
        : "Sun has set (night time)",
    });
  }

  return changes;
}

/**
 * Convert wind direction in degrees to compass direction
 */
function getCompassDirection(degrees: number): string {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}
