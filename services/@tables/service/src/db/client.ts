import { createPrismaClient } from "@tables/db";

// Create a single PrismaClient instance with the pg adapter
export const prisma = createPrismaClient();
