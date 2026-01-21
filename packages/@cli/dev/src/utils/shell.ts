import type { Subprocess } from "bun";

export async function run(
	command: string[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
	const proc = Bun.spawn(command, {
		stdout: "pipe",
		stderr: "pipe",
	});

	const stdout = await new Response(proc.stdout).text();
	const stderr = await new Response(proc.stderr).text();
	const exitCode = await proc.exited;

	return { exitCode, stdout: stdout.trim(), stderr: stderr.trim() };
}

export async function runInteractive(command: string[]): Promise<number> {
	const proc = Bun.spawn(command, {
		stdout: "inherit",
		stderr: "inherit",
		stdin: "inherit",
	});

	return await proc.exited;
}

export function spawnWithPrefix(
	command: string[],
	prefixText: string,
	color: (s: string) => string,
): Subprocess {
	const proc = Bun.spawn(command, {
		stdout: "pipe",
		stderr: "pipe",
	});

	// Stream stdout with prefix
	if (proc.stdout) {
		const reader = proc.stdout.getReader();
		const decoder = new TextDecoder();
		let buffer = "";

		(async () => {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					if (line.trim()) {
						console.log(`${color(`[${prefixText}]`)} ${line}`);
					}
				}
			}
			// Flush remaining buffer
			if (buffer.trim()) {
				console.log(`${color(`[${prefixText}]`)} ${buffer}`);
			}
		})();
	}

	// Stream stderr with prefix
	if (proc.stderr) {
		const reader = proc.stderr.getReader();
		const decoder = new TextDecoder();
		let buffer = "";

		(async () => {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					if (line.trim()) {
						console.error(`${color(`[${prefixText}]`)} ${line}`);
					}
				}
			}
			// Flush remaining buffer
			if (buffer.trim()) {
				console.error(`${color(`[${prefixText}]`)} ${buffer}`);
			}
		})();
	}

	return proc;
}

export async function commandExists(command: string): Promise<boolean> {
	const result = await run(["which", command]);
	return result.exitCode === 0;
}
