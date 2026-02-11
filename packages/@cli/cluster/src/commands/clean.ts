import { error, header, info, step, success } from "../utils/colors";
import { isMinikubeRunning } from "../utils/minikube";
import { run, runInteractive } from "../utils/shell";

async function getMinikubeDockerEnv(): Promise<Record<string, string>> {
	const result = await run(["minikube", "docker-env", "--shell", "none"]);
	if (!result.success) {
		throw new Error(`Failed to get minikube docker-env: ${result.error}`);
	}

	const env: Record<string, string> = {};
	for (const line of result.output.split("\n")) {
		const eqIndex = line.indexOf("=");
		if (eqIndex !== -1) {
			const key = line.slice(0, eqIndex);
			const value = line.slice(eqIndex + 1);
			env[key] = value;
		}
	}
	return env;
}

export async function clean(): Promise<void> {
	header("Clean Docker Images");

	step("Checking cluster status...");
	if (!(await isMinikubeRunning())) {
		error("Cluster is not running");
		info("Start it with: pnpm exec cluster start");
		process.exit(1);
	}
	success("Cluster is running");
	console.log();

	step("Getting minikube docker-env...");
	const minikubeEnv = await getMinikubeDockerEnv();
	success("Minikube docker-env loaded");
	console.log();

	step("Pruning unused Docker images...");
	const exitCode = await runInteractive(["docker", "image", "prune", "-af"], {
		env: minikubeEnv,
	});
	if (exitCode !== 0) {
		error("Failed to prune Docker images");
		process.exit(1);
	}
	console.log();
	success("Docker images pruned");
	console.log();
}
