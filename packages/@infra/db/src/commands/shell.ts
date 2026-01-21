import type { DbConfig, Environment } from "../types";
import {
  startPortForward,
  stopPortForward,
  setupCleanup,
  getConnectionInfo,
  confirmProdAccess,
  printProdWarning,
} from "../utils";

export async function shell(
  env: Environment,
  config: DbConfig
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

    if (env === "prod") {
      printProdWarning();
    } else if (env === "minikube") {
      console.log("\n⚠️  Connected to LOCAL KUBERNETES (minikube)\n");
    } else {
      console.log("\n📦 Connected to LOCAL DOCKER\n");
    }

    console.log(`Connecting to ${conn.database}@${conn.host}:${conn.port}...\n`);

    // Run psql
    const proc = Bun.spawn(
      [
        "psql",
        "-h", conn.host,
        "-p", String(conn.port),
        "-U", conn.user,
        "-d", conn.database,
      ],
      {
        stdout: "inherit",
        stderr: "inherit",
        stdin: "inherit",
        env: {
          ...process.env,
          PGPASSWORD: conn.password,
        },
      }
    );

    await proc.exited;
  } finally {
    stopPortForward();
  }
}
