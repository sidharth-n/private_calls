# Voice AI Companion - Development Progress

**Last Updated:** November 3, 2025  
**Status:** Core functionality complete, needs API credits for TTS

---

## Project Overview

Real-time voice AI web application for uncensored conversations with an AI companion. Full-duplex communication with ultra-fast interruption handling.

**Tech Stack:**
- **Frontend:** React (Vite) + Tailwind CSS
- **Backend:** Node.js + Express + WebSocket
- **STT:** Gladia Live API (switched from Deepgram)
- **LLM:** Venice AI (llama-3.3-70b, uncensored)
- **TTS:** Cartesia Sonic 3 (streaming SSE)

---

## Architecture

```
Browser (React)
  ├─ useAudioCapture: Captures mic audio (PCM16, 16kHz)
  ├─ useAudioPlayer: Plays TTS audio chunks (Web Audio API)
  └─ useVoiceSocket: WebSocket client for bidirectional communication

         ↕ WebSocket (binary audio + JSON messages)

Node.js Server
  ├─ Gladia Live: Real-time STT with partial transcripts
  ├─ Venice AI: Streaming LLM responses
  └─ Cartesia: Streaming TTS generation
```

---

## File Structure

```
/home/sid/Documents/private_calls/
├── server.js                    # Backend server with WebSocket handler
├── package.json                 # Server dependencies
├── .env                         # API keys (gitignored)
├── client/
│   ├── src/
│   │   ├── App.jsx              # Main React component
│   │   ├── main.jsx             # React entry point
│   │   ├── styles.css           # Tailwind styles
│   │   └── hooks/
│   │       ├── useAudioCapture.js   # Mic capture hook
│   │       ├── useAudioPlayer.js    # Audio playback hook
│   │       └── useVoiceSocket.js    # WebSocket hook
│   ├── index.html
│   └── package.json             # Client dependencies
├── spec.md                      # Original PRD
├── TODO.md                      # Optimization checklist
└── progress.md                  # This file
```

---

## Current State

### ✅ Completed Features

1. **Audio Capture**
   - ScriptProcessor with 2048 buffer size
   - PCM16 encoding at 16kHz mono
   - Low-latency mode (`latencyHint: 'interactive'`)

2. **Speech-to-Text (Gladia)**
   - Real-time streaming transcription
   - Partial transcripts enabled for lower latency
   - Aggressive endpointing (50ms)
   - VAD-based speech detection

3. **LLM Integration (Venice AI)**
   - Streaming responses with llama-3.3-70b
   - Conversation history maintained
   - Max 80 tokens per response (short, natural replies)
   - Temperature 0.8 for personality

4. **Text-to-Speech (Cartesia)**
   - Streaming SSE API integration
   - Voice ID: b56c6aac-f35f-46f7-9361-e8f078cec72e (Luna)
   - PCM Float32 output at 24kHz
   - Sequential generation (full response as one piece)

5. **Audio Playback**
   - Web Audio API with scheduled playback
   - Automatic queuing and sequential play
   - Proper cleanup on interruption

6. **Interruption Handling**
   - VAD-based instant detection via `speech_start` event
   - Stops all audio sources immediately
   - Clears queue and resets playback state
   - ~50-100ms interruption latency

7. **WebSocket Communication**
   - Binary audio streaming (user → server)
   - JSON messages for transcripts, status, interrupts
   - Proper connection lifecycle management

---

## Key Implementation Details

### Server State Management
```javascript
const state = {
  gladiaClient: null,
  gladiaSession: null,
  isSttReady: false,
  isAISpeaking: false,
  conversationHistory: []
}
```

### Message Flow
1. User speaks → Audio captured → Sent to Gladia
2. Gladia → Partial transcripts (real-time feedback)
3. Gladia → Final transcript → Triggers Venice AI
4. Venice AI → Streams response → Sends to frontend
5. Server → Generates TTS for complete response
6. Cartesia → Streams audio chunks → Browser plays

### Interruption Flow
1. User speaks while AI is talking
2. Gladia detects `speech_start` event
3. Server sets `isAISpeaking = false`
4. Sends interrupt message to frontend
5. Frontend stops all audio sources
6. Clears queue and resets state

---

## Known Issues & Blockers

