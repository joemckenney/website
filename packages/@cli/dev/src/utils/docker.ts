import { run } from "./shell";

export async function isDockerRunning(): Promise<boolean> {
	const result = await run(["docker", "info"]);
	return result.exitCode === 0;
}
