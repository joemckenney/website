import type { DbConfig, Environment } from "../types";
import {
  startPortForward,
  stopPortForward,
  setupCleanup,
  getConnectionInfo,
  buildDatabaseUrl,
  confirmProdAccess,
  printProdWarning,
} from "../utils";

export async function studio(env: Environment, config: DbConfig): Promise<void> {
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
    const databaseUrl = buildDatabaseUrl(conn);

    if (env === "minikube") {
      console.log("\n⚠️  Connected to LOCAL KUBERNETES (minikube)\n");
    } else if (env === "dev") {
      console.log("\n📦 Connected to LOCAL DOCKER\n");
    }

    console.log("Starting Prisma Studio...\n");

    // Run prisma studio
    const proc = Bun.spawn(["npx", "prisma", "studio"], {
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    });

    await proc.exited;
  } finally {
    stopPortForward();
  }
}
