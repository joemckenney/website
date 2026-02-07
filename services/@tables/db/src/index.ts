import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "./generated/prisma/client.js";

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
      "postgresql://tables:devpassword@localhost:5434/tables",
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}
