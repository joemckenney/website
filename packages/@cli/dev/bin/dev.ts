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
import {
	composeDown,
	composeUp,
	isDockerRunning,
	waitForHealthy,
} from "../src/utils/docker";
import { run, spawnWithPrefix } from "../src/utils/shell";

const VERSION = "0.0.1";

// Track spawned processes for cleanup
let dockerLogsProc: Subprocess | null = null;
let turboProc: Subprocess | null = null;
let isShuttingDown = false;

async function cleanup(): Promise<void> {
	if (isShuttingDown) return;
	isShuttingDown = true;

	console.log();
	header("Shutting down");

	if (dockerLogsProc) {
		dockerLogsProc.kill();
	}

	step("Stopping databases...");
	await composeDown();
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

	// Start databases
	step("Starting databases...");
	const composeResult = await composeUp();
	if (composeResult !== 0) {
		error("Failed to start databases");
		process.exit(1);
	}
	success("Databases starting");

	// Wait for databases to be healthy
	step("Waiting for databases to be healthy...");
	const dbContainers = ["users-db", "agent-db"];

	for (const container of dbContainers) {
		const healthy = await waitForHealthy(container, 60000);
		if (!healthy) {
			error(`Database ${container} failed health check`);
			await composeDown();
			process.exit(1);
		}
		success(`${container} is healthy`);
	}
	console.log();

	// Run migrations
	step("Running migrations...");
	const migrateResult = await run([
		"pnpm",
		"turbo",
		"run",
		"migrate:deploy",
		"--ui=stream",
	]);
	if (migrateResult.exitCode !== 0) {
		error("Migrations failed");
		console.log(migrateResult.stderr);
		await composeDown();
		process.exit(1);
	}
	success("Migrations complete");
	console.log();

	// Start docker compose logs in background
	header("Starting services (Ctrl+C to stop)");
	console.log();

	dockerLogsProc = spawnWithPrefix(
		["docker", "compose", "logs", "-f"],
		"db",
		colors.magenta,
	);

	// Start turbo dev with streaming output
	turboProc = Bun.spawn(["pnpm", "turbo", "run", "dev", "--ui=stream"], {
		stdout: "inherit",
		stderr: "inherit",
		stdin: "inherit",
	});

	// Wait for turbo to exit
	const exitCode = await turboProc.exited;

	// Brief delay to let child processes finish flushing their output
	// (tsx watch, vite, etc. may still be writing as they terminate)
	await Bun.sleep(500);

	// Cleanup on turbo exit
	await cleanup();
	process.exit(exitCode);
}

async function stop(): Promise<void> {
	header("Stopping Development Environment");
	await composeDown();
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

${colors.yellow("What it does:")}
  1. Starts PostgreSQL databases via docker compose
  2. Waits for health checks
  3. Runs Prisma migrations
  4. Starts all services via turbo (streaming logs)
  5. On Ctrl+C, stops everything cleanly
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
