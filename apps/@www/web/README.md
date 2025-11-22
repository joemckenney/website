# Weather Sonification

Experience your local weather as an AI-generated ambient soundscape.

## Features

- **Real-time Weather Data**: Fetches current weather using Open-Meteo API
- **AI-Powered Audio Generation**: Uses Chrome's built-in AI (Gemini Nano) to interpret weather into unique soundscapes
- **Web Audio Synthesis**: Renders ambient sound using oscillators, filters, and effects
- **Fallback Mode**: Works without AI using rule-based audio generation
- **Privacy-First**: All processing happens on-device, no data sent to external servers

## Chrome AI (Prompt API) Setup

This app uses Chrome's experimental Prompt API to generate creative audio parameters from weather data.

### Requirements

- **Chrome Version**: 138 or higher (Dev/Canary recommended)
- **Platform**: Windows 10+, macOS 13+, Linux, or ChromeOS
- **Storage**: 22 GB free space minimum
- **Hardware**:
  - GPU with 4+ GB VRAM, or
  - CPU with 16+ GB RAM and 4+ cores

### Enable Chrome AI

1. Open Chrome Dev/Canary
2. Navigate to `chrome://flags/#optimization-guide-on-device-model`
3. Set to "Enabled BypassPerfRequirement"
4. Navigate to `chrome://flags/#prompt-api-for-gemini-nano`
5. Set to "Enabled"
6. Restart Chrome
7. The AI model will download automatically on first use (may take several minutes)

### Check Status

Open DevTools Console and run:
```javascript
await window.LanguageModel.availability()
// Returns: 'available', 'downloading', or 'unavailable'
```

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build
```

## How It Works

1. **Geolocation**: Gets user's coordinates via browser API
2. **Weather Fetch**: Retrieves current conditions from Open-Meteo
3. **AI Generation**: Sends weather data to Chrome AI with a prompt requesting Web Audio parameters
4. **Audio Synthesis**: Creates oscillators, filters, and effects based on AI response
5. **Playback**: Renders the unique ambient soundscape

## Architecture

- **React + TypeScript**: UI and state management
- **Vite**: Build tool and dev server
- **Vanilla Extract**: Type-safe CSS-in-JS
- **Web Audio API**: Sound synthesis
- **Chrome Prompt API**: On-device AI inference
- **DIN 1451 Font**: Newspaper-inspired typography

## Browser Compatibility

- Chrome 138+ with AI features enabled (full experience)
- Any modern browser (fallback mode, no AI)

## License

See repository root for license information.
