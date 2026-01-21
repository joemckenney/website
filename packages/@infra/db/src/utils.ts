import type { Subprocess } from "bun";
import { expandHome, getPassword } from "./config";
import type { ConnectionInfo, DbConfig, Environment } from "./types";

let portForwardProcess: Subprocess | null = null;

/**
 * Start port-forwarding to a kubernetes service
 */
export async function startPortForward(
	env: "minikube" | "prod",
	config: DbConfig,
): Promise<void> {
	const isProd = env === "prod";
	const envConfig = isProd
		? config.environments.prod
		: config.environments.minikube;
	const kubeconfigRaw = isProd
		? config.environments.prod.kubeconfig
		: undefined;
	const kubeconfig = kubeconfigRaw ? expandHome(kubeconfigRaw) : undefined;

	const args = [
		"kubectl",
		"port-forward",
		`svc/${envConfig.service}`,
		`${envConfig.localPort}:5432`,
	];

	const envVars = kubeconfig
		? { ...process.env, KUBECONFIG: kubeconfig }
		: process.env;

	console.log(
		`Starting port-forward to ${envConfig.service} on localhost:${envConfig.localPort}...`,
	);

	portForwardProcess = Bun.spawn(args, {
		stdout: "pipe",
		stderr: "pipe",
		env: envVars,
	});

	// Wait for port-forward to be ready
	await Bun.sleep(2000);

	// Check if process is still running
	if (portForwardProcess.exitCode !== null) {
		const stderr = portForwardProcess.stderr;
		const error =
			stderr instanceof ReadableStream
				? await new Response(stderr).text()
				: "Unknown error";
		throw new Error(`Port-forward failed: ${error}`);
	}

	console.log("Port-forward established.");
}

/**
 * Stop port-forwarding
 */
export function stopPortForward(): void {
	if (portForwardProcess) {
		portForwardProcess.kill();
		portForwardProcess = null;
		console.log("Port-forward stopped.");
	}
}

/**
 * Setup cleanup handlers for graceful shutdown
 */
export function setupCleanup(): void {
	process.on("SIGINT", () => {
		stopPortForward();
		process.exit(0);
	});

	process.on("SIGTERM", () => {
		stopPortForward();
		process.exit(0);
	});
}

/**
 * Get connection info for an environment
 */
export async function getConnectionInfo(
	env: Environment,
	config: DbConfig,
): Promise<ConnectionInfo> {
	const password = await getPassword(env, config);

	if (env === "dev") {
		return {
			host: config.environments.dev.host,
			port: config.environments.dev.port,
			database: config.database,
			user: config.user,
			password,
		};
	}

	const envConfig =
		env === "prod" ? config.environments.prod : config.environments.minikube;

	return {
		host: "localhost",
		port: envConfig.localPort,
		database: config.database,
		user: config.user,
		password,
	};
}

/**
 * Build DATABASE_URL from connection info
 */
export function buildDatabaseUrl(conn: ConnectionInfo): string {
	const encodedPassword = encodeURIComponent(conn.password);
	return `postgresql://${conn.user}:${encodedPassword}@${conn.host}:${conn.port}/${conn.database}`;
}

/**
 * Print a warning banner for production
 */
export function printProdWarning(): void {
	console.log(`\n${"=".repeat(60)}`);
	console.log("⚠️  WARNING: You are connected to PRODUCTION data!");
	console.log(`${"=".repeat(60)}\n`);
}

/**
 * Confirm production access
 */
export async function confirmProdAccess(): Promise<boolean> {
	printProdWarning();

	// Use Node's readline which properly handles terminal state
	const readline = await import("node:readline");
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		rl.question("Type 'yes' to continue: ", (answer) => {
			rl.close();
			resolve(answer.trim().toLowerCase() === "yes");
		});
	});
}
