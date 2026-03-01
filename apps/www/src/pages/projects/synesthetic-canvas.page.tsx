import { SynestheticCanvas } from "@website/synesthetic-canvas";
import { BackLink } from "../../components/back-link";
import { backLinkWrapper } from "./synesthetic-canvas.css";

const apiUrl =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function SynestheticCanvasPage() {
  return (
    <>
      <div className={backLinkWrapper}>
        <BackLink to="/projects" label="Projects" />
      </div>
      <SynestheticCanvas apiUrl={apiUrl} />
    </>
  );
}
