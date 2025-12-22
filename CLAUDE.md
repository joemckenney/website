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
    topoftree/       - Go CLI tool (finds git repository root)
    tsconfig/        - Shared TypeScript configurations
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

# Build specific workspace (from repo root)
pnpm --filter @www/app build
pnpm --filter @api/app build

# Run dev server for main app
cd apps/@www/app
pnpm run dev

# Build Go CLI tool
cd packages/@website/topoftree
pnpm run build  # Runs: go build -o dist/topoftree ./cmd/topoftree
```

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

1. **Server** (`@api/app`) defines API with TypeBox schemas
2. **OpenAPI spec** auto-generated to `dist/openapi.json` on server start
3. **SDK** (`@api/sdk`) reads spec and generates typed client with `@hey-api/openapi-ts`
4. **Client** (`@app/app`) imports SDK and gets full type safety

### Running the Demo

```bash
# Terminal 1: Start server (generates OpenAPI spec)
cd apps/@api/app
pnpm run dev  # Runs on http://localhost:3000, docs at /docs

# Terminal 2: Generate SDK (after server starts once)
cd apps/@api/sdk
pnpm run build  # Generates typed client from ../app/dist/openapi.json

# Terminal 3: Start client
cd apps/@app/app
pnpm run dev  # Vite dev server
```

**Important**: The server must start at least once to generate `dist/openapi.json` before SDK can build.

## Styling

**Framework**: Vanilla Extract (type-safe CSS-in-JS)

Styles are defined in `.css.ts` files:
- Type-safe styling with autocomplete
- CSS variables defined in `tokens.css.ts`
- Scoped class names prevent collisions

Example: `apps/@www/app/src/app.css.ts` defines styles imported as JS objects.

## TypeScript Configuration

Shared configs in `packages/@website/tsconfig/`:
- Base configuration extended by all packages
- Ensures consistent TypeScript settings across workspace

## Development Notes

### Monorepo Dependencies

Workspace dependencies use `workspace:*` protocol:
```json
{
  "dependencies": {
    "@website/utils": "workspace:*"
  }
}
```

Turbo automatically builds dependencies before dependents.

### Go Requirements

Building `@website/topoftree` requires Go toolchain.

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
