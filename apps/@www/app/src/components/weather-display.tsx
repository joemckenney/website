import type { WeatherData } from '../types/weather';
import * as styles from './weather-display.css';

interface WeatherDisplayProps {
  weather: WeatherData | null;
  isLoading: boolean;
}

export function WeatherDisplay({ weather, isLoading }: WeatherDisplayProps) {
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading weather data...</div>
      </div>
    );
  }

  if (!weather) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Current Weather</h2>

        <div className={styles.mainInfo}>
          <div className={styles.temperature}>{Math.round(weather.temperature)}°F</div>
          <div className={styles.conditions}>{weather.conditions}</div>
        </div>

        <div className={styles.details}>
          <div className={styles.detailItem}>
            <span className={styles.label}>Wind</span>
            <span className={styles.value}>{weather.windSpeed} mph</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.label}>Humidity</span>
            <span className={styles.value}>{weather.humidity}%</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.label}>Pressure</span>
            <span className={styles.value}>{weather.pressure} hPa</span>
          </div>
        </div>

        <div className={styles.location}>
          <span className={styles.locationIcon}>📍</span>
          {weather.location.city || `${weather.location.latitude.toFixed(2)}, ${weather.location.longitude.toFixed(2)}`}
        </div>
      </div>
    </div>
  );
}
