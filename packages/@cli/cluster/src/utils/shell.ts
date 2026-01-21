import type { Subprocess } from "bun";

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

/**
 * Check if a command exists
 */
export async function commandExists(command: string): Promise<boolean> {
	const result = await run(["which", command], { silent: true });
	return result.success;
}

/**
 * Run a command in the background and return its PID
 */
export function runBackground(
	command: string[],
	options?: { env?: Record<string, string> },
): Subprocess {
	return Bun.spawn(command, {
		stdout: "pipe",
		stderr: "pipe",
		env: { ...process.env, ...options?.env },
	});
}

/**
 * Check if a process is running by PID
 */
export function isProcessRunning(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

/**
 * Kill a process by PID
 */
export function killProcess(pid: number): boolean {
	try {
		process.kill(pid);
		return true;
	} catch {
		return false;
	}
}
