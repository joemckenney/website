import path from "node:path";
import { defineConfig } from "prisma/config";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://weather:devpassword@localhost:5435/weather";

export default defineConfig({
  earlyAccess: true,
  schema: path.join(import.meta.dirname, "prisma", "schema.prisma"),
  datasource: {
    url: connectionString,
  },
  migrate: {
    async adapter() {
      const { PrismaPg } = await import("@prisma/adapter-pg");
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString });
      return new PrismaPg(pool);
    },
  },
});
