export type Environment = "dev" | "minikube" | "prod";

export interface DbConfig {
	/** Database name */
	database: string;
	/** Database user */
	user: string;
	/** Environments configuration */
	environments: {
		dev: {
			/** Host for local docker compose */
			host: string;
			/** Port for local docker compose */
			port: number;
		};
		minikube: {
			/** Kubernetes service name */
			service: string;
			/** Local port for port-forward */
			localPort: number;
		};
		prod: {
			/** Kubernetes service name */
			service: string;
			/** Local port for port-forward */
			localPort: number;
			/** Kubeconfig path */
			kubeconfig: string;
		};
	};
}

export interface ConnectionInfo {
	host: string;
	port: number;
	database: string;
	user: string;
	password: string;
}
