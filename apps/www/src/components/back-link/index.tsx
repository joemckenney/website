import { Link } from "react-router-dom";
import { backLink, icon } from "./index.css";

interface BackLinkProps {
  to: string;
  label?: string;
  home?: boolean;
}

function HomeIcon() {
  return (
    <span className={icon}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2.5 7.5L8 2l5.5 5.5M4 9v4.5h3V11h2v2.5h3V9" />
      </svg>
    </span>
  );
}

export function BackLink({ to, label, home }: BackLinkProps) {
  return (
    <Link to={to} className={backLink}>
      <span className={icon}>
        <svg
          width="11"
          height="11"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 3L1 8l5 5M1 8h14" />
        </svg>
      </span>
      {home ? <HomeIcon /> : label}
    </Link>
  );
}
