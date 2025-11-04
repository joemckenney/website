import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Google, generateState, generateCodeVerifier } from 'arctic';
import { config } from '../config.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../lib/jwt.js';

const google = new Google(
  config.google.clientId,
  config.google.clientSecret,
  config.google.redirectUri
);

// In-memory store for OAuth state and code verifier (use Redis in production)
const oauthStore = new Map<string, { codeVerifier: string; timestamp: number }>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of oauthStore.entries()) {
    if (now - data.timestamp > 10 * 60 * 1000) { // 10 minutes
      oauthStore.delete(state);
    }
  }
}, 5 * 60 * 1000);

export async function registerAuthRoutes(
  fastify: FastifyInstance & { withTypeProvider: <T>() => FastifyInstance }
) {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>();

  // Initiate Google OAuth flow
  app.get('/auth/google', async (request, reply) => {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();

    // Store state and code verifier for verification
    oauthStore.set(state, {
      codeVerifier,
      timestamp: Date.now(),
    });

    const url = google.createAuthorizationURL(state, codeVerifier, ['openid', 'email', 'profile']);

    return reply.redirect(url.toString());
  });

  // Google OAuth callback
  app.get('/auth/google/callback', async (request, reply) => {
    const { code, state } = request.query as { code?: string; state?: string };

    if (!code || !state) {
      return reply.status(400).send({ error: 'Missing code or state parameter' });
    }

    const storedData = oauthStore.get(state);
    if (!storedData) {
      return reply.status(400).send({ error: 'Invalid state parameter' });
    }

    // Clean up used state
    oauthStore.delete(state);

    try {
      // Exchange code for tokens
      const tokens = await google.validateAuthorizationCode(code, storedData.codeVerifier);

      // Fetch user info from Google
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokens.accessToken()}`,
        },
      });

      const userInfo = await response.json() as { email: string; name: string };

      // Check if email is allowed
      if (userInfo.email !== config.allowedEmail) {
        return reply.redirect(`${config.frontendUrl}?error=unauthorized`);
      }

      // Generate JWT tokens
      const accessToken = generateAccessToken(userInfo.email);
      const refreshToken = generateRefreshToken(userInfo.email);

      // Redirect to frontend with tokens
      const redirectUrl = new URL(config.frontendUrl);
      redirectUrl.searchParams.set('access_token', accessToken);
      redirectUrl.searchParams.set('refresh_token', refreshToken);

      return reply.redirect(redirectUrl.toString());
    } catch (error) {
      fastify.log.error(error);
      return reply.redirect(`${config.frontendUrl}?error=auth_failed`);
    }
  });

  // Refresh access token
  app.post('/auth/refresh', async (request, reply) => {
    const { refresh_token } = request.body as { refresh_token?: string };

    if (!refresh_token) {
      return reply.status(400).send({ error: 'Missing refresh token' });
    }

    try {
      const payload = verifyRefreshToken(refresh_token);

      if (payload.type !== 'refresh') {
        return reply.status(400).send({ error: 'Invalid token type' });
      }

      if (payload.email !== config.allowedEmail) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Generate new access token
      const accessToken = generateAccessToken(payload.email);

      return reply.send({ access_token: accessToken });
    } catch (error) {
      return reply.status(401).send({ error: 'Invalid or expired refresh token' });
    }
  });

  // Logout (client-side token removal, but endpoint for consistency)
  app.post('/auth/logout', async (request, reply) => {
    return reply.send({ message: 'Logged out successfully' });
  });

  // Get current user info (protected endpoint example)
  app.get('/auth/me', {
    preHandler: async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Missing authorization header' });
      }

      const token = authHeader.substring(7);
      try {
        const { verifyAccessToken } = await import('../lib/jwt.js');
        const payload = verifyAccessToken(token);

        if (payload.email !== config.allowedEmail) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        request.user = { email: payload.email };
      } catch (error) {
        return reply.status(401).send({ error: 'Invalid or expired token' });
      }
    },
  }, async (request, reply) => {
    return reply.send({ email: request.user?.email });
  });
}
