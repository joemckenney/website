import type { WeatherReading } from "../types/weather";
import * as styles from "./weather-dashboard.css";

interface LiveReadingsProps {
  reading: WeatherReading | null;
}

function getCompassDirection(degrees: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return dirs[index];
}

export function LiveReadings({ reading }: LiveReadingsProps) {
  if (!reading) {
    return (
      <div className={styles.readingsGrid}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={styles.readingCell}>
            <div className={styles.readingValue}>--</div>
            <div className={styles.readingLabel}>loading</div>
          </div>
        ))}
      </div>
    );
  }

  const cells = [
    {
      value: reading.tempf.toFixed(1),
      unit: "\u00B0F",
      label: "temp",
    },
    {
      value: reading.windspeedmph.toFixed(1),
      unit: ` mph ${getCompassDirection(reading.winddir)}`,
      label: "wind",
    },
    {
      value: `${reading.humidity}`,
      unit: "%",
      label: "humidity",
    },
    {
      value: reading.baromrelin.toFixed(2),
      unit: '"',
      label: "barometer",
    },
    {
      value: `${reading.uv}`,
      unit: "",
      label: "uv index",
    },
    {
      value: reading.solarradiation.toFixed(1),
      unit: " W/m\u00B2",
      label: "solar",
    },
    {
      value: reading.hourlyrainin.toFixed(2),
      unit: " in/hr",
      label: "rain",
    },
    {
      value: reading.dewPoint.toFixed(1),
      unit: "\u00B0F",
      label: "dew point",
    },
  ];

  return (
    <div className={styles.readingsGrid}>
      {cells.map((cell) => (
        <div key={cell.label} className={styles.readingCell}>
          <div className={styles.readingValue}>
            {cell.value}
            <span className={styles.readingUnit}>{cell.unit}</span>
          </div>
          <div className={styles.readingLabel}>{cell.label}</div>
        </div>
      ))}
    </div>
  );
}
