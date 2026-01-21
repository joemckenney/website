# Formatting

This project uses [Biome](https://biomejs.dev/) for code formatting. **Never use Prettier.**

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
| `biome format .` | Check formatting (read-only) |
| `biome format --write .` | Format all files |
| `biome check --write .` | Lint AND format (recommended) |

## Package Scripts

Standard format scripts:

```json
{
  "scripts": {
    "format": "biome format --write .",
    "lint": "biome check --write ."
  }
}
```

Note: `biome check --write` handles both linting AND formatting, so `lint` is usually sufficient.

## Formatting Rules

### Indentation

- **Style**: Tabs (not spaces)
- **Width**: 2 characters

### Quotes

- **JavaScript/TypeScript**: Double quotes (`"`)
- **JSON**: Double quotes

### Semicolons

- **Style**: Always required

### Trailing Commas

- **Style**: All (including function parameters)

### Line Width

- **Max**: 80 characters

## Example Formatted Code

```typescript
import { join } from "node:path";
import type { Config, Environment } from "./types";

export async function loadConfig(
	env: Environment,
	options: { verbose?: boolean },
): Promise<Config> {
	const configPath = join(process.cwd(), "config.json");

	if (options.verbose) {
		console.log(`Loading config from ${configPath}`);
	}

	return {
		environment: env,
		path: configPath,
	};
}
```

## Running Format Across Workspace

From the repository root:

```bash
# Check formatting
pnpm run format:check

# Fix formatting
pnpm run format
```

## Configuration

The root `biome.json` contains all formatting configuration. Key settings:

```json
{
  "formatter": {
    "enabled": true,
    "indentStyle": "tab",
    "indentWidth": 2,
    "lineWidth": 80
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "all"
    }
  }
}
```

## IDE Integration

Configure your editor to format on save with Biome:

### VS Code

Install `biomejs.biome` extension and add to settings:

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true
}
```

### Neovim

See the neovim skill for LSP configuration with Biome.

## Checking Before Commit

The `check` script validates both lint and format:

```bash
pnpm run check
```

This should be run before committing to ensure code quality.
