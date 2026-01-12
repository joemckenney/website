import { createPrismaClient } from "@agent/db";

// Create singleton Prisma client for this service
export const prisma = createPrismaClient();
