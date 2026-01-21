#!/usr/bin/env bun

import { parseArgs } from "util";
import { loadConfig } from "../src/config";
import { studio, shell, logs, dump } from "../src/commands";
import type { Environment } from "../src/types";

const HELP = `
db - Database CLI for development and production

USAGE:
  db <command> [flags]

COMMANDS:
  studio    Open Prisma Studio
  shell     Open psql shell
  logs      View postgres logs
  dump      Create database dump

ENVIRONMENT FLAGS:
  --dev       Connect to local docker compose (default)
  --minikube  Connect to local kubernetes (minikube)
  --prod      Connect to production (requires confirmation)

EXAMPLES:
  db studio              # Open Prisma Studio for local docker
  db studio --prod       # Open Prisma Studio for production
  db shell --minikube    # Open psql shell for minikube
  db logs --prod -f      # Follow production postgres logs
  db dump --prod         # Dump production database

LOGS FLAGS:
  -f, --follow    Follow log output
  --tail <n>      Number of lines to show (default: 100)

DUMP FLAGS:
  -o, --output <path>   Output file path
  --data-only           Dump only data, no schema
  --schema-only         Dump only schema, no data
`;

function getEnvironment(args: { dev?: boolean; minikube?: boolean; prod?: boolean }): Environment {
  if (args.prod) return "prod";
  if (args.minikube) return "minikube";
  return "dev"; // default
}

async function main() {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      // Environment flags
      dev: { type: "boolean", short: "d" },
      minikube: { type: "boolean", short: "m" },
      prod: { type: "boolean", short: "p" },
      // Help
      help: { type: "boolean", short: "h" },
      // Logs flags
      follow: { type: "boolean", short: "f" },
      tail: { type: "string", short: "t" },
      // Dump flags
      output: { type: "string", short: "o" },
      "data-only": { type: "boolean" },
      "schema-only": { type: "boolean" },
    },
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    console.log(HELP);
    process.exit(0);
  }

  const command = positionals[0];
  const env = getEnvironment(values);

  // Load config
  let config;
  try {
    config = await loadConfig();
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }

  switch (command) {
    case "studio":
      await studio(env, config);
      break;

    case "shell":
      await shell(env, config);
      break;

    case "logs":
      await logs(env, config, {
        follow: values.follow,
        tail: values.tail ? parseInt(values.tail, 10) : 100,
      });
      break;

    case "dump":
      await dump(env, config, {
        output: values.output,
        dataOnly: values["data-only"],
        schemaOnly: values["schema-only"],
      });
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
