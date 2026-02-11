import { error, header, info, step, success } from "../utils/colors";
import { isMinikubeRunning, isRegistryForwardRunning } from "../utils/minikube";
import { resolveService } from "../utils/services";
import { runInteractive } from "../utils/shell";

export async function build(service?: string): Promise<void> {
	const label = service ? `Build ${service} Image` : "Build All Images";
	header(label);

	// Check cluster is running
	step("Checking cluster status...");
	if (!(await isMinikubeRunning())) {
		error("Cluster is not running");
		info("Start it with: pnpm exec cluster start");
		process.exit(1);
	}
	success("Cluster is running");

	const forwardStatus = isRegistryForwardRunning();
	if (!forwardStatus.running) {
		error("Registry port-forward is not running");
		info("Start it with: pnpm exec cluster start");
		process.exit(1);
	}
	success("Registry port-forward is running");
	console.log();

	const cmd = ["pnpm", "turbo", "run", "build:image:local"];

	if (service) {
		const resolved = resolveService(service);
		if (!resolved) {
			error(`Unknown service: ${service}`);
			process.exit(1);
		}
		cmd.push("--filter", resolved.package);
	}

	step("Building Docker images...");
	const buildResult = await runInteractive(cmd);
	if (buildResult !== 0) {
		error("Failed to build Docker images");
		process.exit(1);
	}
	success("Docker images built");
	console.log();
}
