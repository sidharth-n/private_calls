# Voice AI Companion MVP (React + Tailwind + Node)

This project is an MVP for a real-time, uncensored voice AI web app using Deepgram (STT), Venice AI (LLM), and Cartesia Sonic 3 (TTS).

## Monorepo Structure
- `server.js` — Node.js Express + WebSocket backend
- `package.json` — Backend server dependencies and scripts
- `client/` — React (Vite) frontend with Tailwind CSS
- `.env.example` — Copy to `.env` and fill in API keys

## Prereqs
- Node.js 18+

## Setup
```bash
# 1) Install server deps
npm install

# 2) Scaffold client and install deps
cd client && npm install && cd ..

# 3) Create env file
cp .env.example .env
# Fill in DEEPGRAM_API_KEY, VENICE_API_KEY, CARTESIA_API_KEY
```

## Development
In two terminals:
```bash
# Terminal A: start backend
npm run dev

# Terminal B: start Vite dev server
npm run client
```

Open the client URL (default shown by Vite, e.g., http://localhost:5173). The WebSocket endpoint is served by the backend at `ws://localhost:3000/ws`.

## Build & Serve Production
```bash
npm run serve
# Builds client and serves it from Express at http://localhost:3000
```

## Notes
- Server integrations with Deepgram, Venice, and Cartesia are scaffolded as TODOs.
- See `spec.md` for detailed architecture and API requirements.
