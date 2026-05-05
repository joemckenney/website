import { setServiceUrl, WeatherStation } from "@website/weather-station";
import { BackLink } from "../../components/back-link";
import { backLinkWrapper } from "./weather-station.css";

// The gateway proxies /weather/* to the weather service. The library
// appends /weather/{stream,current,...} itself, so we point at the
// gateway host (no /weather suffix here).
const WEATHER_SERVICE_URL =
  import.meta.env.VITE_WEATHER_SERVICE_URL || "https://api.crowprose.com";

setServiceUrl(WEATHER_SERVICE_URL);

export default function WeatherStationPage() {
  return (
    <>
      <div className={backLinkWrapper}>
        <BackLink to="/projects" label="Projects" />
      </div>
      <WeatherStation />
    </>
  );
}
