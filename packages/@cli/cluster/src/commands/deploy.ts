import { error, header, info, step, success } from "../utils/colors";
import { isMinikubeRunning } from "../utils/minikube";
import { getAllServices, resolveService } from "../utils/services";
import { run, runInteractive } from "../utils/shell";

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
	let deploymentNames: string[];

	if (service) {
		const resolved = resolveService(service);
		if (!resolved) {
			error(`Unknown service: ${service}`);
			process.exit(1);
		}
		cmd.push("--filter", resolved.package);
		deploymentNames = [resolved.name];
	} else {
		deploymentNames = getAllServices().map((s) => s.name);
	}

	step("Deploying services with Helm...");
	const deployResult = await runInteractive(cmd);
	if (deployResult !== 0) {
		error("Failed to deploy services");
		process.exit(1);
	}
	success("Services deployed");
	console.log();

	// Restart deployments so pods pick up rebuilt images
	step("Restarting deployments...");
	for (const name of deploymentNames) {
		const result = await run([
			"kubectl",
			"rollout",
			"restart",
			`deployment/${name}`,
		]);
		if (result.success) {
			success(`Restarted ${name}`);
		} else {
			// Deployment may not exist yet (first deploy) — not fatal
			info(`Skipped ${name} (${result.error || "not found"})`);
		}
	}
	console.log();

	header("Deployment Complete");
	console.log("Check status with: pnpm exec cluster status");
	console.log();
}
