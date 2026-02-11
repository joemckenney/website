import { error, header, info, step, success } from "../utils/colors";
import { isMinikubeRunning } from "../utils/minikube";
import { resolveService } from "../utils/services";
import { run, runInteractive } from "../utils/shell";

const DB_PACKAGES = [
	{ name: "users", path: "services/@users/db" },
	{ name: "agent", path: "services/@agent/db" },
	{ name: "tables", path: "services/@tables/db" },
];

async function getRepoRoot(): Promise<string> {
	const result = await run(["git", "rev-parse", "--show-toplevel"]);
	if (!result.success) {
		throw new Error("Failed to determine repository root");
	}
	return result.output;
}

export async function migrate(service?: string): Promise<void> {
	header(service ? `Migrate ${service} Database` : "Migrate All Databases");

	step("Checking cluster status...");
	if (!(await isMinikubeRunning())) {
		error("Cluster is not running");
		info("Start it with: pnpm exec cluster start");
		process.exit(1);
	}
	success("Cluster is running");
	console.log();

	const repoRoot = await getRepoRoot();

	let packages = DB_PACKAGES;
	if (service) {
		const resolved = resolveService(service);
		if (!resolved) {
			error(`Unknown service: ${service}`);
			process.exit(1);
		}
		const match = DB_PACKAGES.find((p) => resolved.name.startsWith(p.name));
		if (!match) {
			error(`No database package found for ${service}`);
			process.exit(1);
		}
		packages = [match];
	}

	for (const pkg of packages) {
		step(`Migrating ${pkg.name}...`);
		const exitCode = await runInteractive(
			["pnpm", "exec", "db", "migrate", "--minikube"],
			{
				cwd: `${repoRoot}/${pkg.path}`,
			},
		);
		if (exitCode !== 0) {
			error(`Failed to migrate ${pkg.name}`);
			process.exit(1);
		}
		success(`${pkg.name} migrated`);
		console.log();
	}
}
