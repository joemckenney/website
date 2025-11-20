import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Google, generateCodeVerifier, generateState } from "arctic";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt.js";
import {
  ErrorResponse,
  LogoutResponse,
  MeResponse,
  RefreshTokenResponse,
} from "../schemas.js";
import { Type } from "typebox";

const google = new Google(
  config.google.clientId,
  config.google.clientSecret,
  config.google.redirectUri,
);

// In-memory store for OAuth state and code verifier (use Redis in production)
const oauthStore = new Map<
  string,
  { codeVerifier: string; timestamp: number }
>();

// Clean up old entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [state, data] of oauthStore.entries()) {
      if (now - data.timestamp > 10 * 60 * 1000) {
        // 10 minutes
        oauthStore.delete(state);
      }
    }
  },
  5 * 60 * 1000,
);

export async function registerAuthRoutes(
  fastify: FastifyInstance & { withTypeProvider: <_T>() => FastifyInstance },
) {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>();

  // Initiate Google OAuth flow
  app.get(
    "/auth/google",
    {
      schema: {
        description: "Initiate Google OAuth 2.0 authentication flow",
        tags: ["auth"],
        response: {
          302: {
            description: "Redirect to Google OAuth authorization page",
            type: "null",
          },
        },
      },
    },
    async (_request, reply) => {
      const state = generateState();
      const codeVerifier = generateCodeVerifier();

      // Store state and code verifier for verification
      oauthStore.set(state, {
        codeVerifier,
        timestamp: Date.now(),
      });

      const url = google.createAuthorizationURL(state, codeVerifier, [
        "openid",
        "email",
        "profile",
      ]);

      return reply.redirect(url.toString());
    },
  );

  // Google OAuth callback
  app.get(
    "/auth/google/callback",
    {
      schema: {
        description: "Handle Google OAuth 2.0 callback and authenticate user",
        tags: ["auth"],
        querystring: Type.Object({
          code: Type.String({ description: "Authorization code from Google" }),
          state: Type.String({
            description: "State parameter for CSRF protection",
          }),
        }),
        response: {
          302: {
            description:
              "Redirect to frontend with access token or error parameter",
            type: "null",
          },
          400: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { code, state } = request.query;

      if (!code || !state) {
        return reply
          .status(400)
          .send({ error: "Missing code or state parameter" });
      }

      const storedData = oauthStore.get(state);
      if (!storedData) {
        return reply.status(400).send({ error: "Invalid state parameter" });
      }

      // Clean up used state
      oauthStore.delete(state);

      try {
        // Exchange code for tokens
        const tokens = await google.validateAuthorizationCode(
          code,
          storedData.codeVerifier,
        );

        // Fetch user info from Google
        const response = await fetch(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          {
            headers: {
              Authorization: `Bearer ${tokens.accessToken()}`,
            },
          },
        );

        const userInfo = (await response.json()) as {
          email: string;
          name: string;
        };

        // Check if email is allowed
        if (userInfo.email !== config.allowedEmail) {
          return reply.redirect(`${config.frontendUrl}?error=unauthorized`);
        }

        // Generate JWT tokens
        const accessToken = generateAccessToken(userInfo.email);
        const refreshToken = generateRefreshToken(userInfo.email);

        // Set refresh token as httpOnly cookie
        // Use secure flag only when request is over HTTPS (not based on NODE_ENV)
        const isHttps = request.protocol === "https";
        reply.setCookie("refresh_token", refreshToken, {
          httpOnly: true,
          secure: isHttps, // Only send over HTTPS if request came via HTTPS
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        });

        // Redirect to frontend with only access token (not refresh token)
        const redirectUrl = new URL(config.frontendUrl);
        redirectUrl.searchParams.set("access_token", accessToken);

        return reply.redirect(redirectUrl.toString());
      } catch (error) {
        fastify.log.error(error);
        return reply.redirect(`${config.frontendUrl}?error=auth_failed`);
      }
    },
  );

  app.post(
    "/auth/refresh",
    {
      schema: {
        description:
          "Refresh access token using httpOnly cookie with token rotation",
        tags: ["auth"],
        response: {
          200: RefreshTokenResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const refresh_token = request.cookies.refresh_token;

      if (!refresh_token) {
        return reply.status(400).send({ error: "Missing refresh token" });
      }

      try {
        const payload = verifyRefreshToken(refresh_token);

        if (payload.type !== "refresh") {
          return reply.status(400).send({ error: "Invalid token type" });
        }

        if (payload.email !== config.allowedEmail) {
          return reply.status(403).send({ error: "Access denied" });
        }

        // Generate new access token
        const accessToken = generateAccessToken(payload.email);

        // Generate new refresh token (token rotation for security)
        const newRefreshToken = generateRefreshToken(payload.email);

        // Update refresh token cookie with new token
        const isHttps = request.protocol === "https";
        reply.setCookie("refresh_token", newRefreshToken, {
          httpOnly: true,
          secure: isHttps,
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        });

        return reply.send({ access_token: accessToken });
      } catch (_error) {
        // Clear invalid refresh token cookie
        const isHttps = request.protocol === "https";
        reply.clearCookie("refresh_token", {
          httpOnly: true,
          secure: isHttps,
          sameSite: "lax",
          path: "/",
        });

        return reply
          .status(401)
          .send({ error: "Invalid or expired refresh token" });
      }
    },
  );

  app.post(
    "/auth/logout",
    {
      schema: {
        description: "Logout and clear refresh token cookie",
        tags: ["auth"],
        response: {
          200: LogoutResponse,
        },
      },
    },
    async (request, reply) => {
      const isHttps = request.protocol === "https";
      reply.clearCookie("refresh_token", {
        httpOnly: true,
        secure: isHttps,
        sameSite: "lax",
        path: "/",
      });

      return reply.send({ message: "Logged out successfully" });
    },
  );

  app.get(
    "/auth/me",
    {
      schema: {
        description: "Get current authenticated user information",
        tags: ["auth"],
        security: [{ bearerAuth: [] }],
        response: {
          200: MeResponse,
          401: ErrorResponse,
          403: ErrorResponse,
        },
      },
      preHandler: async (request, reply) => {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return reply
            .status(401)
            .send({ error: "Missing authorization header" });
        }

        const token = authHeader.substring(7);
        try {
          const { verifyAccessToken } = await import("../lib/jwt.js");
          const payload = verifyAccessToken(token);

          if (payload.email !== config.allowedEmail) {
            return reply.status(403).send({ error: "Access denied" });
          }

          request.user = { email: payload.email };
        } catch (_error) {
          return reply.status(401).send({ error: "Invalid or expired token" });
        }
      },
    },
    async (request, reply) => {
      return reply.send({ email: request.user?.email as string });
    },
  );
}
