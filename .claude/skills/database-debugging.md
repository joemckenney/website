# Database Debugging

This project has a `db` CLI tool (`@infra/db`) for accessing databases across environments.

## Databases

| Package | Database | User | Dev Port | Minikube Port | Prod Port |
|---------|----------|------|----------|---------------|-----------|
| `@users/db` | users | users | 5432 | 5440 | 5440 |
| `@agent/db` | agent | agent | 5433 | 5441 | 5441 |

## CLI Commands

Run from a db package directory (e.g., `services/@users/db`):

```bash
# Open Prisma Studio (visual database browser)
pnpm exec db studio            # local docker (default)
pnpm exec db studio --minikube # local kubernetes
pnpm exec db studio --prod     # production

# Open psql shell (SQL queries)
pnpm exec db shell
pnpm exec db shell --prod

# View postgres logs
pnpm exec db logs -f           # follow local logs
pnpm exec db logs --prod -f    # follow prod logs
pnpm exec db logs --tail 50    # last 50 lines

# Create database dump
pnpm exec db dump              # dumps to ./dumps/
pnpm exec db dump --prod       # dump production
pnpm exec db dump --schema-only
pnpm exec db dump --data-only
pnpm exec db dump -o backup.sql
```

## Environments

| Flag | Connects To | Requires |
|------|-------------|----------|
| `--dev` (default) | Docker Compose on localhost | `docker compose up` |
| `--minikube` | Minikube via port-forward | minikube running |
| `--prod` | Vultr VKE via port-forward | `~/.kube/vultr-prod-config` |

Production access requires typing "yes" to confirm.

## Configuration

Each db package has a `db.config.json`:

```json
{
  "database": "users",
  "user": "users",
  "environments": {
    "dev": { "host": "localhost", "port": 5432 },
    "minikube": { "service": "user-postgres-postgresql", "localPort": 5440 },
    "prod": { "service": "user-postgres-postgresql", "localPort": 5440, "kubeconfig": "~/.kube/vultr-prod-config" }
  }
}
```

## Common Debugging Tasks

### Check if data exists in production
```bash
cd services/@users/db
pnpm exec db shell --prod
# Then: SELECT * FROM "User" LIMIT 10;
```

### Compare local vs production data
```bash
# Terminal 1: local
pnpm exec db studio

# Terminal 2: production
pnpm exec db studio --prod
```

### Backup before risky operation
```bash
pnpm exec db dump --prod -o before-migration.sql
```

### View recent postgres activity
```bash
pnpm exec db logs --prod --tail 100
```

## Troubleshooting

### "Could not find db.config.json"
Run the command from inside a db package directory:
```bash
cd services/@users/db
pnpm exec db studio
```

### Port-forward fails
- Check kubectl context: `kubectl config current-context`
- For prod: ensure `~/.kube/vultr-prod-config` exists
- For minikube: ensure `minikube status` shows running

### psql not found
Install PostgreSQL client:
```bash
# Ubuntu/Debian
sudo apt install postgresql-client

# macOS
brew install libpq && brew link --force libpq
```
