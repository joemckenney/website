import type { DbConfig, Environment } from "../types";
import { setupCleanup } from "../utils";

export async function logs(
  env: Environment,
  config: DbConfig,
  options: { follow?: boolean; tail?: number }
): Promise<void> {
  if (env === "dev") {
    console.log("Viewing logs for local docker postgres...\n");

    // For local dev, use docker compose logs
    const args = ["docker", "compose", "logs"];
    if (options.follow) args.push("-f");
    if (options.tail) args.push("--tail", String(options.tail));
    args.push("postgres"); // Assumes service is named 'postgres' in docker-compose

    const proc = Bun.spawn(args, {
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
    });

    setupCleanup();
    await proc.exited;
    return;
  }

  // For k8s environments
  const isProd = env === "prod";
  const envConfig = isProd ? config.environments.prod : config.environments.minikube;
  const kubeconfig = isProd ? config.environments.prod.kubeconfig : undefined;

  // Get the pod name for the postgres statefulset
  const podName = `${envConfig.service.replace("-postgresql", "")}-postgresql-0`;

  console.log(`Viewing logs for ${podName}...\n`);

  const args = ["kubectl", "logs"];
  if (options.follow) args.push("-f");
  if (options.tail) args.push("--tail", String(options.tail));
  args.push(podName);

  const envVars = kubeconfig
    ? { ...process.env, KUBECONFIG: kubeconfig }
    : process.env;

  const proc = Bun.spawn(args, {
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
    env: envVars,
  });

  setupCleanup();
  await proc.exited;
}
