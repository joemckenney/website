#!/usr/bin/env bun

import type { Subprocess } from "bun";
import {
	colors,
	error,
	header,
	info,
	step,
	success,
} from "../src/utils/colors";
import { isDockerRunning } from "../src/utils/docker";
import { run } from "../src/utils/shell";

const VERSION = "0.0.2";

let turboProc: Subprocess | null = null;
let isShuttingDown = false;

async function cleanup(): Promise<void> {
	if (isShuttingDown) return;
	isShuttingDown = true;

	console.log();
	header("Shutting down");

	step("Stopping databases...");
	await run(["pnpm", "turbo", "run", "db:down", "--ui=stream"]);
	success("Cleanup complete");
}

// Ignore SIGINT - let turbo handle it, we'll cleanup after turbo exits
process.on("SIGINT", () => {
	// Do nothing - turbo receives SIGINT via inherited stdin
	// Cleanup happens after turbo exits in the normal flow
});

async function start(): Promise<void> {
	header("Starting Development Environment");
	console.log();

	// Check Docker is running
	step("Checking Docker...");
	if (!(await isDockerRunning())) {
		error("Docker is not running");
		info("Please start Docker Desktop and try again");
		process.exit(1);
	}
	success("Docker is running");
	console.log();

	// Turbo handles everything: db:up -> migrate:deploy -> dev
	header("Starting services (Ctrl+C to stop)");
	info("Turbo will start databases, run migrations, then start services");
	console.log();

	turboProc = Bun.spawn(["pnpm", "turbo", "run", "dev", "--ui=stream"], {
		stdout: "inherit",
		stderr: "inherit",
		stdin: "inherit",
	});

	const exitCode = await turboProc.exited;

	// Brief delay to let child processes finish flushing output
	await Bun.sleep(500);

	await cleanup();
	process.exit(exitCode);
}

async function stop(): Promise<void> {
	header("Stopping Development Environment");
	await run(["pnpm", "turbo", "run", "db:down", "--ui=stream"]);
	success("Databases stopped");
}

function printHelp(): void {
	console.log(`
${colors.blue("dev")} - Local development environment

${colors.yellow("Usage:")}
  dev [command]

${colors.yellow("Commands:")}
  (default)    Start databases, run migrations, start all services
  stop         Stop databases

${colors.yellow("Options:")}
  -h, --help     Show this help message
  -v, --version  Show version

${colors.yellow("How it works:")}
  Turbo orchestrates the startup via task dependencies:
  1. db:up      - Starts PostgreSQL containers (waits for healthy)
  2. migrate    - Runs Prisma migrations
  3. dev        - Starts all services in watch mode

  On Ctrl+C, databases are stopped automatically.
`);
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);

	if (args.includes("-h") || args.includes("--help")) {
		printHelp();
		process.exit(0);
	}

	if (args.includes("-v") || args.includes("--version")) {
		console.log(`dev v${VERSION}`);
		process.exit(0);
	}

	const command = args[0];

	switch (command) {
		case "stop":
			await stop();
			break;
		case undefined:
			await start();
			break;
		default:
			error(`Unknown command: ${command}`);
			printHelp();
			process.exit(1);
	}
}

main().catch(async (err) => {
	error(err.message);
	await cleanup();
	process.exit(1);
});
