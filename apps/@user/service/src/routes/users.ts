import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyPluginAsync } from "fastify";
import { Type } from "typebox";
import { prisma } from "../db/client.js";
import { extractUserContext } from "../middleware/context.js";
import {
  CreateUserSchema,
  ErrorResponse,
  UpdateUserSchema,
  UserSchema,
} from "../schemas.js";

export const registerUserRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>();

  // Get current user (from gateway header)
  app.get(
    "/users/me",
    {
      preHandler: extractUserContext,
      schema: {
        operationId: "getCurrentUser",
        description: "Get current authenticated user",
        tags: ["users"],
        response: {
          200: UserSchema,
          401: ErrorResponse,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { email: request.user!.email },
      });

      if (!user) {
        return reply.status(404).send({
          error: "User not found",
          message: `No user found with email ${request.user!.email}`,
        });
      }

      return user;
    },
  );

  // Get user by ID
  app.get(
    "/users/:id",
    {
      preHandler: extractUserContext,
      schema: {
        operationId: "getUserById",
        description: "Get user by ID",
        tags: ["users"],
        params: Type.Object({
          id: Type.String({ format: "uuid", description: "User ID" }),
        }),
        response: {
          200: UserSchema,
          401: ErrorResponse,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        return reply.status(404).send({
          error: "User not found",
        });
      }

      return user;
    },
  );

  // Create user
  app.post(
    "/users",
    {
      preHandler: extractUserContext,
      schema: {
        operationId: "createUser",
        description: "Create a new user",
        tags: ["users"],
        body: CreateUserSchema,
        response: {
          201: UserSchema,
          400: ErrorResponse,
          401: ErrorResponse,
          409: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { email, name, metadata } = request.body;

      try {
        const user = await prisma.user.create({
          data: {
            email,
            name,
            metadata: metadata || {},
          },
        });

        return reply.status(201).send(user);
      } catch (error: any) {
        if (error.code === "P2002") {
          // Unique constraint violation
          return reply.status(409).send({
            error: "User already exists",
            message: `User with email ${email} already exists`,
          });
        }
        throw error;
      }
    },
  );

  // Update user
  app.put(
    "/users/:id",
    {
      preHandler: extractUserContext,
      schema: {
        operationId: "updateUser",
        description: "Update user",
        tags: ["users"],
        params: Type.Object({
          id: Type.String({ format: "uuid", description: "User ID" }),
        }),
        body: UpdateUserSchema,
        response: {
          200: UserSchema,
          401: ErrorResponse,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { name, metadata } = request.body;

      try {
        const user = await prisma.user.update({
          where: { id },
          data: {
            name,
            metadata,
          },
        });

        return user;
      } catch (error: any) {
        if (error.code === "P2025") {
          // Record not found
          return reply.status(404).send({
            error: "User not found",
          });
        }
        throw error;
      }
    },
  );

  // Delete user
  app.delete(
    "/users/:id",
    {
      preHandler: extractUserContext,
      schema: {
        operationId: "deleteUser",
        description: "Delete user",
        tags: ["users"],
        params: Type.Object({
          id: Type.String({ format: "uuid", description: "User ID" }),
        }),
        response: {
          204: Type.Null(),
          401: ErrorResponse,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        await prisma.user.delete({
          where: { id },
        });

        return reply.status(204).send();
      } catch (error: any) {
        if (error.code === "P2025") {
          return reply.status(404).send({
            error: "User not found",
          });
        }
        throw error;
      }
    },
  );

  // List all users (could add pagination, filtering)
  app.get(
    "/users",
    {
      preHandler: extractUserContext,
      schema: {
        operationId: "listUsers",
        description: "List all users",
        tags: ["users"],
        response: {
          200: Type.Array(UserSchema),
          401: ErrorResponse,
        },
      },
    },
    async () => {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
      });

      return users;
    },
  );
};
