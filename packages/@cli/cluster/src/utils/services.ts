export interface ServiceInfo {
	/** Kubernetes service/deployment name */
	name: string;
	/** pnpm workspace package name (for turbo --filter) */
	package: string;
}

const SERVICES: ServiceInfo[] = [
	{ name: "api-service", package: "@gateway/service" },
	{ name: "user-service", package: "@users/service" },
	{ name: "agent-service", package: "@agent/service" },
	{ name: "tables-service", package: "@tables/service" },
	{ name: "www-web", package: "@app/www" },
	{ name: "app-web", package: "@app/dashboard" },
	{ name: "strava-mcp-server", package: "@strava/mcp-server" },
];

const SHORTCUTS: Record<string, string> = {
	api: "api-service",
	gateway: "api-service",
	user: "user-service",
	users: "user-service",
	agent: "agent-service",
	tables: "tables-service",
	strava: "strava-mcp-server",
	www: "www-web",
	app: "app-web",
	dashboard: "app-web",
};

/**
 * Resolve a shortcut or service name to a ServiceInfo.
 * Returns undefined if not found.
 */
export function resolveService(input: string): ServiceInfo | undefined {
	const name = SHORTCUTS[input.toLowerCase()] ?? input.toLowerCase();
	return SERVICES.find((s) => s.name === name);
}

/**
 * Print available service shortcuts.
 */
export function printServiceShortcuts(): void {
	for (const [shortcut, fullName] of Object.entries(SHORTCUTS)) {
		console.log(`  ${shortcut.padEnd(12)} → ${fullName}`);
	}
}
