# TypeScript

This project uses the native TypeScript compiler (`tsgo`) via the `@typescript/native-preview` package. **Never use the standard `typescript` package or `tsc` command.**

## Setup

Every package that needs TypeScript must have this in `devDependencies`:

```json
{
  "devDependencies": {
    "@typescript/native-preview": "catalog:"
  }
}
```

The version is managed in `pnpm-workspace.yaml`:

```yaml
catalog:
  '@typescript/native-preview': 7.0.0-dev.20251017.1
```

## Commands

Use `tsgo` instead of `tsc`:

| Standard TypeScript | Native TypeScript |
|---------------------|-------------------|
| `tsc` | `tsgo` |
| `tsc --watch` | `tsgo --watch` |
| `tsc --noEmit` | `tsgo --noEmit` |

## Package Scripts

Correct script configuration:

```json
{
  "scripts": {
    "build": "tsgo",
    "dev": "tsgo --watch",
    "typecheck": "tsgo --noEmit"
  }
}
```

For packages that need to run other commands before TypeScript (like Prisma):

```json
{
  "scripts": {
    "build": "prisma generate && tsgo"
  }
}
```

## Common Mistakes

### Wrong: Using standard typescript

```json
{
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
```

### Wrong: Using tsc in scripts

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  }
}
```

### Wrong: Having both packages

```json
{
  "devDependencies": {
    "@typescript/native-preview": "catalog:",
    "typescript": "^5.9.3"
  }
}
```

## tsconfig.json

Standard configuration for this repo:

```json
{
  "extends": "@website/config/node.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

For Bun-based packages (like `@infra/db`):

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun"],
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["bin/**/*", "src/**/*"]
}
```

## Type Checking Only (No Emit)

For packages that don't emit JavaScript (like CLI tools run directly by Bun):

```json
{
  "scripts": {
    "check": "biome check . && tsgo --noEmit",
    "typecheck": "tsgo --noEmit"
  }
}
```
