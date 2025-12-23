# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo exploring modern full-stack development with TypeScript and type-safe API generation. The main application (`@www/app`) is an experimental weather sonification web app that uses Chrome's built-in AI (Gemini Nano) to generate evolving ambient soundscapes based on real-time weather data.

## Repository Structure

```
apps/
  @www/app/          - Main web app: Weather sonification with Chrome AI
  @api/
    app/             - Fastify API with OpenAPI/TypeBox
    sdk/             - Auto-generated TypeScript client from OpenAPI spec
  @app/
    app/             - React + Vite frontend demo

packages/
  @website/
    config/          - Shared configuration (TypeScript + Biome)
    utils/           - TypeScript utility library
```

The `@www/app` is the primary application. The `@api` workspace contains the API server and SDK. The `@app/app` is a demo client that demonstrates the type-safe full-stack pattern (server → OpenAPI spec → SDK generation → client).

## Build System

**Package Manager**: pnpm (workspace-based monorepo)
**Build Orchestration**: Turbo (with caching and dependency graphs)
**Formatter**: Biome

### Common Commands

```bash
# Install dependencies
pnpm install

# Build all packages (respects dependency order via Turbo)
pnpm run build

# Format all code
pnpm run format

# Run all dev servers with hot reload (recommended)
pnpm run dev

# Build specific workspace (from repo root)
pnpm --filter @www/web build
pnpm --filter @api/service build

# Run dev server for a specific app
cd apps/@www/web
pnpm run dev
```

### Development Workflow

The `pnpm run dev` command starts all development servers with automatic rebuilding:

- **API Service** (`@api/service`): Runs `tsx watch` - auto-restarts on code changes and regenerates OpenAPI spec
- **SDK** (`@api/sdk`): Marked as `interruptible` in Turbo - automatically rebuilds when API's OpenAPI spec changes
- **Web App** (`@www/web`): Runs Vite dev server with HMR - hot reloads when SDK or app code changes

Turbo orchestrates these in dependency order and handles restarts automatically. Just run `pnpm run dev` from the repo root and edit any file - changes will propagate through the stack.

## Main Application: Weather Sonification

**Location**: `apps/@www/app/`

### Architecture

The app demonstrates several advanced web platform features:

1. **Chrome Built-in AI Integration** (Gemini Nano via Prompt API)
   - Uses Chrome's experimental `window.LanguageModel` API
   - Generates creative audio parameters from weather data
   - Supports persistent AI sessions for continuous evolution
   - Falls back to rule-based generation when AI unavailable

2. **Web Audio API Synthesis**
   - Multi-oscillator additive synthesis for rich drones
   - Real-time frequency visualization with AnalyserNode
   - Smooth crossfading between parameter sets (8s transitions)
   - Layered oscillators with LFO modulation for organic movement

3. **Geolocation + Weather Data**
   - Uses browser Geolocation API
   - Fetches weather from Open-Meteo API
   - Translates weather metrics into audio parameters

4. **Evolution Engine**
   - Continuous AI-driven soundscape evolution
   - Maintains persistent AI session (avoids re-initialization overhead)
   - Configurable evolution interval and crossfade duration
   - Smooth parameter interpolation

### Key Files

- `src/app.tsx` - Main application orchestration, command handling, state management
- `src/lib/audio-synthesizer.ts` - Web Audio synthesis engine with crossfading
- `src/lib/audio-evolution-engine.ts` - Continuous evolution loop using AI sessions
- `src/lib/gemini.ts` - Chrome AI API integration (Prompt API, session management)
- `src/lib/weather.ts` - Weather data fetching (Open-Meteo API)
- `src/lib/geolocation.ts` - Browser geolocation wrapper
- `src/components/terminal.tsx` - Command-line interface component
- `src/components/frequency-visualizer.tsx` - Real-time audio visualization

### Running the Main App

```bash
cd apps/@www/app
pnpm run dev  # Starts Vite dev server on http://localhost:5173
```

**Browser Requirements**:
- Chrome Dev/Canary (version 127+)
- Experimental flags enabled:
  - `chrome://flags/#prompt-api-for-gemini-nano` → Enabled
  - `chrome://flags/#optimization-guide-on-device-model` → Enabled BypassPerfRequirement
- First run triggers Gemini Nano model download (~1.7GB)

### Terminal Commands

Once the app is running, available commands in the terminal:

- `start` - Begin weather sonification (fetches location/weather, generates soundscape)
- `evolve` - Enable continuous AI-driven evolution (use after `start`)
- `stop` - Stop audio playback and evolution
- `setup` - Show Chrome AI setup instructions
- `debug` - Display system status (browser, audio, AI, geolocation)
- `clear` - Clear terminal
- `help` - Show command list

## Demo: Type-Safe Full-Stack

**Location**: `apps/@api/` and `apps/@app/`

This demonstrates the type-safe API development pattern:

1. **Server** (`@api/service`) defines API with TypeBox schemas
2. **OpenAPI spec** auto-generated to `dist/openapi.json` on server start
3. **SDK** (`@api/sdk`) reads spec and generates typed client with `@hey-api/openapi-ts`
4. **Client** (`@app/web`) imports SDK and gets full type safety

### Running the Demo

The easiest way is to use the unified dev command:

```bash
# From repo root - starts everything with automatic rebuilds
pnpm run dev
```

This starts:
- API server on http://localhost:3000 (docs at /docs)
- SDK watcher (rebuilds when OpenAPI spec changes)
- Client dev server

**Alternative - Manual approach**:

```bash
# Terminal 1: Start server (generates OpenAPI spec)
cd apps/@api/service
pnpm run dev  # Runs on http://localhost:3000, docs at /docs

# Terminal 2: Generate SDK (after server starts once)
cd apps/@api/sdk
pnpm run build  # Generates typed client from ../service/dist/openapi.json

# Terminal 3: Start client
cd apps/@app/web
pnpm run dev  # Vite dev server
```

## Styling

**Framework**: Vanilla Extract (type-safe CSS-in-JS)

Styles are defined in `.css.ts` files:
- Type-safe styling with autocomplete
- CSS variables defined in `tokens.css.ts`
- Scoped class names prevent collisions

Example: `apps/@www/app/src/app.css.ts` defines styles imported as JS objects.

## Configuration

Shared configs in `packages/@website/config/`:
- **TypeScript**: Base configurations extended by all packages
- **Biome**: Linting and formatting rules extended by all packages
- Ensures consistent settings across workspace
- Each package has its own `biome.json` extending from `@website/config`

## Development Notes

### Monorepo Dependencies

Workspace dependencies use `workspace:*` protocol:
```json
{
  "dependencies": {
    "@website/config": "workspace:*"
  }
}
```

Turbo automatically builds dependencies before dependents.

### Chrome AI Development

When working with Chrome AI features:
- Test in Chrome Dev/Canary with flags enabled
- Handle `downloading` state gracefully (model not yet available)
- Always provide fallback logic when AI unavailable
- Use persistent sessions for repeated prompts (evolution engine pattern)
- Clean up sessions with `session.destroy()` when done

### Audio Synthesis Development

When modifying audio features:
- AudioContext requires user gesture to start (handled by terminal commands)
- Use `cancelScheduledValues()` before scheduling new parameter changes
- Crossfading requires careful gain envelope management
- Test with headphones (low-frequency drones may not be audible on laptop speakers)
- AnalyserNode provides real-time frequency data for visualization

### Adding New Terminal Commands

Edit `apps/@www/app/src/app.tsx`, function `handleCommand()`. Follow the pattern of existing commands (add to help text, implement handler function, call from command dispatcher).
