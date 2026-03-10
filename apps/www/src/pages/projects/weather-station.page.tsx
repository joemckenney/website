import { WeatherStation, setServiceUrl } from "@website/weather-station";
import { BackLink } from "../../components/back-link";
import { backLinkWrapper } from "./weather-station.css";

const WEATHER_SERVICE_URL =
  import.meta.env.VITE_WEATHER_SERVICE_URL || "https://weather.crowprose.com";

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
