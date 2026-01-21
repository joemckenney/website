import { createInterface } from "node:readline";
import { error, header, info, step, success, warning } from "../utils/colors";
import {
	deleteMinikube,
	enableAddon,
	getKubectlContext,
	getMinikubeIp,
	isAddonEnabled,
	isMinikubeRunning,
	startMinikube,
	waitForPod,
} from "../utils/minikube";
import { commandExists, run } from "../utils/shell";

async function confirm(question: string): Promise<boolean> {
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		rl.question(`${question} (y/N) `, (answer) => {
			rl.close();
			resolve(answer.trim().toLowerCase() === "y");
		});
	});
}

export async function setup(): Promise<void> {
	header("Development Cluster Setup");

	// Check prerequisites
	step("Checking prerequisites...");

	const tools = ["minikube", "kubectl", "helm", "docker"];
	const missing: string[] = [];

	for (const tool of tools) {
		if (!(await commandExists(tool))) {
			missing.push(tool);
		}
	}

	if (missing.length > 0) {
		error(`Missing required tools: ${missing.join(", ")}`);
		console.log();
		console.log("Install them with:");
		if (process.platform === "darwin") {
			console.log(`  brew install ${missing.join(" ")}`);
		} else {
			console.log("  # Ubuntu/Debian:");
			console.log("  sudo apt-get update");
			if (missing.includes("docker")) {
				console.log("  sudo apt-get install -y docker.io");
			}
			console.log(
				"  # Install minikube: https://minikube.sigs.k8s.io/docs/start/",
			);
			console.log(
				"  # Install kubectl: https://kubernetes.io/docs/tasks/tools/",
			);
			console.log("  # Install helm: https://helm.sh/docs/intro/install/");
		}
		process.exit(1);
	}

	success("All prerequisites installed");
	console.log();

	// Check if cluster exists
	if (await isMinikubeRunning()) {
		warning("Minikube cluster already exists.");
		const recreate = await confirm("Delete and recreate?");
		if (recreate) {
			step("Deleting existing cluster...");
			await deleteMinikube();
		} else {
			success("Using existing cluster");
			console.log();
			console.log("Next steps:");
			console.log("  pnpm exec cluster start    # Start cluster and registry");
			return;
		}
	}

	// Create cluster
	step("Creating minikube cluster...");
	const started = await startMinikube({ cpus: 4, memory: 8192 });
	if (!started) {
		error("Failed to start minikube cluster");
		process.exit(1);
	}
	success("Cluster created");
	console.log();

	// Enable addons
	step("Checking ingress addon...");
	if (await isAddonEnabled("ingress")) {
		success("Ingress addon already enabled");
	} else {
		info("Enabling ingress (this may take a few minutes)...");
		await enableAddon("ingress");
		success("Ingress addon enabled");
	}
	console.log();

	step("Checking registry addon...");
	if (await isAddonEnabled("registry")) {
		success("Registry addon already enabled");
	} else {
		info("Enabling registry...");
		await enableAddon("registry");
		success("Registry addon enabled");
	}
	console.log();

	// Wait for ingress controller
	step("Waiting for ingress controller to be ready...");
	info(
		"This may take several minutes on first setup (downloading ~350MB image)",
	);
	const ingressReady = await waitForPod(
		"ingress-nginx",
		"app.kubernetes.io/component=controller",
		600,
	);
	if (ingressReady) {
		success("Ingress controller ready");
	} else {
		warning("Ingress controller not ready yet");
		info("Check progress with: kubectl get pods -n ingress-nginx");
		info("Check status later with: pnpm exec cluster status");
	}
	console.log();

	// Configure /etc/hosts
	const ip = await getMinikubeIp();
	if (ip) {
		const hostsEntry = `${ip} www.local.com app.local.com api.local.com`;
		step("Configuring local DNS...");
		info(`Adding to /etc/hosts: ${hostsEntry}`);

		const result = await run(["grep", "-q", "www.local.com", "/etc/hosts"]);
		if (result.success) {
			warning("Entries already exist in /etc/hosts");
			info("You may need to update them manually if the IP changed:");
			info(`  sudo sed -i '/www.local.com/d' /etc/hosts`);
			info(`  echo '${hostsEntry}' | sudo tee -a /etc/hosts`);
		} else {
			info("Requires sudo to modify /etc/hosts...");
			const added = await run([
				"sh",
				"-c",
				`echo '${hostsEntry}' | sudo tee -a /etc/hosts`,
			]);
			if (added.success) {
				success("DNS configured");
			} else {
				warning("Could not modify /etc/hosts automatically");
				info(`Run manually: echo '${hostsEntry}' | sudo tee -a /etc/hosts`);
			}
		}
	}
	console.log();

	// Summary
	header("Setup Complete!");
	const context = await getKubectlContext();
	console.log("Cluster Information:");
	console.log(`  IP:      ${ip ?? "unknown"}`);
	console.log(`  Context: ${context ?? "unknown"}`);
	console.log();
	console.log("Next steps:");
	console.log("  pnpm exec cluster start     # Start cluster and registry");
	console.log("  pnpm exec cluster deploy    # Build and deploy all services");
	console.log("  pnpm exec cluster status    # Check status");
	console.log();
}
