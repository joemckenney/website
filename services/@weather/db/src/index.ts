import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "./generated/prisma/client.js";

export { PrismaClient };
export type * from "./generated/prisma/client.js";

export function createPrismaClient(connectionString?: string): PrismaClient {
  const pool = new Pool({
    connectionString:
      connectionString ||
      process.env.DATABASE_URL ||
      "postgresql://weather:devpassword@localhost:5435/weather",
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}