### 🔴 CRITICAL: Cartesia API Credits Exhausted
- TTS generation fails with "Payment Required"
- Transcripts work, but no audio playback
- **Solution:** Add credits at https://play.cartesia.ai/ or update API key

### ⚠️ Optimization Removed
- Parallel TTS generation caused tone inconsistencies
- Reverted to simple sequential approach
- Generates TTS for complete response as one piece
- Trade-off: Slightly higher latency but consistent audio quality

---

## Configuration

### Gladia Config
```javascript
{
  model: 'solaria-1',
  encoding: 'wav/pcm',
  sample_rate: 16000,
  endpointing: 0.05,
  maximum_duration_without_endpointing: 15,
  messages_config: {
    receive_partial_transcripts: true,
    receive_final_transcripts: true
  }
}
```

### Venice AI Config
```javascript
{
  model: 'llama-3.3-70b',
  max_tokens: 80,
  temperature: 0.8,
  stream: true
}
```

### Cartesia Config
```javascript
{
  model_id: 'sonic-3',
  voice: { id: 'b56c6aac-f35f-46f7-9361-e8f078cec72e' },
  output_format: {
    container: 'raw',
    encoding: 'pcm_f32le',
    sample_rate: 24000
  }
}
```

---

## Recent Changes (Nov 3, 2025)


## Next Steps

1. **Fix Cartesia API** - Add credits or new API key
2. **Test dashboard** - Verify all config changes work
3. **Connect config to backend** - Send agent config via WebSocket
4. **Add save/load functionality** - Persist agent configurations
5. **Production deployment** - Build and serve

---

## Development Commands

```bash
# Start backend server
npm run dev

# Start frontend (separate terminal)
npm run client

# Build for production
npm run build

# Serve production build
npm run serve
```

---

## API Keys Required

- `GLADIA_API_KEY` - STT service
- `VENICE_API_KEY` - LLM service  
- `CARTESIA_API_KEY` - TTS service (needs credits)

Store in `.env` file (see `.env.example`)

---

## Notes for Context Continuation

- **Simple is better:** Removed complex optimizations that caused audio quality issues
- **Sequential TTS:** Generates complete response as one piece for consistent tone
- **VAD interruption:** Uses `speech_start` event for instant detection
- **Partial transcripts:** Enabled for real-time user feedback
- **Audio player:** Properly handles interruption with source cleanup and state reset
- **Main blocker:** Cartesia API credits - everything else works

### ✅ Agent Dashboard 3-Column Layout (Nov 3, 2025)
- **Redesigned Architecture:** Modular 3-column layout matching screenshot
- **Components Structure:**
  - `AgentDashboard.jsx` - Parent component (25% | 50% | 25% layout)
  - `AgentInfoPanel.jsx` - Left panel with agent info, stats, providers, prompts
  - `ConfigPanel.jsx` - Middle panel with collapsible sections
  - `TestInterface.jsx` - Right panel with test controls
- **Left Panel (Agent Info):**
  - Editable agent name
  - Agent ID, cost per call, latency, total calls stats
  - Provider dropdowns: LLM (Venice models), Voice (Cartesia), Transcriber (Gladia), Language
  - System prompt textarea
  - Welcome message input
- **Middle Panel (Configuration):**
  - All collapsible sections from before
- **Right Panel (Test):**
  - Live microphone test interface
- **Design:** Clean, professional UI matching screenshot layout


### ✅ Dashboard Config Integration with Backend (Nov 3, 2025)
- **Backend Updated:** server.js now receives and uses dashboard config
- **New Parameters Added to Dashboard:**
  - LLM Settings section: model, maxTokens (20-200), temperature (0-2)
  - All configs now sync with backend on test start
- **Config Flow:**
  - Dashboard sends complete config via WebSocket on 'start' message
  - Backend uses config for: system prompt, LLM settings, speech settings, realtime settings
  - All provider selections (LLM/Voice/Transcriber/Language) applied dynamically
- **Welcome Message Implementation:**
  - AI-speaks-first functionality added
  - Welcome message sent immediately after session starts
  - Generates TTS for welcome message before user speaks
- **Parameters Now Configurable:**
  - System Prompt (from dashboard)
  - LLM: model, max_tokens, temperature
  - TTS: voice ID, language
  - STT: endpointing, max duration, language
  - Welcome message

