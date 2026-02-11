#!/usr/bin/env bun

import {
	build,
	deploy,
	logs,
	setup,
	start,
	status,
	stop,
} from "../src/commands";
import { colors } from "../src/utils/colors";

const VERSION = "0.0.1";

function printHelp(): void {
	console.log(`
${colors.blue("cluster")} - Local Kubernetes cluster management

${colors.yellow("Usage:")}
  cluster <command> [options]

${colors.yellow("Commands:")}
  setup              Initial cluster setup (install minikube, configure addons)
  start              Start the cluster and registry port-forward
  stop               Stop the cluster and port-forward
  status             Show cluster status (pods, services, ingresses)
  build [service]    Build Docker images (all or one service)
  deploy [service]   Deploy services via Helm (all or one service)
  logs <service>     View logs for a service

${colors.yellow("Options:")}
  -h, --help         Show this help message
  -v, --version      Show version

${colors.yellow("Examples:")}
  cluster setup              # First-time setup
  cluster start              # Start development cluster
  cluster build              # Build all Docker images
  cluster build api          # Build only api-service image
  cluster deploy             # Deploy all services via Helm
  cluster deploy www         # Deploy only www-web
  cluster logs api -f        # Follow API logs
  cluster status             # Check what's running
  cluster stop               # Stop when done

${colors.yellow("Service shortcuts:")}
  api, gateway   → api-service
  user, users    → user-service
  agent          → agent-service
  tables         → tables-service
  strava         → strava-mcp-server
  www            → www-web
  app, dashboard → app-web
`);
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);

	if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
		printHelp();
		process.exit(0);
	}

	if (args[0] === "-v" || args[0] === "--version") {
		console.log(`cluster v${VERSION}`);
		process.exit(0);
	}

	const command = args[0];
	const commandArgs = args.slice(1);

	switch (command) {
		case "setup":
			await setup();
			break;

		case "start":
			await start();
			break;

		case "stop":
			await stop();
			break;

		case "status":
			await status();
			break;

		case "build":
			await build(commandArgs[0]);
			break;

		case "deploy":
			await deploy(commandArgs[0]);
			break;

		case "logs": {
			const service = commandArgs[0];
			const follow =
				commandArgs.includes("-f") || commandArgs.includes("--follow");
			const tailIndex = commandArgs.findIndex(
				(a) => a === "--tail" || a === "-n",
			);
			const tail =
				tailIndex !== -1
					? Number.parseInt(commandArgs[tailIndex + 1], 10)
					: undefined;
			await logs(service, { follow, tail });
			break;
		}

		default:
			console.error(colors.red(`Unknown command: ${command}`));
			console.log();
			printHelp();
			process.exit(1);
	}
}

main().catch((err) => {
	console.error(colors.red("Error:"), err.message);
	process.exit(1);
});
