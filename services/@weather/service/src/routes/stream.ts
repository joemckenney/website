import type { FastifyInstance } from "fastify";
import { onReading } from "../lib/awn-connector.js";

export async function registerStreamRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/weather/stream",
    {
      schema: {
        operationId: "streamWeather",
        tags: ["weather"],
        description: "SSE stream of real-time weather readings",
        response: {
          200: {
            type: "string",
            description: "Server-Sent Events stream",
          },
        },
      },
    },
    async (request, reply) => {
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });

      // Send initial keepalive
      reply.raw.write(":ok\n\n");

      const unsubscribe = onReading((reading) => {
        reply.raw.write(`data: ${JSON.stringify(reading)}\n\n`);
      });

      // Heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        reply.raw.write(":heartbeat\n\n");
      }, 30000);

      request.raw.on("close", () => {
        unsubscribe();
        clearInterval(heartbeat);
      });
    },
  );
}
