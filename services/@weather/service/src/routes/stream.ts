import type { FastifyInstance } from "fastify";
import { onReading } from "../lib/awn-connector.js";
import { prisma, serializeReading } from "../db/client.js";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
  "Access-Control-Allow-Origin": "*",
} as const;

const BATCH_SIZE = 200;

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
      reply.raw.writeHead(200, SSE_HEADERS);

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

  fastify.get(
    "/weather/stream/history",
    {
      schema: {
        operationId: "streamWeatherHistory",
        tags: ["weather"],
        description:
          "SSE stream of historical weather readings in batches, then live",
        querystring: {
          type: "object",
          properties: {
            start: { type: "string", format: "date-time" },
            end: { type: "string", format: "date-time" },
          },
        },
        response: {
          200: {
            type: "string",
            description: "Server-Sent Events stream",
          },
        },
      },
    },
    async (request, reply) => {
      const { start, end } = request.query as {
        start?: string;
        end?: string;
      };

      reply.raw.writeHead(200, SSE_HEADERS);
      reply.raw.write(":ok\n\n");

      let closed = false;
      request.raw.on("close", () => {
        closed = true;
      });

      const rangeFilter: { gte?: Date; lte?: Date } = {};
      if (start) rangeFilter.gte = new Date(start);
      if (end) rangeFilter.lte = new Date(end);
      const hasRange = start || end;

      const baseWhere = hasRange ? { timestamp: rangeFilter } : {};

      // Send meta event with total count and time range
      const [total, first, last] = await Promise.all([
        prisma.weatherReading.count({ where: baseWhere }),
        prisma.weatherReading.findFirst({
          where: baseWhere,
          orderBy: { timestamp: "asc" },
          select: { timestamp: true },
        }),
        prisma.weatherReading.findFirst({
          where: baseWhere,
          orderBy: { timestamp: "desc" },
          select: { timestamp: true },
        }),
      ]);

      if (closed) return;

      reply.raw.write(
        `event: meta\ndata: ${JSON.stringify({
          total,
          start: first?.timestamp.toISOString() ?? null,
          end: last?.timestamp.toISOString() ?? null,
        })}\n\n`,
      );

      // Stream batches using cursor-based pagination
      let cursor: Date | null = null;
      let sent = 0;

      while (!closed && sent < total) {
        const where: Record<string, unknown> = {};
        const tsFilter: Record<string, Date> = {};
        if (start) tsFilter.gte = new Date(start);
        if (end) tsFilter.lte = new Date(end);
        if (cursor) tsFilter.gt = cursor;
        if (Object.keys(tsFilter).length > 0) where.timestamp = tsFilter;

        const batch = await prisma.weatherReading.findMany({
          where,
          orderBy: { timestamp: "asc" },
          take: BATCH_SIZE,
        });

        if (batch.length === 0) break;

        reply.raw.write(
          `event: batch\ndata: ${JSON.stringify({ readings: batch.map(serializeReading) })}\n\n`,
        );

        cursor = batch[batch.length - 1].timestamp;
        sent += batch.length;
      }

      if (closed) return;

      reply.raw.write("event: done\ndata: {}\n\n");

      // Transition to live readings
      const unsubscribe = onReading((reading) => {
        reply.raw.write(`event: reading\ndata: ${JSON.stringify(reading)}\n\n`);
      });

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
