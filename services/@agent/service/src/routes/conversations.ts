import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import { prisma, serializeConversation, serializeMessage } from "../db/client.js";
import { authMiddleware, getUser } from "../lib/auth.js";
import {
  Conversation,
  ConversationIdParams,
  ConversationList,
  ConversationWithMessages,
  CreateConversationBody,
  ErrorResponse,
  ListConversationsQuery,
  UpdateConversationBody,
} from "../schemas.js";

export async function registerConversationRoutes(
  app: FastifyInstance & { withTypeProvider: () => FastifyInstance }
) {
  const fastify = app.withTypeProvider<TypeBoxTypeProvider>();

  // Create conversation
  fastify.post(
    "/conversations",
    {
      preHandler: authMiddleware,
      schema: {
        operationId: "createConversation",
        description: "Create a new conversation",
        tags: ["conversations"],
        body: CreateConversationBody,
        response: {
          201: Conversation,
          401: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const user = getUser(request);
      const { title } = request.body;

      const conversation = await prisma.conversation.create({
        data: {
          userId: user.id,
          title: title ?? null,
        },
      });

      return reply.status(201).send(serializeConversation(conversation));
    }
  );

  // List conversations
  fastify.get(
    "/conversations",
    {
      preHandler: authMiddleware,
      schema: {
        operationId: "listConversations",
        description: "List conversations for the authenticated user",
        tags: ["conversations"],
        querystring: ListConversationsQuery,
        response: {
          200: ConversationList,
          401: ErrorResponse,
        },
      },
    },
    async (request) => {
      const user = getUser(request);
      const { limit = 50, offset = 0 } = request.query;

      const [conversations, total] = await Promise.all([
        prisma.conversation.findMany({
          where: { userId: user.id },
          orderBy: { updatedAt: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.conversation.count({ where: { userId: user.id } }),
      ]);

      return {
        conversations: conversations.map(serializeConversation),
        total,
      };
    }
  );

  // Get conversation with messages
  fastify.get(
    "/conversations/:id",
    {
      preHandler: authMiddleware,
      schema: {
        operationId: "getConversation",
        description: "Get a conversation with its messages",
        tags: ["conversations"],
        params: ConversationIdParams,
        response: {
          200: ConversationWithMessages,
          401: ErrorResponse,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const user = getUser(request);
      const { id } = request.params;

      const conversation = await prisma.conversation.findFirst({
        where: { id, userId: user.id },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!conversation) {
        return reply.status(404).send({ error: "Conversation not found" });
      }

      return {
        ...serializeConversation(conversation),
        messages: conversation.messages.map(serializeMessage),
      };
    }
  );

  // Update conversation
  fastify.patch(
    "/conversations/:id",
    {
      preHandler: authMiddleware,
      schema: {
        operationId: "updateConversation",
        description: "Update a conversation",
        tags: ["conversations"],
        params: ConversationIdParams,
        body: UpdateConversationBody,
        response: {
          200: Conversation,
          401: ErrorResponse,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const user = getUser(request);
      const { id } = request.params;
      const { title } = request.body;

      // Verify ownership
      const existing = await prisma.conversation.findFirst({
        where: { id, userId: user.id },
      });

      if (!existing) {
        return reply.status(404).send({ error: "Conversation not found" });
      }

      const conversation = await prisma.conversation.update({
        where: { id },
        data: { title },
      });

      return serializeConversation(conversation);
    }
  );

  // Delete conversation
  fastify.delete(
    "/conversations/:id",
    {
      preHandler: authMiddleware,
      schema: {
        operationId: "deleteConversation",
        description: "Delete a conversation",
        tags: ["conversations"],
        params: ConversationIdParams,
        response: {
          204: Type.Null(),
          401: ErrorResponse,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const user = getUser(request);
      const { id } = request.params;

      // Verify ownership
      const existing = await prisma.conversation.findFirst({
        where: { id, userId: user.id },
      });

      if (!existing) {
        return reply.status(404).send({ error: "Conversation not found" });
      }

      await prisma.conversation.delete({ where: { id } });
      return reply.status(204).send();
    }
  );
}
