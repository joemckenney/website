import { error, header, info, step, success } from "./utils/colors";
import { run, runInteractive } from "./utils/shell";

async function getRepoRoot(): Promise<string> {
	const result = await run(["git", "rev-parse", "--show-toplevel"]);
	if (!result.success) {
		throw new Error("Failed to determine repository root");
	}
	return result.output;
}

async function getMinikubeDockerEnv(): Promise<Record<string, string>> {
	const result = await run(["minikube", "docker-env", "--shell", "none"]);
	if (!result.success) {
		throw new Error(`Failed to get minikube docker-env: ${result.error}`);
	}

	const env: Record<string, string> = {};
	for (const line of result.output.split("\n")) {
		// Format: KEY=VALUE (one per line with --shell none)
		const eqIndex = line.indexOf("=");
		if (eqIndex !== -1) {
			const key = line.slice(0, eqIndex);
			const value = line.slice(eqIndex + 1);
			env[key] = value;
		}
	}
	return env;
}

export async function buildLocal(
	imageName: string,
	tag: string,
	buildArgs: string[],
): Promise<void> {
	header(`Building ${imageName} (local)`);

	step("Resolving repository root...");
	const repoRoot = await getRepoRoot();
	success(`Repo root: ${repoRoot}`);

	step("Getting minikube docker-env...");
	const minikubeEnv = await getMinikubeDockerEnv();
	success("Minikube docker-env loaded");

	const imageTag = `localhost:5000/${imageName}:${tag}`;
	const cmd = ["docker", "buildx", "build", "--load", "-t", imageTag];

	for (const arg of buildArgs) {
		cmd.push("--build-arg", arg);
	}

	cmd.push("-f", "Dockerfile", repoRoot);

	step(`Building image: ${imageTag}`);
	info(`Command: ${cmd.join(" ")}`);
	console.log();

	const exitCode = await runInteractive(cmd, { env: minikubeEnv });
	if (exitCode !== 0) {
		error(`Build failed with exit code ${exitCode}`);
		process.exit(exitCode);
	}

	console.log();
	success(`Built ${imageTag}`);
}
