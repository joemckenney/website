/**
 * Run a command and return whether it succeeded
 */
export async function run(
	command: string[],
	options?: { silent?: boolean; env?: Record<string, string> },
): Promise<{ success: boolean; output: string; error: string }> {
	const proc = Bun.spawn(command, {
		stdout: "pipe",
		stderr: "pipe",
		env: { ...process.env, ...options?.env },
	});

	const [stdout, stderr] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	]);

	const exitCode = await proc.exited;

	return {
		success: exitCode === 0,
		output: stdout.trim(),
		error: stderr.trim(),
	};
}

/**
 * Run a command with inherited stdio (interactive)
 */
export async function runInteractive(
	command: string[],
	options?: { env?: Record<string, string> },
): Promise<number> {
	const proc = Bun.spawn(command, {
		stdout: "inherit",
		stderr: "inherit",
		stdin: "inherit",
		env: { ...process.env, ...options?.env },
	});

	return proc.exited;
}
