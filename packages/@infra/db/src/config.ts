import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { DbConfig } from "./types";

const CONFIG_FILENAME = "db.config.json";

/**
 * Expand ~ to home directory
 */
export function expandHome(path: string): string {
	if (path.startsWith("~/")) {
		return join(homedir(), path.slice(2));
	}
	return path;
}

/**
 * Find and load db.config.json from current directory or ancestors
 */
export async function loadConfig(): Promise<DbConfig> {
	let dir = process.cwd();
	const root = "/";

	while (dir !== root) {
		const configPath = join(dir, CONFIG_FILENAME);
		if (existsSync(configPath)) {
			const file = Bun.file(configPath);
			const config = await file.json();
			return config as DbConfig;
		}
		dir = join(dir, "..");
	}

	throw new Error(
		`Could not find ${CONFIG_FILENAME} in current directory or ancestors.\n` +
			`Run this command from a database package directory (e.g., services/@users/db)`,
	);
}

/**
 * Get password for the database from kubernetes secret or env var
 */
export async function getPassword(
	env: "dev" | "minikube" | "prod",
	config: DbConfig,
): Promise<string> {
	if (env === "dev") {
		// For local dev, password comes from environment or default
		return process.env.DB_PASSWORD || "devpassword";
	}

	const kubeconfigRaw =
		env === "prod" ? config.environments.prod.kubeconfig : undefined;
	const kubeconfig = kubeconfigRaw ? expandHome(kubeconfigRaw) : undefined;

	const service =
		env === "prod"
			? config.environments.prod.service
			: config.environments.minikube.service;

	const kubeconfigArg = kubeconfig ? `KUBECONFIG=${kubeconfig}` : "";

	const proc = Bun.spawn(
		[
			"sh",
			"-c",
			`${kubeconfigArg} kubectl get secret ${service} -o jsonpath='{.data.password}' | base64 -d`,
		],
		{ stdout: "pipe", stderr: "pipe" },
	);

	const output = await new Response(proc.stdout).text();
	const error = await new Response(proc.stderr).text();
	const exitCode = await proc.exited;

	if (exitCode !== 0) {
		throw new Error(`Failed to get password from secret: ${error}`);
	}

	return output.trim();
}
