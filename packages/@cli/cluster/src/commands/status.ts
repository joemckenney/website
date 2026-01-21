import { colors, header, step, symbols } from "../utils/colors";
import {
	getHelmReleaseStatus,
	getHelmReleases,
	getIngresses,
	getKubectlContext,
	getMinikubeIp,
	getPods,
	isMinikubeRunning,
	isRegistryForwardRunning,
} from "../utils/minikube";

export async function status(): Promise<void> {
	header("Development Cluster Status");

	// Cluster status
	step("Cluster:");
	if (await isMinikubeRunning()) {
		const ip = await getMinikubeIp();
		const context = await getKubectlContext();
		console.log(`  ${symbols.success} Running`);
		console.log(`  IP:      ${ip ?? "unknown"}`);
		console.log(`  Context: ${context ?? "unknown"}`);
	} else {
		console.log(`  ${symbols.error} Not running`);
		console.log();
		console.log("Start with: pnpm exec cluster start");
		return;
	}
	console.log();

	// Registry port-forward
	step("Registry Port-Forward:");
	const forwardStatus = isRegistryForwardRunning();
	if (forwardStatus.running) {
		console.log(`  ${symbols.success} Running (PID: ${forwardStatus.pid})`);
		console.log("  Endpoint: localhost:5000");
	} else {
		console.log(`  ${symbols.error} Not running`);
		console.log("  Run 'pnpm exec cluster start' to start");
	}
	console.log();

	// Helm releases
	step("Deployed Applications:");
	const releases = await getHelmReleases();
	if (releases.length === 0) {
		console.log("  No applications deployed");
	} else {
		for (const release of releases) {
			const status = await getHelmReleaseStatus(release);
			if (status === "deployed") {
				console.log(`  ${symbols.success} ${release}`);
			} else {
				console.log(`  ${symbols.warning} ${release} (${status ?? "unknown"})`);
			}
		}
	}
	console.log();

	// Pods
	step("Pods:");
	const pods = await getPods();
	if (pods.length === 0) {
		console.log("  No pods running");
	} else {
		for (const pod of pods) {
			if (pod.status === "Running") {
				console.log(`  ${symbols.success} ${pod.namespace}/${pod.name}`);
			} else {
				console.log(
					`  ${symbols.warning} ${pod.namespace}/${pod.name} (${pod.status})`,
				);
			}
		}
	}
	console.log();

	// Ingresses
	step("Ingresses:");
	const ingresses = await getIngresses();
	if (ingresses.length === 0) {
		console.log("  No ingresses configured");
	} else {
		for (const ingress of ingresses) {
			console.log(`  ${symbols.bullet} ${ingress.namespace}/${ingress.name}`);
			console.log(`    Hosts: ${ingress.hosts}`);
		}
	}
	console.log();

	// Helpful commands
	console.log(colors.blue("Helpful commands:"));
	console.log("  pnpm exec cluster start     # Start cluster and registry");
	console.log("  pnpm exec cluster stop      # Stop cluster");
	console.log("  pnpm exec cluster deploy    # Build and deploy services");
	console.log("  pnpm exec cluster logs api  # View service logs");
	console.log("  kubectl get pods -A         # List all pods");
	console.log("  helm list                   # List deployments");
	console.log();
}
