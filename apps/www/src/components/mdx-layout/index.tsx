import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BackLink } from "../back-link";
import {
  article,
  header,
  meta,
  page,
  publishedDate,
  seriesLink,
  seriesTag,
  title,
} from "./index.css";

const SERIES_NAMES: Record<string, string> = {
  "flight-patterns": "Flight Patterns",
};

interface MdxLayoutProps {
  children: ReactNode;
  frontmatter: {
    title: string;
    description?: string;
    publishedTime?: string;
    series?: string;
  };
}

export function MdxLayout({ children, frontmatter }: MdxLayoutProps) {
  const seriesSlug = frontmatter.series;
  const seriesName = seriesSlug ? SERIES_NAMES[seriesSlug] : null;

  return (
    <div className={page}>
      <header className={header}>
        <BackLink to="/blog" label="Writing" />
        <div className={meta}>
          {seriesName && seriesSlug ? (
            <Link to={`/blog/${seriesSlug}`} className={seriesLink}>
              <span className={seriesTag}>{seriesName}</span>
            </Link>
          ) : (
            <span />
          )}
          {frontmatter.publishedTime && (
            <time className={publishedDate} dateTime={frontmatter.publishedTime}>
              {new Date(frontmatter.publishedTime + "T00:00:00").toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          )}
        </div>
        <h1 className={title}>{frontmatter.title}</h1>
      </header>

      <article className={article}>{children}</article>
    </div>
  );
}
