import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";
import { Pool } from "pg";

export { PrismaClient };
export type * from "./generated/prisma/client.js";

/**
 * Create a PrismaClient instance with the pg adapter.
 * This is required for Prisma v7 which no longer uses the `url` datasource property.
 */
export function createPrismaClient(connectionString?: string): PrismaClient {
  const pool = new Pool({
    connectionString:
      connectionString ||
      process.env.DATABASE_URL ||
      "postgresql://users:devpassword@localhost:5432/users",
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}
