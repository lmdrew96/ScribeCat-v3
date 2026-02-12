# ScribeCat v3 🐱

**ADHD-friendly lecture companion** — Record, transcribe, and study smarter

> An Electron-based desktop app for recording lectures with real-time transcription, AI-powered note-taking, and gamified study tools.

[![Built with Electron](https://img.shields.io/badge/Electron-39-blue?style=for-the-badge&logo=electron)](https://www.electronjs.org/)
[![Powered by Convex](https://img.shields.io/badge/Convex-Backend-orange?style=for-the-badge)](https://convex.dev)
[![AssemblyAI](https://img.shields.io/badge/AssemblyAI-Transcription-green?style=for-the-badge)](https://www.assemblyai.com/)

---

## 🎯 Current Phase: 1 — Capture ✅

**Status:** Complete

### ✨ Features

- ✅ Audio recording with device selection
- ✅ Real-time transcription (AssemblyAI)
- ✅ Live waveform visualization
- ✅ Session management with Convex
- ✅ Audio playback with transcript sync
- ✅ Click-to-seek in transcript
- ✅ Trash system with 30-day auto-cleanup
- ✅ Pause/resume recording

---

## 🚀 Quick Start

See **[Setup Guide](docs/SETUP.md)** for detailed instructions.

```bash
# Install dependencies
pnpm install

# Start Convex (Terminal 1)
pnpm convex:dev

# Start Electron app (Terminal 2)
pnpm dev
```

**Requirements:**
- Node.js 18+
- Convex account ([convex.dev](https://convex.dev))
- AssemblyAI API key ([assemblyai.com](https://www.assemblyai.com))

---

## 📖 Documentation

- **[Setup Guide](docs/SETUP.md)** — Installation and configuration
- **[Phase Implementation Guide](docs/PHASES.md)** — Feature roadmap

---

## 🗺️ Roadmap

| Phase | Name | Status |
|-------|------|--------|
| **1** | **Capture** — Recording + Live Transcription | ✅ Complete |
| **2** | **Process** — Notes Editor + AI Generation | ⬜ Planned |
| **3** | **Learn** — Study Tools + StudyQuest | ⬜ Planned |
| **4** | **Connect** — Social + Study Rooms + Games | ⬜ Planned |

---

## 🛠️ Tech Stack

- **Frontend:** React 19 + TypeScript
- **Desktop:** Electron 39
- **Backend:** Convex (real-time database)
- **Transcription:** AssemblyAI Real-time API
- **Audio:** Web Audio API
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Build:** Vite + electron-builder

---

## 📂 Project Structure

```
ScribeCat-v3/
├── convex/              # Backend (Convex)
│   ├── auth.ts         # Authentication
│   ├── schema.ts       # Database schema
│   ├── sessions.ts     # CRUD operations
│   └── crons.ts        # Scheduled jobs
├── src/
│   ├── main/           # Electron main process
│   ├── preload/        # Electron preload
│   └── renderer/       # React app
│       ├── components/
│       ├── hooks/
│       └── types/
└── docs/
    ├── PHASES.md       # Implementation guide
    └── SETUP.md        # Setup instructions
```

---

## 🧪 Development

```bash
# Run development servers
pnpm dev              # Electron + Vite (requires convex:dev running)

# Build for production
pnpm build            # Compile TypeScript + Vite
pnpm package          # Create distributable

# Code quality
pnpm lint             # Check with Biome
pnpm lint:fix         # Auto-fix issues
pnpm format           # Format code
```

---

## 📝 License

MIT

---

## 🙏 Acknowledgments

- **AssemblyAI** for real-time transcription
- **Convex** for the backend platform
- **shadcn/ui** for UI components
