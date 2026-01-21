import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { DbConfig, Environment } from "../types";
import {
  startPortForward,
  stopPortForward,
  setupCleanup,
  getConnectionInfo,
  confirmProdAccess,
} from "../utils";

export async function dump(
  env: Environment,
  config: DbConfig,
  options: { output?: string; dataOnly?: boolean; schemaOnly?: boolean }
): Promise<void> {
  // Confirm production access
  if (env === "prod") {
    const confirmed = await confirmProdAccess();
    if (!confirmed) {
      console.log("Aborted.");
      return;
    }
  }

  setupCleanup();

  try {
    // Start port-forward for k8s environments
    if (env !== "dev") {
      await startPortForward(env, config);
    }

    const conn = await getConnectionInfo(env, config);

    // Generate output filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const defaultFilename = `${config.database}-${env}-${timestamp}.sql`;
    const outputPath = options.output || join(process.cwd(), "dumps", defaultFilename);

    // Ensure dumps directory exists
    const dumpsDir = join(process.cwd(), "dumps");
    if (!existsSync(dumpsDir)) {
      mkdirSync(dumpsDir, { recursive: true });
    }

    console.log(`Dumping ${conn.database} to ${outputPath}...`);

    // Build pg_dump args
    const args = [
      "pg_dump",
      "-h", conn.host,
      "-p", String(conn.port),
      "-U", conn.user,
      "-d", conn.database,
      "-f", outputPath,
    ];

    if (options.dataOnly) {
      args.push("--data-only");
    } else if (options.schemaOnly) {
      args.push("--schema-only");
    }

    const proc = Bun.spawn(args, {
      stdout: "inherit",
      stderr: "inherit",
      env: {
        ...process.env,
        PGPASSWORD: conn.password,
      },
    });

    const exitCode = await proc.exited;

    if (exitCode === 0) {
      console.log(`\n✅ Dump complete: ${outputPath}`);
    } else {
      console.error(`\n❌ Dump failed with exit code ${exitCode}`);
      process.exit(1);
    }
  } finally {
    stopPortForward();
  }
}
