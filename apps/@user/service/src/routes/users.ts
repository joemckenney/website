import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { prisma, serializeUser } from "../db/client.js";
import {
  CreateUserBody,
  ErrorResponse,
  UpdateUserBody,
  User,
  UserEmailParams,
  UserIdParams,
  UserProviderParams,
} from "../schemas.js";
import { Type } from "typebox";

export async function registerUserRoutes(
  app: FastifyInstance & { withTypeProvider: () => FastifyInstance },
) {
  const fastify = app.withTypeProvider<TypeBoxTypeProvider>();

  // Create user
  fastify.post(
    "/users",
    {
      schema: {
        operationId: "createUser",
        description: "Create a new user from OAuth signup",
        tags: ["users"],
        body: CreateUserBody,
        response: {
          201: User,
          400: ErrorResponse,
          409: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        const user = await prisma.user.create({
          data: request.body,
        });
        return reply.status(201).send(serializeUser(user));
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("Unique constraint")
        ) {
          return reply.status(409).send({ error: "User already exists" });
        }
        throw error;
      }
    },
  );

  // Get user by ID
  fastify.get(
    "/users/:id",
    {
      schema: {
        operationId: "getUserById",
        description: "Get a user by their ID",
        tags: ["users"],
        params: UserIdParams,
        response: {
          200: User,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.params.id },
      });
      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }
      return serializeUser(user);
    },
  );

  // Get user by email
  fastify.get(
    "/users/by-email/:email",
    {
      schema: {
        operationId: "getUserByEmail",
        description: "Get a user by their email address",
        tags: ["users"],
        params: UserEmailParams,
        response: {
          200: User,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { email: request.params.email },
      });
      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }
      return serializeUser(user);
    },
  );

  // Get user by OAuth provider
  fastify.get(
    "/users/by-provider/:provider/:providerId",
    {
      schema: {
        operationId: "getUserByProvider",
        description: "Get a user by their OAuth provider and provider ID",
        tags: ["users"],
        params: UserProviderParams,
        response: {
          200: User,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: {
          provider_providerId: {
            provider: request.params.provider,
            providerId: request.params.providerId,
          },
        },
      });
      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }
      return serializeUser(user);
    },
  );

  // Update user
  fastify.put(
    "/users/:id",
    {
      schema: {
        operationId: "updateUser",
        description: "Update a user by their ID",
        tags: ["users"],
        params: UserIdParams,
        body: UpdateUserBody,
        response: {
          200: User,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        const user = await prisma.user.update({
          where: { id: request.params.id },
          data: request.body,
        });
        return serializeUser(user);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("Record to update not found")
        ) {
          return reply.status(404).send({ error: "User not found" });
        }
        throw error;
      }
    },
  );

  // Delete user
  fastify.delete(
    "/users/:id",
    {
      schema: {
        operationId: "deleteUser",
        description: "Delete a user by their ID",
        tags: ["users"],
        params: UserIdParams,
        response: {
          204: Type.Null(),
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        await prisma.user.delete({
          where: { id: request.params.id },
        });
        return reply.status(204).send();
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("Record to delete does not exist")
        ) {
          return reply.status(404).send({ error: "User not found" });
        }
        throw error;
      }
    },
  );
}
