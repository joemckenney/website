import httpProxy from "@fastify/http-proxy";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";

/**
 * Public proxy for the weather service.
 * /weather/* is forwarded as-is, with no auth — the upstream stream and
 * REST endpoints are read-only weather telemetry.
 */
export async function registerWeatherRoutes(fastify: FastifyInstance) {
  await fastify.register(httpProxy, {
    upstream: config.weatherServiceUrl,
    prefix: "/weather",
    rewritePrefix: "/weather",
  });
}
