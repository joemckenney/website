import { header, step, success, warning } from "../utils/colors";
import {
	isMinikubeRunning,
	stopMinikube,
	isRegistryForwardRunning,
	stopRegistryForward,
} from "../utils/minikube";

export async function stop(): Promise<void> {
	header("Stopping Development Cluster");

	// Stop port-forward
	step("Stopping registry port-forward...");
	const forwardStatus = isRegistryForwardRunning();
	if (forwardStatus.running) {
		const stopped = stopRegistryForward();
		if (stopped) {
			success(`Port-forward stopped (was PID: ${forwardStatus.pid})`);
		} else {
			warning("Could not stop port-forward");
		}
	} else {
		warning("Port-forward was not running");
	}
	console.log();

	// Stop minikube
	step("Stopping minikube cluster...");
	if (await isMinikubeRunning()) {
		const stopped = await stopMinikube();
		if (stopped) {
			success("Cluster stopped");
		} else {
			warning("Could not stop cluster");
		}
	} else {
		warning("Cluster was not running");
	}
	console.log();

	header("Cluster Stopped");
	console.log("To start again: pnpm exec cluster start");
	console.log();
}
