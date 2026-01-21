# Prisma ORM - Project Configuration

This project uses **Prisma 7.x** which has significant breaking changes from earlier versions.

## Key Differences in Prisma 7.x

### 1. No `url` in schema.prisma

The `datasource` block in `schema.prisma` must NOT contain a `url` property:

```prisma
// CORRECT for Prisma 7.x
datasource db {
  provider = "postgresql"
}

// WRONG - will cause error P1012
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")  // NOT SUPPORTED
}
```

### 2. Connection via prisma.config.ts

Database connections are configured in `prisma.config.ts`:

```typescript
import path from "node:path";
import { defineConfig } from "prisma/config";

const connectionString = process.env.DATABASE_URL || "postgresql://...";

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    url: connectionString,  // URL goes here, not in schema.prisma
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
```

### 3. PrismaClient Requires Adapter

The client must be instantiated with an adapter:

```typescript
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "./generated/prisma/client.js";

export function createPrismaClient(connectionString?: string): PrismaClient {
  const pool = new Pool({
    connectionString: connectionString || process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}
```

### 4. Generator Uses "prisma-client"

```prisma
generator client {
  provider = "prisma-client"  // NOT "prisma-client-js"
  output   = "../src/generated/prisma"
}
```

## Database Packages in This Repo

| Package | Database | Dev Port | Prod Service |
|---------|----------|----------|--------------|
| `@users/db` | users | 5432 | user-postgres-postgresql |
| `@agent/db` | agent | 5433 | agent-postgres-postgresql |

## Common Commands

```bash
# Generate client
pnpm --filter @users/db run generate

# Run migrations (dev)
pnpm --filter @users/db run migrate:dev

# Deploy migrations (prod)
pnpm --filter @users/db run migrate:deploy

# Open Prisma Studio (local)
pnpm --filter @users/db run studio

# Open Prisma Studio (production)
pnpm --filter @users/db run studio:prod
```

## Migration Docker Images

For Kubernetes migration jobs, the Dockerfile must include:
- `prisma.config.ts` (for connection config)
- `prisma/` directory (schema + migrations)
- Required dependencies (`@prisma/adapter-pg`, `pg`)

The migration job runs: `npx prisma migrate deploy`

## Dependencies Required

```json
{
  "dependencies": {
    "@prisma/adapter-pg": "^7.2.0",
    "@prisma/client": "^7.2.0",
    "pg": "^8.14.1"
  },
  "devDependencies": {
    "prisma": "^7.2.0"
  }
}
```

## TypeScript Configuration

The generated Prisma client must be **excluded** from TypeScript compilation. The `tsconfig.json` should include:

```json
{
  "include": ["src"],
  "exclude": ["src/generated"]
}
```

This is required because:
1. The generated client has its own type definitions
2. `tsgo` (native TypeScript) reports portability errors on the generated code
3. The generated code doesn't need to be re-compiled

## Common Errors

### P1012: url property not supported
**Cause**: `url = env("DATABASE_URL")` in schema.prisma
**Fix**: Remove `url` from schema.prisma, use prisma.config.ts instead

### Migration fails in Docker
**Cause**: Missing prisma.config.ts or dependencies
**Fix**: Ensure Dockerfile copies prisma.config.ts and installs pg adapter

### TS2742: The inferred type cannot be named without a reference
**Cause**: `tsgo` is type-checking the generated Prisma client
**Fix**: Add `"exclude": ["src/generated"]` to tsconfig.json
