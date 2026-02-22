import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { isProcessRunning, killProcess, run, runBackground } from "./shell";

const REGISTRY_PID_FILE = "/tmp/minikube-registry-forward.pid";

/**
 * Check if minikube is running
 */
export async function isMinikubeRunning(): Promise<boolean> {
	const result = await run(["minikube", "status"]);
	return result.success;
}

/**
 * Get minikube IP address
 */
export async function getMinikubeIp(): Promise<string | null> {
	const result = await run(["minikube", "ip"]);
	return result.success ? result.output : null;
}

/**
 * Get current kubectl context
 */
export async function getKubectlContext(): Promise<string | null> {
	const result = await run(["kubectl", "config", "current-context"]);
	return result.success ? result.output : null;
}

/**
 * Start minikube cluster
 */
export async function startMinikube(
	options: { cpus?: number; memory?: number } = {},
): Promise<boolean> {
	const cpus = options.cpus ?? 4;
	const memory = options.memory ?? 8192;

	const result = await run([
		"minikube",
		"start",
		`--cpus=${cpus}`,
		`--memory=${memory}`,
		"--driver=docker",
	]);
	return result.success;
}

/**
 * Stop minikube cluster
 */
export async function stopMinikube(): Promise<boolean> {
	const result = await run(["minikube", "stop"]);
	return result.success;
}

/**
 * Delete minikube cluster
 */
export async function deleteMinikube(): Promise<boolean> {
	const result = await run(["minikube", "delete"]);
	return result.success;
}

/**
 * Check if a minikube addon is enabled
 */
export async function isAddonEnabled(addon: string): Promise<boolean> {
	const result = await run(["minikube", "addons", "list"]);
	if (!result.success) return false;
	const regex = new RegExp(`${addon}.*enabled`);
	return regex.test(result.output);
}

/**
 * Enable a minikube addon
 */
export async function enableAddon(addon: string): Promise<boolean> {
	const result = await run(["minikube", "addons", "enable", addon]);
	return result.success;
}

/**
 * Check if registry port-forward is running
 */
export function isRegistryForwardRunning(): { running: boolean; pid?: number } {
	if (!existsSync(REGISTRY_PID_FILE)) {
		return { running: false };
	}

	const pid = Number.parseInt(
		readFileSync(REGISTRY_PID_FILE, "utf-8").trim(),
		10,
	);
	if (isProcessRunning(pid)) {
		return { running: true, pid };
	}

	// Stale PID file
	unlinkSync(REGISTRY_PID_FILE);
	return { running: false };
}

/**
 * Start registry port-forward
 */
export async function startRegistryForward(): Promise<{
	success: boolean;
	pid?: number;
}> {
	// Find registry pod
	const podResult = await run([
		"kubectl",
		"get",
		"pods",
		"-n",
		"kube-system",
		"-l",
		"actual-registry=true",
		"-o",
		"jsonpath={.items[0].metadata.name}",
	]);

	if (!podResult.success || !podResult.output) {
		return { success: false };
	}

	const registryPod = podResult.output;

	// Start port-forward in background
	const proc = runBackground([
		"kubectl",
		"port-forward",
		"-n",
		"kube-system",
		registryPod,
		"5000:5000",
	]);

	// Wait a moment for it to start
	await Bun.sleep(2000);

	// Check if still running
	if (proc.exitCode !== null) {
		return { success: false };
	}

	// Save PID and detach so the parent process can exit
	writeFileSync(REGISTRY_PID_FILE, String(proc.pid));
	proc.unref();

	return { success: true, pid: proc.pid };
}

/**
 * Stop registry port-forward
 */
export function stopRegistryForward(): boolean {
	const status = isRegistryForwardRunning();
	if (!status.running || !status.pid) {
		return false;
	}

	const killed = killProcess(status.pid);
	if (existsSync(REGISTRY_PID_FILE)) {
		unlinkSync(REGISTRY_PID_FILE);
	}

	return killed;
}

/**
 * Wait for a pod to be ready.
 *
 * kubectl wait hangs indefinitely when no pods match the selector,
 * ignoring --timeout. We poll for pod existence first, then wait
 * for readiness.
 */
export async function waitForPod(
	namespace: string,
	selector: string,
	timeoutSeconds = 60,
): Promise<boolean> {
	const deadline = Date.now() + timeoutSeconds * 1000;

	// Poll until at least one pod matches the selector
	while (Date.now() < deadline) {
		const check = await run([
			"kubectl",
			"get",
			"pods",
			`--namespace=${namespace}`,
			`--selector=${selector}`,
			"--no-headers",
		]);
		if (check.success && check.output.length > 0) {
			break;
		}
		await Bun.sleep(2000);
	}

	if (Date.now() >= deadline) {
		return false;
	}

	const remaining = Math.max(1, Math.ceil((deadline - Date.now()) / 1000));
	const result = await run([
		"kubectl",
		"wait",
		`--namespace=${namespace}`,
		"--for=condition=ready",
		"pod",
		`--selector=${selector}`,
		`--timeout=${remaining}s`,
	]);
	return result.success;
}

/**
 * Get helm releases
 */
export async function getHelmReleases(): Promise<string[]> {
	const result = await run(["helm", "list", "-q"]);
	if (!result.success || !result.output) {
		return [];
	}
	return result.output.split("\n").filter(Boolean);
}

/**
 * Get helm release status
 */
export async function getHelmReleaseStatus(
	release: string,
): Promise<string | null> {
	const result = await run(["helm", "status", release, "-o", "json"]);
	if (!result.success) return null;

	try {
		const data = JSON.parse(result.output);
		return data.info?.status ?? null;
	} catch {
		return null;
	}
}

/**
 * Get pods in a namespace
 */
export async function getPods(
	namespace?: string,
): Promise<Array<{ namespace: string; name: string; status: string }>> {
	const args = ["kubectl", "get", "pods", "--no-headers"];
	if (namespace) {
		args.push("-n", namespace);
	} else {
		args.push("--all-namespaces");
		args.push(
			"--field-selector=metadata.namespace!=kube-system,metadata.namespace!=ingress-nginx",
		);
	}

	const result = await run(args);
	if (!result.success || !result.output) {
		return [];
	}

	return result.output
		.split("\n")
		.filter(Boolean)
		.map((line) => {
			const parts = line.split(/\s+/);
			if (namespace) {
				return { namespace, name: parts[0], status: parts[2] };
			}
			return { namespace: parts[0], name: parts[1], status: parts[3] };
		});
}

/**
 * Get ingresses
 */
export async function getIngresses(): Promise<
	Array<{ namespace: string; name: string; hosts: string }>
> {
	const result = await run([
		"kubectl",
		"get",
		"ingress",
		"--all-namespaces",
		"--no-headers",
	]);
	if (!result.success || !result.output) {
		return [];
	}

	return result.output
		.split("\n")
		.filter(Boolean)
		.map((line) => {
			const parts = line.split(/\s+/);
			return { namespace: parts[0], name: parts[1], hosts: parts[3] };
		});
}
