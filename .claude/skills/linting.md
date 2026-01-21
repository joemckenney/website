# Linting

This project uses [Biome](https://biomejs.dev/) for linting. **Never use ESLint.**

## Setup

Every package must have Biome in `devDependencies`:

```json
{
  "devDependencies": {
    "@biomejs/biome": "catalog:"
  }
}
```

The version is managed in `pnpm-workspace.yaml`:

```yaml
catalog:
  '@biomejs/biome': 2.2.6
```

## Commands

| Command | Description |
|---------|-------------|
| `biome check .` | Check for lint errors (read-only) |
| `biome check --write .` | Check and auto-fix lint errors |
| `biome check --write --unsafe .` | Auto-fix including "unsafe" fixes |

## Package Scripts

Standard lint scripts:

```json
{
  "scripts": {
    "check": "biome check .",
    "lint": "biome check --write ."
  }
}
```

For packages with type checking:

```json
{
  "scripts": {
    "check": "biome check . && tsgo --noEmit"
  }
}
```

## Configuration

Biome configuration is in the root `biome.json`. Packages inherit from the root config automatically.

## Common Lint Rules

### Node.js Import Protocol

Always use `node:` prefix for Node.js built-in modules:

```typescript
// Wrong
import { join } from "path";
import { readFile } from "fs";

// Correct
import { join } from "node:path";
import { readFile } from "node:fs";
```

### No Unused Imports

Remove any unused imports:

```typescript
// Wrong - will fail lint
import { foo, bar } from "./utils";
console.log(foo);  // bar is unused

// Correct
import { foo } from "./utils";
console.log(foo);
```

### Template Literals

Prefer template literals over string concatenation:

```typescript
// Wrong
const msg = "Hello " + name + "!";

// Correct
const msg = `Hello ${name}!`;
```

### No Implicit Any

Variables must have explicit types or initialization:

```typescript
// Wrong
let config;

// Correct
let config: Config;
// or
let config = loadConfig();
```

## Running Lint Across Workspace

From the repository root:

```bash
# Check all packages
pnpm run check

# Fix all packages
pnpm run lint
```

## IDE Integration

Biome has extensions for:
- VS Code: `biomejs.biome`
- Neovim: via LSP (see neovim skill)

Configure your editor to run Biome on save for the best experience.
