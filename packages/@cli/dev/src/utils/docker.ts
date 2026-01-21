import { run } from "./shell";

export async function isDockerRunning(): Promise<boolean> {
	const result = await run(["docker", "info"]);
	return result.exitCode === 0;
}

export async function getContainerHealth(
	containerName: string,
): Promise<"healthy" | "unhealthy" | "starting" | "none"> {
	const result = await run([
		"docker",
		"inspect",
		"--format",
		"{{.State.Health.Status}}",
		containerName,
	]);

	if (result.exitCode !== 0) return "none";

	const status = result.stdout.trim();
	if (status === "healthy") return "healthy";
	if (status === "unhealthy") return "unhealthy";
	return "starting";
}

export async function waitForHealthy(
	containerName: string,
	timeoutMs: number = 60000,
): Promise<boolean> {
	const start = Date.now();

	while (Date.now() - start < timeoutMs) {
		const health = await getContainerHealth(containerName);
		if (health === "healthy") return true;
		if (health === "unhealthy") return false;

		// Wait 1 second before checking again
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	return false;
}

export async function composeUp(): Promise<number> {
	const proc = Bun.spawn(["docker", "compose", "up", "-d"], {
		stdout: "inherit",
		stderr: "inherit",
	});
	return await proc.exited;
}

export async function composeDown(): Promise<number> {
	const proc = Bun.spawn(["docker", "compose", "down"], {
		stdout: "inherit",
		stderr: "inherit",
	});
	return await proc.exited;
}

export async function composeLogs(): Promise<Bun.Subprocess> {
	return Bun.spawn(["docker", "compose", "logs", "-f"], {
		stdout: "pipe",
		stderr: "pipe",
	});
}
