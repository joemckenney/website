import path from "node:path";
import { defineConfig } from "prisma/config";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://agent:devpassword@localhost:5433/agent";

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    url: connectionString,
  },
  migrate: {
    adapter: async () => {
      const { PrismaPg } = await import("@prisma/adapter-pg");
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString });
      return new PrismaPg(pool);
    },
  },
});
