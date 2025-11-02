# Clandestine

A monorepo prototype exploring modern full-stack development with TypeScript, Rust WASM, and type-safe API generation.

## Structure

This is a pnpm monorepo with the following workspace organization:

```
apps/
  @www/
    client/     - React + Vite frontend with Vanilla Extract
    server/     - Fastify API with OpenAPI/TypeBox
    sdk/        - Auto-generated TypeScript client from OpenAPI spec

packages/
  @clandestine/
    squared/    - Rust WASM module for mathematical operations
    topoftree/  - Go CLI tool for finding git repository root
    tsconfig/   - Shared TypeScript configurations
    utils/      - TypeScript utility library
```

## Key Technologies

### Frontend
- **Vite** - Fast build tool and dev server
- **React** - UI framework
- **Vanilla Extract** - Type-safe CSS-in-JS
- **TypeScript** - Type safety throughout

### Backend
- **Fastify** - High-performance Node.js web framework
- **TypeBox** - Runtime type validation and schema generation
- **OpenAPI** - API documentation and type-safe client generation

### SDK Generation
- **@hey-api/openapi-ts** - Generates fully typed TypeScript client from OpenAPI spec
- Automatic sync between server schema and client types

### Build Tools
- **Turbo** - Monorepo build orchestration with caching
- **pnpm** - Fast, space-efficient package manager
- **Biome** - Fast formatter

### WebAssembly
- **Rust + wasm-pack** - Compile Rust to WebAssembly for browser/Node.js
- Type-safe bindings with wasm-bindgen

### Other
- **Go** - CLI tools with binary distribution via npm packages

## Prototyping Highlights

### Type-Safe Full Stack
The entire stack is type-safe from database schema to frontend:
1. Server defines schemas with TypeBox
2. OpenAPI spec generated automatically
3. TypeScript client auto-generated from spec
4. Frontend uses typed client - changes to API schema automatically flow to frontend

### WASM Integration
Rust code compiled to WebAssembly and distributed as npm package:
- Write performance-critical code in Rust
- Use in Node.js (server) or browser (client)
- Full TypeScript type definitions

### Monorepo Patterns
- Workspace dependencies with `workspace:*`
- Shared TypeScript configurations
- Centralized build orchestration with Turbo
- Mixed language support (TypeScript, Rust, Go)

## Example Flow

1. **Define API** in server with TypeBox schemas
2. **Start server** - generates `dist/openapi.json`
3. **Generate SDK** - `@www/sdk` reads OpenAPI spec and generates typed client
4. **Use in client** - Import and use with full type safety

```typescript
import { client, postSquared } from '@www/sdk';

client.setConfig({ baseUrl: 'http://localhost:3000' });
const result = await postSquared({ body: { number: 5 } });
// result is fully typed!
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Start server (generates OpenAPI spec)
cd apps/@www/server
pnpm run dev

# Generate SDK (in another terminal)
cd apps/@www/sdk
pnpm run build

# Start client
cd apps/@www/client
pnpm run dev
```

## What This Demonstrates

- **Monorepo organization** with mixed languages and frameworks
- **Type-safe API development** with automatic client generation
- **WebAssembly integration** in a JavaScript ecosystem
- **Build optimization** with Turbo caching
- **Developer experience** with fast iteration and type safety
