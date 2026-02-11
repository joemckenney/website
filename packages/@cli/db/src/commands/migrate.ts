import type { DbConfig, Environment } from "../types";
import {
	buildDatabaseUrl,
	confirmProdAccess,
	getConnectionInfo,
	printProdWarning,
	setupCleanup,
	startPortForward,
	stopPortForward,
} from "../utils";

export async function migrate(
	env: Environment,
	config: DbConfig,
): Promise<void> {
	if (env === "prod") {
		const confirmed = await confirmProdAccess();
		if (!confirmed) {
			console.log("Aborted.");
			return;
		}
	}

	setupCleanup();

	try {
		if (env !== "dev") {
			await startPortForward(env, config);
		}

		const conn = await getConnectionInfo(env, config);
		const databaseUrl = buildDatabaseUrl(conn);

		if (env === "prod") {
			printProdWarning();
		} else if (env === "minikube") {
			console.log("\n⚠️  Migrating LOCAL KUBERNETES (minikube)\n");
		} else {
			console.log("\n📦 Migrating LOCAL DOCKER\n");
		}

		console.log(`Running prisma migrate deploy on ${config.database}...\n`);

		const proc = Bun.spawn(["npx", "prisma", "migrate", "deploy"], {
			stdout: "inherit",
			stderr: "inherit",
			cwd: process.cwd(),
			env: {
				...process.env,
				DATABASE_URL: databaseUrl,
			},
		});

		const exitCode = await proc.exited;
		if (exitCode !== 0) {
			process.exit(exitCode);
		}

		console.log("\n✓ Migration complete");
	} finally {
		stopPortForward();
	}
}
