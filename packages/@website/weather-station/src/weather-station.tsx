import { WeatherDashboard } from "./components/weather-dashboard";
import * as styles from "./app.css";

export function WeatherStation() {
  return (
    <div className={styles.page}>
      <section className={styles.section}>
        <WeatherDashboard />
      </section>
    </div>
  );
}
