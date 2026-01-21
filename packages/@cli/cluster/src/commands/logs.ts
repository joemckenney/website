import { colors, error, header, info } from "../utils/colors";
import { getPods, isMinikubeRunning } from "../utils/minikube";
import { runInteractive } from "../utils/shell";

const SERVICE_MAP: Record<string, string> = {
	api: "api-service",
	gateway: "api-service",
	user: "user-service",
	users: "user-service",
	agent: "agent-service",
	strava: "strava-mcp-server",
	www: "www-web",
	app: "app-web",
	dashboard: "app-web",
};

export async function logs(
	service: string | undefined,
	options: { follow?: boolean; tail?: number },
): Promise<void> {
	// Check cluster is running
	if (!(await isMinikubeRunning())) {
		error("Cluster is not running");
		info("Start it with: pnpm exec cluster start");
		process.exit(1);
	}

	// If no service specified, list available services
	if (!service) {
		header("Available Services");
		const pods = await getPods();
		if (pods.length === 0) {
			info("No pods running");
		} else {
			for (const pod of pods) {
				console.log(`  ${pod.namespace}/${pod.name}`);
			}
		}
		console.log();
		console.log("Usage: pnpm exec cluster logs <service> [-f] [--tail N]");
		console.log();
		console.log("Service shortcuts:");
		for (const [shortcut, fullName] of Object.entries(SERVICE_MAP)) {
			console.log(`  ${shortcut.padEnd(10)} → ${fullName}`);
		}
		return;
	}

	// Resolve service name
	const resolvedService = SERVICE_MAP[service.toLowerCase()] ?? service;

	// Find the pod
	const pods = await getPods();
	const matchingPod = pods.find(
		(p) =>
			p.name.includes(resolvedService) ||
			p.name.toLowerCase().includes(service.toLowerCase()),
	);

	if (!matchingPod) {
		error(`No pod found matching: ${service}`);
		info("Available pods:");
		for (const pod of pods) {
			console.log(`  ${pod.namespace}/${pod.name}`);
		}
		process.exit(1);
	}

	// Build kubectl logs command
	const args = [
		"kubectl",
		"logs",
		"-n",
		matchingPod.namespace,
		matchingPod.name,
	];

	if (options.follow) {
		args.push("-f");
	}

	if (options.tail) {
		args.push(`--tail=${options.tail}`);
	}

	console.log(
		colors.dim(`kubectl logs -n ${matchingPod.namespace} ${matchingPod.name}`),
	);
	console.log();

	await runInteractive(args);
}
