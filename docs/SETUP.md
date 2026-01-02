# ScribeCat v3 Setup Guide

## Prerequisites

- Node.js 18+ and pnpm
- Convex account (https://convex.dev)
- AssemblyAI account (https://www.assemblyai.com)

## Initial Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set up Convex

```bash
# Login to Convex
npx convex login

# Initialize Convex project
npx convex dev
```

This will create a `.env.local` file with your `VITE_CONVEX_URL`.

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Copy from example
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# From Convex dashboard
VITE_CONVEX_URL=https://your-project.convex.cloud

# From AssemblyAI dashboard (https://www.assemblyai.com/app/account)
ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here

NODE_ENV=development
```

### 4. Deploy Convex Schema

The schema and functions will be automatically deployed when you run `npx convex dev`.

## Running the App

### Development Mode

You need **two terminal windows**:

**Terminal 1 - Convex Backend:**
```bash
pnpm convex:dev
```

**Terminal 2 - Electron App:**
```bash
pnpm dev
```

The app will open automatically with hot-reload enabled.

## Project Structure

```
ScribeCat-v3/
├── convex/              # Backend (Convex)
│   ├── auth.ts         # Authentication config
│   ├── schema.ts       # Database schema
│   ├── sessions.ts     # Session CRUD operations
│   └── crons.ts        # Scheduled jobs
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.ts     # App initialization
│   │   └── ipc/        # IPC handlers
│   ├── preload/        # Electron preload scripts
│   └── renderer/       # React app
│       ├── components/ # UI components
│       ├── hooks/      # Custom React hooks
│       └── types/      # TypeScript definitions
└── docs/
    └── PHASES.md       # Implementation roadmap
```

## Phase 1 Features (Completed)

✅ **Audio Recording**
- Microphone device selection
- Start/stop/pause/resume controls
- Real-time waveform visualization
- Recording timer

✅ **Live Transcription**
- AssemblyAI real-time integration
- Partial and final transcript segments
- Automatic timestamp tracking

✅ **Session Management**
- Create and save recording sessions
- Auto-save during recording
- List all sessions
- Soft delete (trash system)
- 30-day auto-cleanup

✅ **Playback**
- Audio playback controls
- Waveform visualization during playback
- Sync with transcript segments
- Click-to-seek in transcript

✅ **Infrastructure**
- Convex backend with auth
- Electron IPC for file operations
- Theme system support
- Resizable panels

## Development Tips

### Debugging

- **Electron DevTools**: Automatically open in development mode
- **Convex Logs**: Check the Convex dashboard for backend logs
- **Audio Issues**: Check browser console for Web Audio API errors

### Common Issues

**"AssemblyAI API key not configured"**
- Make sure `.env` file exists and has `ASSEMBLYAI_API_KEY`
- Restart the Electron app after adding the key

**"Convex connection failed"**
- Ensure `pnpm convex:dev` is running
- Check that `VITE_CONVEX_URL` is set correctly

**"No audio devices found"**
- Grant microphone permissions when prompted
- Check system audio settings

## Building for Production

```bash
# Build the app
pnpm build

# Package for distribution
pnpm package
```

Distributable files will be in the `release/` directory.

## Next Steps (Phase 2)

See [PHASES.md](docs/PHASES.md) for the complete roadmap. Next up:
- TipTap rich text editor for notes
- AI note generation
- Excalidraw diagrams
- Drag/resize objects

## Support

- Documentation: [docs/PHASES.md](docs/PHASES.md)
- Issues: File on GitHub
- Convex Docs: https://docs.convex.dev
- AssemblyAI Docs: https://www.assemblyai.com/docs
