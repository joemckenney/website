import { Type } from "typebox";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { createStravaClient, exchangeCodeForTokens, refreshAccessToken } from "./client.js";
import { prisma } from "../db/client.js";
import { encrypt, decrypt } from "../db/crypto.js";

const ErrorResponse = Type.Object({
  error: Type.String(),
});

const StatusResponse = Type.Object({
  connected: Type.Boolean(),
  configured: Type.Optional(Type.Boolean()),
  athleteId: Type.Optional(Type.String()),
  expiresAt: Type.Optional(Type.String()),
});

export async function registerOAuthRoutes(
  app: FastifyInstance & { withTypeProvider: () => FastifyInstance },
) {
  const fastify = app.withTypeProvider<TypeBoxTypeProvider>();

  // Start OAuth flow - returns the authorization URL
  fastify.get(
    "/auth/connect",
    {
      schema: {
        operationId: "stravaConnect",
        description: "Get Strava OAuth authorization URL",
        tags: ["auth"],
        headers: Type.Object({
          "x-user-id": Type.String(),
        }),
        response: {
          200: Type.Object({
            authUrl: Type.String(),
          }),
          400: ErrorResponse,
          503: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      // Check if Strava is configured
      if (!config.isStravaConfigured) {
        return reply.status(503).send({
          error: "Strava integration is not configured. Set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET environment variables.",
        });
      }

      const userId = request.headers["x-user-id"];

      if (!userId) {
        return reply.status(400).send({ error: "x-user-id header is required" });
      }

      const strava = createStravaClient();
      const state = Buffer.from(JSON.stringify({ userId })).toString("base64url");
      const scopes = ["read", "activity:read_all", "profile:read_all"];

      const authUrl = strava.createAuthorizationURL(state, scopes);

      return reply.send({ authUrl: authUrl.toString() });
    },
  );

  // OAuth callback
  fastify.get(
    "/auth/callback",
    {
      schema: {
        operationId: "stravaCallback",
        description: "Strava OAuth callback",
        tags: ["auth"],
        querystring: Type.Object({
          code: Type.String(),
          state: Type.String(),
          scope: Type.Optional(Type.String()),
        }),
        response: {
          302: Type.Null(),
          400: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { code, state } = request.query;

      // Decode state to get userId
      let userId: string;
      try {
        const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
        userId = decoded.userId;
      } catch {
        return reply.status(400).send({ error: "Invalid state parameter" });
      }

      // Exchange code for tokens
      const tokens = await exchangeCodeForTokens(code);

      // Store encrypted tokens in database
      await prisma.stravaConnection.upsert({
        where: { userId },
        create: {
          userId,
          athleteId: tokens.athlete.id.toString(),
          accessToken: encrypt(tokens.access_token),
          refreshToken: encrypt(tokens.refresh_token),
          expiresAt: new Date(tokens.expires_at * 1000),
          scope: request.query.scope || "",
        },
        update: {
          athleteId: tokens.athlete.id.toString(),
          accessToken: encrypt(tokens.access_token),
          refreshToken: encrypt(tokens.refresh_token),
          expiresAt: new Date(tokens.expires_at * 1000),
          scope: request.query.scope || "",
        },
      });

      // Redirect back to frontend with success
      return reply.redirect(`${config.frontendUrl}/settings?strava_success=true`);
    },
  );

  // Check connection status
  fastify.get(
    "/auth/status",
    {
      schema: {
        operationId: "stravaStatus",
        description: "Check Strava connection status",
        tags: ["auth"],
        headers: Type.Object({
          "x-user-id": Type.String(),
        }),
        response: {
          200: StatusResponse,
        },
      },
    },
    async (request, reply) => {
      const userId = request.headers["x-user-id"];

      // If Strava is not configured, return early
      if (!config.isStravaConfigured) {
        return reply.send({ connected: false, configured: false });
      }

      const connection = await prisma.stravaConnection.findUnique({
        where: { userId },
      });

      if (!connection) {
        return reply.send({ connected: false, configured: true });
      }

      return reply.send({
        connected: true,
        configured: true,
        athleteId: connection.athleteId,
        expiresAt: connection.expiresAt.toISOString(),
      });
    },
  );

  // Disconnect Strava
  fastify.post(
    "/auth/disconnect",
    {
      schema: {
        operationId: "stravaDisconnect",
        description: "Disconnect Strava account",
        tags: ["auth"],
        headers: Type.Object({
          "x-user-id": Type.String(),
        }),
        response: {
          200: Type.Object({ success: Type.Boolean() }),
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const userId = request.headers["x-user-id"];

      const connection = await prisma.stravaConnection.findUnique({
        where: { userId },
      });

      if (!connection) {
        return reply.status(404).send({ error: "No Strava connection found" });
      }

      await prisma.stravaConnection.delete({
        where: { userId },
      });

      return reply.send({ success: true });
    },
  );
}
