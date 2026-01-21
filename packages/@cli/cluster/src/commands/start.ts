import { header, step, success, error, warning, info } from "../utils/colors";
import {
	isMinikubeRunning,
	startMinikube,
	isAddonEnabled,
	enableAddon,
	isRegistryForwardRunning,
	startRegistryForward,
	waitForPod,
	getMinikubeIp,
	getKubectlContext,
} from "../utils/minikube";

export async function start(): Promise<void> {
	header("Starting Development Cluster");

	// Check/start minikube
	step("Checking cluster status...");
	if (await isMinikubeRunning()) {
		success("Cluster already running");
	} else {
		info("Cluster is not running. Starting minikube...");
		const started = await startMinikube();
		if (started) {
			success("Cluster started");
		} else {
			error("Failed to start cluster");
			process.exit(1);
		}
	}
	console.log();

	// Ensure registry addon
	step("Checking registry addon...");
	if (await isAddonEnabled("registry")) {
		success("Registry addon already enabled");
	} else {
		info("Enabling registry addon...");
		await enableAddon("registry");
		success("Registry addon enabled");
	}
	console.log();

	// Check/start port-forward
	step("Checking registry port-forward...");
	const forwardStatus = isRegistryForwardRunning();
	if (forwardStatus.running) {
		success(
			`Registry port-forward already running (PID: ${forwardStatus.pid})`,
		);
	} else {
		info("Starting registry port-forward...");

		// Wait for registry pod
		info("Waiting for registry pod...");
		await waitForPod("kube-system", "actual-registry=true", 60);

		const result = await startRegistryForward();
		if (result.success) {
			success(`Registry port-forward started (PID: ${result.pid})`);
			info("Local registry available at: localhost:5000");
		} else {
			warning("Could not start port-forward");
			info(
				"Registry may not be available yet. Try running this command again.",
			);
		}
	}
	console.log();

	// Summary
	header("Cluster Ready");
	const ip = await getMinikubeIp();
	const context = await getKubectlContext();
	console.log("Cluster Information:");
	console.log(`  IP:       ${ip ?? "unknown"}`);
	console.log(`  Context:  ${context ?? "unknown"}`);
	console.log("  Registry: localhost:5000");
	console.log();
	console.log("Next steps:");
	console.log("  pnpm exec cluster deploy    # Build and deploy all services");
	console.log("  pnpm exec cluster status    # Check status");
	console.log("  pnpm exec cluster stop      # Stop cluster");
	console.log();
}
