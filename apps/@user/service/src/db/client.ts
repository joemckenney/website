import { PrismaClient } from "@user/orm";

const basePrisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
});

// Extend Prisma to serialize Date fields to ISO strings
// This makes the runtime types match the OpenAPI/TypeBox schema (string format: date-time)
const extendedPrisma = basePrisma.$extends({
  result: {
    user: {
      createdAt: {
        needs: { createdAt: true },
        compute(user: { createdAt: Date }) {
          return user.createdAt.toISOString();
        },
      },
      updatedAt: {
        needs: { updatedAt: true },
        compute(user: { updatedAt: Date }) {
          return user.updatedAt.toISOString();
        },
      },
    },
  },
});

// Cache the extended client in development to avoid too many connections
const globalForPrisma = globalThis as unknown as {
  prisma: typeof extendedPrisma | undefined;
};

export const prisma = globalForPrisma.prisma ?? extendedPrisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
