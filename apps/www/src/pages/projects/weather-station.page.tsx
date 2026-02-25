import { WeatherStation } from "@website/weather-station";
import { BackLink } from "../../components/back-link";
import { backLinkWrapper } from "./weather-station.css";

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
