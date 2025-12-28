import { createPrismaClient } from "@user/orm";

// Create a single PrismaClient instance with the pg adapter
export const prisma = createPrismaClient();

// Serialize dates to ISO strings for API responses
export function serializeUser(user: {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  provider: string;
  providerId: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: unknown;
}) {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
