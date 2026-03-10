import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyInstance } from "fastify";
import { prisma, serializeReading } from "../db/client.js";
import {
  ErrorResponse,
  HistoryQuery,
  WeatherReading,
  WeatherReadingArray,
} from "../schemas.js";

export async function registerWeatherRoutes(
  fastify: FastifyInstance & { withTypeProvider: () => FastifyInstance },
) {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>();

  app.get(
    "/weather/current",
    {
      schema: {
        operationId: "getCurrentWeather",
        tags: ["weather"],
        description: "Get the most recent weather reading",
        response: {
          200: WeatherReading,
          404: ErrorResponse,
        },
      },
    },
    async (_request, reply) => {
      const reading = await prisma.weatherReading.findFirst({
        orderBy: { timestamp: "desc" },
      });

      if (!reading) {
        return reply.status(404).send({ error: "No readings available" });
      }

      return serializeReading(reading);
    },
  );

  app.get(
    "/weather/history",
    {
      schema: {
        operationId: "getWeatherHistory",
        tags: ["weather"],
        description: "Get historical weather readings within a time range",
        querystring: HistoryQuery,
        response: {
          200: WeatherReadingArray,
        },
      },
    },
    async (request) => {
      const { start, end, limit = 100 } = request.query;

      const where: Record<string, unknown> = {};
      if (start || end) {
        const timestamp: Record<string, Date> = {};
        if (start) timestamp.gte = new Date(start);
        if (end) timestamp.lte = new Date(end);
        where.timestamp = timestamp;
      }

      const readings = await prisma.weatherReading.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: limit,
      });

      return readings.map(serializeReading);
    },
  );
}
