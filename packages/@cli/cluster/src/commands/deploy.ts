import { error, header, info, step, success } from "../utils/colors";
import { isMinikubeRunning } from "../utils/minikube";
import { resolveService } from "../utils/services";
import { runInteractive } from "../utils/shell";

export async function deploy(service?: string): Promise<void> {
	const label = service ? `Deploy ${service}` : "Deploy All Services";
	header(label);

	// Check cluster is running
	step("Checking cluster status...");
	if (!(await isMinikubeRunning())) {
		error("Cluster is not running");
		info("Start it with: pnpm exec cluster start");
		process.exit(1);
	}
	success("Cluster is running");
	console.log();

	const cmd = ["pnpm", "turbo", "run", "deploy:k8s:local"];

	if (service) {
		const resolved = resolveService(service);
		if (!resolved) {
			error(`Unknown service: ${service}`);
			process.exit(1);
		}
		cmd.push("--filter", resolved.package);
	}

	step("Deploying services with Helm...");
	const deployResult = await runInteractive(cmd);
	if (deployResult !== 0) {
		error("Failed to deploy services");
		process.exit(1);
	}
	success("Services deployed");
	console.log();

	header("Deployment Complete");
	console.log("Check status with: pnpm exec cluster status");
	console.log();
}
