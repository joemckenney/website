import { header, step, success, error, info } from "../utils/colors";
import { run, runInteractive } from "../utils/shell";
import { isMinikubeRunning, isRegistryForwardRunning } from "../utils/minikube";

export async function deploy(): Promise<void> {
	header("Deploy to Local Cluster");

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

	// Build Docker images
	step("Building Docker images...");
	const buildResult = await runInteractive([
		"pnpm",
		"turbo",
		"run",
		"build:docker:local",
	]);
	if (buildResult !== 0) {
		error("Failed to build Docker images");
		process.exit(1);
	}
	success("Docker images built");
	console.log();

	// Deploy with Helm
	step("Deploying services with Helm...");
	const deployResult = await runInteractive([
		"pnpm",
		"turbo",
		"run",
		"deploy:helm:local",
	]);
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
