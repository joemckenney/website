import { Link } from "react-router-dom";
import { SocialLinks } from "../components/social-links";
import { Tile } from "../components/tile";
import {
  brand,
  masthead,
  page,
  section,
  sectionHeader,
  sectionLink,
  sectionTitle,
  tagline,
  tileGrid,
} from "./index.css";

function App() {
  return (
    <div className={page}>
      <header className={masthead}>
        <h1 className={brand}>Crowprose</h1>
        <p className={tagline}>
          Software engineer, new dad, husband, and lifelong athlete. Building
          tools and sharing thoughts on software development.
        </p>
        <SocialLinks />
      </header>

      <section className={section}>
        <div className={sectionHeader}>
          <h2 className={sectionTitle}>Projects</h2>
          <Link to="/projects" className={sectionLink}>
            View all →
          </Link>
        </div>
        <div className={tileGrid}>
          <Tile
            title="Wake"
            description="Records terminal sessions—commands, outputs, git context—so Claude Code can see what you've been doing. No more copy-pasting."
            links={[
              { type: "github", url: "https://github.com/joemckenney/wake" },
            ]}
          />
          <Tile
            title="Cgroup-mcp"
            description="A read-only MCP server exposing Linux cgroup v2 state—memory, CPU, IO pressure, OOM events—so Claude can answer 'what's eating my box?' with real numbers instead of guesses."
            links={[
              {
                type: "github",
                url: "https://github.com/joemckenney/cgroup-mcp",
              },
            ]}
          />
          <Tile
            title="Process-mcp"
            description="Sister project to cgroup-mcp: a read-only MCP server that drills from a cgroup down into the processes inside it. Per-PID memory, cmdline, parent/child, fds—everything /proc knows, exposed as tools."
            links={[
              {
                type: "github",
                url: "https://github.com/joemckenney/process-mcp",
              },
            ]}
          />
          <Tile
            title="Gistdiff"
            description="Pipe any diff to gistdiff and get back a conventional-commit-style subject line — or the full subject + body, ready to pass straight to git commit -F -. One API, swap models freely."
            links={[
              {
                type: "github",
                url: "https://github.com/joemckenney/gistdiff",
              },
              { type: "npm", url: "https://www.npmjs.com/package/gistdiff" },
            ]}
          />
          <Tile
            title="Weather station"
            description="Live weather from Mendocino, CA turned into ambient sound. Streams real-time data from a personal weather station and maps temperature, wind, humidity, and rain to Web Audio synthesis."
            href="/projects/weather-station"
          />
          <Tile
            title="Please"
            description="A CLI for developing in monorepos, not building them. Focused on developer experience and productivity."
            links={[
              {
                type: "npm",
                url: "https://www.npmjs.com/package/@dopt/please",
              },
            ]}
          />
        </div>
      </section>

      <section className={section}>
        <div className={sectionHeader}>
          <h2 className={sectionTitle}>Writing</h2>
          <Link to="/blog" className={sectionLink}>
            View all →
          </Link>
        </div>
        <div className={tileGrid}>
          <Tile
            title="Competence as Tragedy"
            description="On Cormac McCarthy, John Grady Cole, and what it means to practice a craft while the world moves on without you."
            href="/blog/competence-as-tragedy"
          />
          <Tile
            title="Flight Patterns"
            description="Browser AI to production K8s. The long way around."
            href="/blog/flight-patterns"
          />
          <Tile
            title="Wake: Terminal History for Claude Code"
            description="How I built a tool that records terminal sessions so Claude Code can see what you've been doing."
            href="/blog/wake"
          />
          <Tile
            title="Open sourcing code from a private monorepo"
            description="A practical guide to extracting and publishing code from private repositories while maintaining git history."
            href="https://hackernoon.com/open-sourcing-code-from-a-private-monorepo"
            external
          />
          <Tile
            title="Building a modern gRPC-powered microservice"
            description="Learn how to build modern microservices with type-safe gRPC using Connect, Node.js, and TypeScript."
            href="https://dev.to/joemckenney/building-a-modern-grpc-powered-microservice-using-nodejs-typescript-and-connect-51a9"
            external
          />
        </div>
      </section>

      <section className={section}>
        <div className={sectionHeader}>
          <h2 className={sectionTitle}>Open Source Contributions</h2>
          <Link to="/contributions" className={sectionLink}>
            View all →
          </Link>
        </div>
        <div className={tileGrid}>
          <Tile
            title="Node.js Corepack"
            description="Updated pnpm tests to use current version of the package manager"
            href="https://github.com/nodejs/corepack/pull/621"
            metadata="Closed · Feb 2025"
            contributionType="pr"
            external
          />
          <Tile
            title="Unbuild"
            description="Build configuration array fails on export validation when writing to same dist directory"
            href="https://github.com/unjs/unbuild/issues/356"
            metadata="Open · Jan 2024"
            contributionType="issue"
            external
          />
          <Tile
            title="Turbo"
            description="Specific packages in monorepo take extremely long time to build with cache hits"
            href="https://github.com/vercel/turbo/issues/2069"
            metadata="Closed · Sep 2022"
            contributionType="issue"
            external
          />
        </div>
      </section>
    </div>
  );
}

export default App;
