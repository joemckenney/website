# User Service

User management microservice with PostgreSQL database using Prisma ORM.

## Architecture

- **Framework**: Fastify with TypeBox schemas
- **Database**: PostgreSQL 16
- **ORM**: Prisma
- **Auth**: Trusts gateway via `X-User-Email` header (no JWT verification)
- **API Docs**: OpenAPI/Swagger auto-generated

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Deploy PostgreSQL (Local)

```bash
pnpm run deploy:postgres:local
```

This deploys PostgreSQL to your local K8s cluster with:
- Service name: `user-service-postgres`
- Database: `users`
- Username: `users`
- Password: `devpassword`

### 3. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` if needed (defaults should work for local development).

### 4. Run Migrations

```bash
pnpm run prisma:migrate:dev
```

This will:
- Create the initial migration
- Apply it to the database
- Generate Prisma Client

### 5. Start Development Server

```bash
pnpm run dev
```

Server runs on http://localhost:3002
API docs at http://localhost:3002/docs

## Database Management

### View Data with Prisma Studio

```bash
pnpm run prisma:studio
```

Opens a web UI at http://localhost:5555 to browse/edit database records.

### Create a Migration

After modifying `prisma/schema.prisma`:

```bash
pnpm run prisma:migrate:dev
```

### Generate Prisma Client

```bash
pnpm run prisma:generate
```

## API Endpoints

All endpoints require `X-User-Email` header (set by gateway).

- `GET /users/me` - Get current user
- `GET /users/:id` - Get user by ID
- `GET /users` - List all users
- `POST /users` - Create user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user
- `GET /health` - Health check (includes DB connectivity)

## Deployment

### Local (Minikube)

```bash
# 1. Deploy PostgreSQL
pnpm run deploy:postgres:local

# 2. Build Docker image
pnpm run build:docker:local

# 3. Deploy service
pnpm run deploy:helm:local
```

### Production

```bash
# 1. Deploy PostgreSQL
pnpm run deploy:postgres:prod

# 2. Build and push Docker image
export DOCKERHUB_USERNAME=your-username
export TAG=v1.0.0
pnpm run build:docker:prod

# 3. Deploy service with secrets
pnpm run deploy:helm:prod -- \
  --set secrets.databaseUrl="postgresql://users:PROD_PASSWORD@user-service-postgres:5432/users"
```

## SDK Generation

The @user/sdk package is auto-generated from the OpenAPI spec:

```bash
# 1. Start the service (generates dist/openapi.json)
pnpm run dev

# 2. In another terminal, generate SDK
cd ../sdk
pnpm run build
```

Usage in gateway:

```typescript
import { users } from '@user/sdk';

const user = await users.getCurrentUser({
  headers: { 'X-User-Email': 'joe@example.com' }
});
```

## Schema

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  metadata  Json     @default("{}")
}
```

## Directory Structure

```
@user/service/
├── src/
│   ├── db/
│   │   └── client.ts        # Prisma client singleton
│   ├── middleware/
│   │   └── context.ts       # Extract X-User-Email header
│   ├── routes/
│   │   └── users.ts         # User CRUD routes
│   ├── config.ts
│   ├── schemas.ts           # TypeBox schemas
│   └── index.ts             # Fastify server
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── migrations/          # Generated migrations
├── infrastructure/
│   └── postgres/helm/       # PostgreSQL deployment
└── helm/                    # Service K8s deployment
```

## Notes

- The init container in the Helm deployment runs `prisma migrate deploy` before the app starts
- The service has NO public ingress - only accessible within the cluster
- Database credentials are stored in Kubernetes Secrets
- Prisma Client is generated during Docker build
