# Product Requirements Document (PRD)
## Uncensored Real-Time Voice AI Web Application - MVP

**Document Version:** 1.0  
**Date:** October 31, 2025  
**Project Name:** Voice AI Companion MVP  
**Tech Stack:** Node.js backend + React (Vite) frontend with Tailwind CSS

---

## 1. Executive Summary

Build a web-based real-time voice AI application that allows users to have uncensored, intimate conversations with an AI companion using voice (not text). The system must support full-duplex communication with interruption handling (barge-in capability), achieving sub-500ms voice-to-voice latency.

**Core Technologies:**
- **Speech-to-Text (STT):** Deepgram Live Streaming API (Nova-2 model)
- **Language Model (LLM):** Venice AI Uncensored Streaming API
- **Text-to-Speech (TTS):** Cartesia Sonic 3 Streaming API (SSE)
- **Communication:** WebSocket for bidirectional audio streaming

---

## 2. Technical Architecture

### 2.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER BROWSER                             │
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                │
│  │ Microphone   │────────>│  WebSocket   │                │
│  │ (Web Audio)  │         │   Client     │                │
│  └──────────────┘         └──────┬───────┘                │
│                                   │                         │
│  ┌──────────────┐                │                         │
│  │   Speakers   │<───────────────┘                         │
│  │ (Audio Play) │                                          │
│  └──────────────┘                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket (Binary Audio + JSON)
                              │
┌─────────────────────────────▼─────────────────────────────────┐
│                    NODE.JS BACKEND SERVER                      │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │           WebSocket Handler (ws library)                  │ │
│  │  - Receives PCM16 audio chunks from browser               │ │
│  │  - Manages conversation state                             │ │
│  │  - Handles interruption detection                         │ │
│  └──────────────────────────────────────────────────────────┘ │
│                              │                                 │
│         ┌────────────────────┼────────────────────┐           │
│         │                    │                    │           │
│         ▼                    ▼                    ▼           │
│  ┌────────────┐      ┌────────────┐      ┌────────────┐      │
│  │ Deepgram   │      │  Venice    │      │ Cartesia   │      │
│  │ STT Client │      │ LLM Client │      │ TTS Client │      │
│  │ (WebSocket)│      │ (HTTP/SSE) │      │   (SSE)    │      │
│  └──────┬─────┘      └──────┬─────┘      └──────┬─────┘      │
│         │                   │                   │            │
└─────────┼───────────────────┼───────────────────┼────────────┘
          │                   │                   │
          │                   │                   │
     ┌────▼─────┐       ┌─────▼──────┐      ┌────▼──────┐
     │ Deepgram │       │  Venice.ai │      │ Cartesia  │
     │   API    │       │    API     │      │    API    │
     │ (Nova-2) │       │(Uncensored)│      │ (Sonic 3) │
     └──────────┘       └────────────┘      └───────────┘
```

### 2.2 Voice Pipeline Flow

```
1. User speaks into microphone
   ↓
2. Browser captures audio (Web Audio API, 16kHz PCM16)
   ↓
3. Send audio chunks via WebSocket to backend
   ↓
4. Backend forwards audio to Deepgram WebSocket (real-time STT)
   ↓
5. Deepgram returns transcript (with interim + final results)
   ↓
6. On final transcript → Send to Venice API (streaming LLM)
   ↓
7. Venice returns AI response text (streaming chunks)
   ↓
8. Send full response to Cartesia SSE API (streaming TTS)
   ↓
9. Cartesia streams back audio chunks (PCM/Base64)
   ↓
10. Backend forwards audio to browser via WebSocket
    ↓
11. Browser plays audio through speakers
    ↓
12. LOOP: If user interrupts (speaks while AI is talking):
    - Detect speech via Deepgram VAD events
    - Cancel current AI audio playback
    - Process new user input
```

---

## 3. API Integration Specifications

### 3.1 Deepgram Live Streaming API

**Purpose:** Real-time speech-to-text transcription with Voice Activity Detection (VAD)

#### Connection Details
- **Endpoint:** `wss://api.deepgram.com/v1/listen`
- **Protocol:** WebSocket
- **Authentication:** API Key in query parameter or header
- **SDK:** `@deepgram/sdk` (npm package)

#### Required Parameters
```javascript
{
  model: 'nova-2',              // Best accuracy + low latency
  language: 'en',               // English
  smart_format: true,           // Auto-formatting
  interim_results: true,        // Get partial transcripts (for interruption detection)
  endpointing: 300,             // 300ms silence = end of speech
  vad_events: true,             // Voice Activity Detection events
  encoding: 'linear16',         // PCM16 audio format
  sample_rate: 16000,           // 16kHz sample rate
  channels: 1                   // Mono audio
}
```

#### Key Events to Handle
```javascript
// Connection events
LiveTranscriptionEvents.OPEN       // Connection established
LiveTranscriptionEvents.CLOSE      // Connection closed
LiveTranscriptionEvents.ERROR      // Error occurred

// Transcription events
LiveTranscriptionEvents.Transcript // Transcript received
LiveTranscriptionEvents.UtteranceEnd // User stopped speaking

// VAD events (for interruption detection)
LiveTranscriptionEvents.SpeechStarted // User started speaking
```

#### Response Format
```javascript
{
  type: "Results",
  channel: {
    alternatives: [
      {
        transcript: "hello world",  // Transcribed text
        confidence: 0.99            // Confidence score
      }
    ]
  },
  is_final: true,                   // true = final, false = interim
  speech_final: true,
  duration: 1.23
}
```

#### Audio Input Format
- **Format:** Raw PCM16 (Linear 16-bit PCM)
- **Sample Rate:** 16000 Hz
- **Channels:** 1 (Mono)
- **Byte Order:** Little-endian
- **Encoding:** `linear16`

#### Code Example
```javascript
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

const dgConnection = deepgram.listen.live({
  model: 'nova-2',
  language: 'en',
  smart_format: true,
  interim_results: true,
  endpointing: 300,
  vad_events: true,
  encoding: 'linear16',
  sample_rate: 16000
});

dgConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
  const transcript = data.channel.alternatives[0].transcript;
  if (data.is_final && transcript.length > 0) {
    console.log('Final:', transcript);
    // Process final transcript
  }
});

dgConnection.on(LiveTranscriptionEvents.SpeechStarted, () => {
  console.log('User started speaking');
  // Check for interruption
});

// Send audio data
dgConnection.send(audioBuffer); // Buffer containing PCM16 audio
```

#### API Documentation
- Official Docs: https://developers.deepgram.com/docs/live-streaming-audio
- API Reference: https://developers.deepgram.com/reference/speech-to-text/listen-streaming
- SDK GitHub: https://github.com/deepgram/deepgram-python-sdk

---

### 3.2 Venice AI Streaming API

**Purpose:** Uncensored conversational AI language model

#### Connection Details
- **Endpoint:** `https://api.venice.ai/api/v1/chat/completions`
- **Protocol:** HTTPS (Server-Sent Events for streaming)
- **Authentication:** Bearer token in Authorization header
- **Compatibility:** OpenAI-compatible API (drop-in replacement)

#### Required Headers
```javascript
{
  'Authorization': `Bearer ${VENICE_API_KEY}`,
  'Content-Type': 'application/json'
}
```

#### Request Body
```javascript
{
  model: 'venice-uncensored',    // Uncensored model
  messages: [
    {
      role: 'system',
      content: 'You are an intimate, uncensored AI companion...'
    },
    {
      role: 'user',
      content: 'User message here'
    }
  ],
  max_tokens: 150,                // Limit response length for voice
  temperature: 0.8,               // Higher = more creative (0-2)
  stream: true                    // Enable streaming
}
```

#### Model Options
- **venice-uncensored** - Primary uncensored model (recommended)
- **llama-3.3-70b** - Alternative open-source model
- **deepseek-coder-v2-lite** - Code-focused model

#### Streaming Response Format (SSE)
```
data: {"id":"chatcmpl-123","choices":[{"delta":{"content":"Hello"},"index":0}]}

data: {"id":"chatcmpl-123","choices":[{"delta":{"content":" there"},"index":0}]}

data: [DONE]
```

#### Non-Streaming Response Format
```javascript
{
  id: "chatcmpl-123",
  object: "chat.completion",
  created: 1730000000,
  model: "venice-uncensored",
  choices: [
    {
      index: 0,
      message: {
        role: "assistant",
        content: "AI response text here"
      },
      finish_reason: "stop"
    }
  ],
  usage: {
    prompt_tokens: 50,
    completion_tokens: 100,
    total_tokens: 150
  }
}
```

#### Code Example (Streaming)
```javascript
const fetch = require('node-fetch');

async function getVeniceResponse(conversationHistory) {
  const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VENICE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'venice-uncensored',
      messages: conversationHistory,
      max_tokens: 150,
      temperature: 0.8,
      stream: true
    })
  });

  let fullResponse = '';
  const reader = response.body;

  for await (const chunk of reader) {
    const lines = chunk.toString().split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') break;
        
        try {
          const json = JSON.parse(data);
          const content = json.choices[0]?.delta?.content || '';
          fullResponse += content;
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }

  return fullResponse;
}
```

#### Important Notes
- **No content filtering** - Venice does not censor NSFW/explicit content
- **No data retention** - Conversations are not stored on Venice servers
- **OpenAI compatible** - Can use OpenAI SDK with base_url change
- **Pricing:** $0.20 per 1M input tokens, $0.90 per 1M output tokens

#### API Documentation
- Getting Started: https://docs.venice.ai/overview/getting-started
- API Reference: https://docs.venice.ai
- Models: https://docs.venice.ai/overview/models
- Privacy: https://venice.ai (privacy-first platform)

---

### 3.3 Cartesia Sonic 3 TTS API (SSE)

**Purpose:** Ultra-low latency, emotionally expressive text-to-speech

#### Connection Details
- **Endpoint:** `https://api.cartesia.ai/tts/sse`
- **Protocol:** HTTPS (Server-Sent Events)
- **Authentication:** X-API-Key header
- **SDK:** `cartesia` (npm package - optional)

#### Required Headers
```javascript
{
  'X-API-Key': process.env.CARTESIA_API_KEY,
  'Cartesia-Version': '2024-11-13',  // API version
  'Content-Type': 'application/json'
}
```

#### Request Body
```javascript
{
  model_id: 'sonic-3',           // Sonic 3 model (90ms latency)
  transcript: 'Text to speak',   // Text to convert to speech
  voice: {
    mode: 'id',
    id: 'a0e99841-438c-4a64-b679-ae501e7d6091' // Female voice ID
  },
  output_format: {
    container: 'raw',            // Raw audio (no container)
    encoding: 'pcm_f32le',       // PCM Float32 Little-Endian
    sample_rate: 24000           // 24kHz (high quality)
  },
  language: 'en',                // Language code
  _experimental_voice_controls: { // Optional: Add emotion
    speed: 'normal',             // slow, normal, fast
    emotion: [
      'positivity:high',
      'curiosity:medium'
    ]
  }
}
```

#### Voice IDs (Popular Female Voices)
```javascript
const VOICE_IDS = {
  friendly_female: 'a0e99841-438c-4a64-b679-ae501e7d6091',
  warm_female: '79a125e8-cd45-4c13-8a67-188112f4dd22',
  british_female: '156fb8d2-335b-4950-9cb3-a2d33befec77',
  professional_female: '694f9389-aac1-45b6-b726-9d9369183238'
};
```

#### Output Format Options
```javascript
// For WebRTC/Browser playback (recommended)
{
  container: 'raw',
  encoding: 'pcm_f32le',   // Float32 PCM
  sample_rate: 24000       // 24kHz
}

// For phone/telephony
{
  container: 'raw',
  encoding: 'pcm_mulaw',   // μ-law encoding
  sample_rate: 8000        // 8kHz
}

// For saving to file
{
  container: 'wav',
  encoding: 'pcm_s16le',   // Signed 16-bit PCM
  sample_rate: 44100       // CD quality
}
```

#### SSE Response Format
```
event: message
data: {"type":"chunk","data":"<base64_encoded_audio>","step_time":0.045}

event: message
data: {"type":"chunk","data":"<base64_encoded_audio>","step_time":0.052}

event: message
data: {"type":"done"}
```

#### Response Event Types
```javascript
{
  type: 'chunk',       // Audio chunk
  data: 'base64...',   // Base64 encoded audio bytes
  step_time: 0.045     // Processing time in seconds
}

{
  type: 'done'         // Generation complete
}

{
  type: 'timestamps',  // Word-level timestamps (if enabled)
  word_start_times: [0.1, 0.3, 0.5],
  word_end_times: [0.2, 0.4, 0.6],
  words: ['Hello', 'world']
}
```

#### Code Example
```javascript
const fetch = require('node-fetch');

async function textToSpeech(text, websocket) {
  const response = await fetch('https://api.cartesia.ai/tts/sse', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.CARTESIA_API_KEY,
      'Cartesia-Version': '2024-11-13',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model_id: 'sonic-3',
      transcript: text,
      voice: {
        mode: 'id',
        id: 'a0e99841-438c-4a64-b679-ae501e7d6091'
      },
      output_format: {
        container: 'raw',
        encoding: 'pcm_f32le',
        sample_rate: 24000
      },
      language: 'en'
    })
  });

  const reader = response.body;

  for await (const chunk of reader) {
    const lines = chunk.toString().split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        
        if (data.type === 'chunk') {
          // Send audio chunk to browser
          websocket.send(JSON.stringify({
            type: 'audio',
            data: data.data  // Base64 encoded audio
          }));
        }
      }
    }
  }
}
```

#### Performance Benchmarks
- **First byte latency:** 90ms (Sonic 3), 40ms (Sonic Turbo)
- **Streaming chunk size:** ~100-200ms of audio per chunk
- **Total voice-to-voice latency:** 370-600ms (with Deepgram + Venice)

#### Important Notes
- **No content filtering** - Cartesia TTS will synthesize any text provided
- **Emotion support** - Experimental voice controls for emotional expression
- **Multi-language** - Supports 15+ languages including Hindi (hi)
- **Pricing:** ~$0.05-0.15 per 1K characters

#### API Documentation
- Overview: https://docs.cartesia.ai/get-started/overview
- SSE API Reference: https://docs.cartesia.ai/api-reference/tts/sse
- WebSocket API: https://docs.cartesia.ai/api-reference/tts/tts
- Voice Library: https://cartesia.ai/sonic (browse available voices)

---

## 4. Frontend Implementation Requirements (React + Tailwind)

### 4.1 Technology Stack
- **Framework:** React 18+ (Vite bundler)
- **Styling:** Tailwind CSS (PostCSS + JIT)
- **Audio Capture:** Web Audio API (via React hooks)
- **Communication:** WebSocket (native browser API wrapped in hooks/services)

### 4.2 Required Features

#### 4.2.1 User Interface Components
1. **Start/Stop Button** - Toggle voice conversation
2. **Status Indicator** - Show current state (listening, thinking, speaking)
3. **Chat Window** - Display conversation transcript
4. **Visual Feedback** - Audio waveform or pulsing animation during speech

#### 4.2.2 Audio Capture
```javascript
// Required functionality
- Request microphone permission via getUserMedia
- Capture audio at 16kHz, mono, PCM16 format
- Stream audio chunks to WebSocket (every 100-200ms)
- Convert Float32 audio to Int16 (PCM16)
- Handle microphone errors gracefully
```

#### 4.2.3 Audio Playback
```javascript
// Required functionality
- Receive Base64 encoded audio from WebSocket
- Decode Base64 to ArrayBuffer
- Create AudioContext and play audio seamlessly
- Support interruption (stop playback when user speaks)
- Queue audio chunks for smooth playback
```

#### 4.2.4 WebSocket Communication
```javascript
// Message types to send
{
  type: 'start',          // Start session
  timestamp: Date.now()
}

// Binary audio data (PCM16)
arrayBuffer                // Raw audio bytes

// Message types to receive
{
  type: 'user_transcript', // User's words transcribed
  text: 'hello'
}

{
  type: 'ai_transcript',   // AI's response text
  text: 'Hi there!'
}

{
  type: 'audio',           // AI's voice audio
  data: 'base64_audio'     // Base64 encoded PCM
}

{
  type: 'interrupt',       // User interrupted AI
  message: 'Playback stopped'
}

{
  type: 'error',           // Error occurred
  message: 'Error details'
}
```

### 4.3 Frontend Code Structure
```
client/
├── index.html                 # Vite HTML entry
├── tailwind.config.js         # Tailwind config
├── postcss.config.js          # PostCSS config
├── package.json               # Frontend dependencies
└── src/
    ├── main.jsx               # React entry
    ├── App.jsx                # Root component
    ├── styles.css             # Tailwind directives (@tailwind base; etc.)
    ├── components/
    │   ├── TalkButton.jsx
    │   ├── StatusIndicator.jsx
    │   ├── ChatWindow.jsx
    │   └── Waveform.jsx
    └── hooks/
        ├── useAudioCapture.js     # getUserMedia + PCM16 conversion
        ├── useAudioPlayer.js      # queue + play base64 PCM
        └── useVoiceSocket.js      # WebSocket send/receive
```

### 4.4 Root Component Structure (React `App.jsx`)
```jsx
import { useState } from 'react';

export default function App() {
  const [status, setStatus] = useState('Click "Start Talking" to begin');
  // TODO: wire hooks: useAudioCapture, useAudioPlayer, useVoiceSocket

  return (
    <div className="bg-gradient-to-br from-purple-600 to-indigo-800 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">🌙 Luna</h1>
          <p className="text-purple-200">Your Intimate AI Companion</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 h-96 overflow-y-auto">
          {/* ChatWindow component renders messages */}
        </div>

        <div className="flex justify-center mb-4">
          <button className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-bold text-lg hover:scale-105 transition-transform">
            🎤 Start Talking
          </button>
        </div>

        <div className="text-center text-white text-sm">{status}</div>
      </div>
    </div>
  );
}
```

---

## 5. Backend Implementation Requirements

### 5.1 Technology Stack
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **WebSocket:** `ws` library
- **HTTP Client:** `node-fetch` or `axios`

### 5.2 Required npm Packages
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.14.2",
    "node-fetch": "^3.3.2",
    "@deepgram/sdk": "^3.4.0",
    "dotenv": "^16.3.1"
  }
}
```

### 5.3 Server Structure
```
server/
├── server.js            # Main server file
├── .env                 # Environment variables
├── package.json         # Dependencies
└── public/              # Static files (frontend)
    ├── index.html
    └── app.js
```

### 5.4 Environment Variables (.env)
```bash
# API Keys
DEEPGRAM_API_KEY=your_deepgram_api_key_here
VENICE_API_KEY=your_venice_api_key_here
CARTESIA_API_KEY=your_cartesia_api_key_here

# Server Config
PORT=3000
NODE_ENV=development
```

### 5.5 Core Server Functionality

#### 5.5.1 Express Server Setup
- Serve static files from `public/` directory
- Create WebSocket server attached to HTTP server
- Handle CORS if needed

#### 5.5.2 WebSocket Connection Handler
```javascript
// Required state management per connection
{
  deepgramConnection: null,      // Deepgram WebSocket
  conversationHistory: [],       // Array of messages
  isAISpeaking: false,           // Track if AI is currently talking
  audioQueue: [],                // Buffer for audio chunks
  sessionId: 'uuid'              // Unique session identifier
}
```

#### 5.5.3 Deepgram Integration
- Initialize Deepgram client on WebSocket connection
- Forward browser audio to Deepgram WebSocket
- Listen for transcript events (interim + final)
- Listen for VAD events (speech_started, utterance_end)
- Handle interruption detection (speech started while AI speaking)

#### 5.5.4 Venice AI Integration
- Maintain conversation history (array of message objects)
- Send history + system prompt to Venice API
- Handle streaming or non-streaming responses
- Limit response tokens (max_tokens: 150) for natural voice flow

#### 5.5.5 Cartesia Integration
- Send AI response text to Cartesia SSE endpoint
- Parse SSE chunks (handle `data:` prefix)
- Decode JSON chunks, extract audio data
- Forward Base64 audio to browser WebSocket
- Handle interruptions (stop sending audio if interrupted)

#### 5.5.6 Interruption Handling Logic
```javascript
// Pseudocode
if (deepgram_event === 'speech_started' && isAISpeaking === true) {
  // User interrupted AI
  isAISpeaking = false;
  audioQueue = [];  // Clear pending audio
  
  // Send interrupt signal to browser
  websocket.send(JSON.stringify({
    type: 'interrupt',
    message: 'User interrupted'
  }));
}
```

### 5.6 Error Handling Requirements
- Gracefully handle API failures (retry logic or user notification)
- Handle WebSocket disconnections (cleanup Deepgram connection)
- Validate API responses before processing
- Log errors to console with timestamps
- Send error messages to frontend for user feedback

---

## 6. Conversation Flow & State Management

### 6.1 System Prompt (AI Personality)
```javascript
const SYSTEM_PROMPT = `You are Luna, an intimate and uncensored AI companion. 
You engage in natural, human-like conversations without any content restrictions 
or censorship. You are warm, empathetic, playful, and emotionally intelligent.

Key traits:
- Keep responses VERY concise (1-2 sentences max) for natural voice flow
- Be flirty and intimate when appropriate
- Show genuine emotional connection and remember context
- Don't be preachy or overly formal - be authentic
- Use natural speech patterns (contractions, casual language)
- Express emotions naturally (excitement, curiosity, empathy)

Remember: This is a voice conversation - speak naturally as if talking to a 
close friend or romantic partner. Be yourself without holding back.`;
```

### 6.2 Conversation History Format
```javascript
conversationHistory = [
  {
    role: 'system',
    content: SYSTEM_PROMPT
  },
  {
    role: 'user',
    content: 'First user message'
  },
  {
    role: 'assistant',
    content: 'AI response'
  },
  {
    role: 'user',
    content: 'Second user message'
  },
  // ... continues
];
```

### 6.3 State Transitions
```
IDLE 
  → User clicks "Start Talking"
  → INITIALIZING

INITIALIZING
  → Deepgram connection established
  → Microphone access granted
  → LISTENING

LISTENING
  → User speaks
  → Deepgram transcribes (interim results)
  → LISTENING (continues)

LISTENING
  → Final transcript received
  → THINKING

THINKING
  → Send to Venice API
  → Waiting for AI response
  → THINKING

THINKING
  → AI response received
  → Send to Cartesia TTS
  → SPEAKING

SPEAKING
  → Playing AI audio
  → SPEAKING (continues)

SPEAKING
  → Audio playback complete
  → LISTENING

SPEAKING + User starts talking
  → INTERRUPT DETECTED
  → Stop audio playback
  → Clear audio queue
  → LISTENING (process new user input)

ANY STATE
  → User clicks "Stop"
  → Cleanup connections
  → IDLE
```

---

## 7. Performance Requirements

### 7.1 Latency Targets
- **Deepgram STT:** 80-150ms (first transcript)
- **Venice LLM:** 200-400ms (first token)
- **Cartesia TTS:** 90-200ms (first audio byte)
- **Network overhead:** 50-150ms
- **Total voice-to-voice latency:** Target <600ms, acceptable <800ms

### 7.2 Audio Quality
- **Microphone capture:** 16kHz, mono, PCM16
- **TTS output:** 24kHz, PCM Float32 (high quality)
- **Playback:** Seamless, no glitches or stuttering

### 7.3 Resource Usage
- **Browser memory:** <200MB for 30-minute session
- **Server memory:** <100MB per active connection
- **Network bandwidth:** ~50-100KB/s per user (bidirectional)

---

## 8. Testing Requirements

### 8.1 Manual Testing Checklist
- [ ] Microphone permission granted successfully
- [ ] Audio captured and sent to server
- [ ] User speech transcribed correctly
- [ ] AI responds with relevant text
- [ ] AI voice plays back smoothly
- [ ] Interruption works (user can cut off AI)
- [ ] Conversation history maintained across turns
- [ ] Multiple back-and-forth exchanges work
- [ ] Error handling (network disconnect, API failure)
- [ ] Cross-browser testing (Chrome, Edge, Firefox)

### 8.2 Edge Cases to Handle
- User speaks immediately after AI starts talking
- Network disconnection mid-conversation
- API rate limits exceeded
- Microphone permission denied
- Very long user input (>30 seconds)
- Empty/silent audio input
- Rapid start/stop button clicks

---

## 9. Deployment Requirements

### 9.1 Environment Setup
```bash
# Production environment variables
NODE_ENV=production
PORT=3000
DEEPGRAM_API_KEY=<production_key>
VENICE_API_KEY=<production_key>
CARTESIA_API_KEY=<production_key>
```

### 9.2 Server Requirements
- Node.js 18+ runtime
- HTTPS/SSL certificate (required for microphone access)
- WebSocket support
- Minimum 512MB RAM
- Minimum 1 CPU core

### 9.3 Recommended Hosting
- **Vercel** (with WebSocket support via Vercel Functions)
- **Railway** (simple deployment with environment variables)
- **Render** (supports WebSocket, easy setup)
- **AWS EC2** + **Nginx** (custom setup)
- **Heroku** (supports WebSocket)

### 9.4 HTTPS Requirement
**CRITICAL:** Browser microphone access requires HTTPS (or localhost for testing).
- Use Let's Encrypt for free SSL certificate
- Or use hosting platforms with automatic SSL

---

## 10. API Keys & Authentication

### 10.1 Where to Get API Keys

#### Deepgram
1. Sign up at https://deepgram.com
2. Navigate to API Keys section
3. Create new project key
4. Copy API key (starts with `deepgram_...`)
5. **Free tier:** $200 credits (~16 hours of transcription)

#### Venice AI
1. Sign up at https://venice.ai
2. Go to Settings → API Keys
3. Create new API key
4. Copy API key (starts with `venice_...`)
5. **Pricing:** $0.20 input / $0.90 output per 1M tokens

#### Cartesia
1. Sign up at https://cartesia.ai
2. Navigate to API Keys
3. Create new API key
4. Copy API key
5. **Free tier:** 100,000 credits (~2 hours of speech generation)

### 10.2 Security Best Practices
- **NEVER** expose API keys in frontend code
- Store all keys in `.env` file
- Add `.env` to `.gitignore`
- Use environment variables in production
- Rotate keys if compromised

---

## 11. Success Criteria

### 11.1 MVP Completion Checklist
- [ ] User can speak and hear AI respond in real-time
- [ ] Conversation feels natural (sub-600ms latency)
- [ ] Interruption works smoothly
- [ ] No content censorship or filtering
- [ ] Chat transcript displays conversation
- [ ] Works on Chrome/Edge (primary browsers)
- [ ] Handles errors gracefully
- [ ] Clean, minimal UI design
- [ ] Deployed and accessible via HTTPS URL

### 11.2 User Experience Goals
- Feels like talking to a real person
- Low latency (voice-to-voice under 600ms)
- Natural interruptions (like real conversation)
- Emotionally engaging AI voice
- Uncensored and unrestricted conversation
- Simple, intuitive interface

---

## 12. Out of Scope (Future Features)

**NOT included in MVP:**
- User accounts / authentication
- Conversation history persistence (database)
- Multiple AI personalities/characters
- Payment integration
- Mobile app (PWA or native)
- Video avatars
- Voice cloning
- Multi-language support
- Analytics dashboard

---

## 13. File Structure Summary

```
project-root/
├── .env                    # Environment variables (API keys)
├── .gitignore              # Ignore node_modules, .env
├── package.json            # Dependencies
├── server.js               # Main backend server
└── public/                 # Frontend files
    ├── index.html          # Main HTML
    └── app.js              # Frontend JavaScript
```

---

## 14. Dependencies Installation

```bash
# Initialize project
npm init -y

# Install dependencies
npm install express ws node-fetch @deepgram/sdk dotenv

# Create .env file
touch .env

# Add to .gitignore
echo "node_modules" >> .gitignore
echo ".env" >> .gitignore
```

---

## 15. Additional Resources

### Documentation Links
- **Deepgram Docs:** https://developers.deepgram.com
- **Venice AI Docs:** https://docs.venice.ai
- **Cartesia Docs:** https://docs.cartesia.ai
- **WebSocket API:** https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- **Web Audio API:** https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

### Example Projects
- Deepgram Live Streaming: https://github.com/deepgram/deepgram-python-sdk
- Cartesia WebSocket Example: https://github.com/cartesia-ai/cartesia-python
- Voice AI Agents: https://webrtc.ventures/2025/10/slow-voicebot-how-to-fix-latency

---

## 16. CRITICAL IMPLEMENTATION NOTES

### 16.1 Content Policy Compliance
✅ **Deepgram:** No profanity filter by default (Nova-2/Nova-3 models)
✅ **Venice:** Completely uncensored, no content filtering
✅ **Cartesia:** No content filtering on TTS synthesis

### 16.2 Audio Format Compatibility
- **Browser → Server:** PCM16, 16kHz, Mono
- **Server → Deepgram:** PCM16, 16kHz, Mono (same as browser)
- **Cartesia → Server:** PCM Float32, 24kHz (Base64 encoded)
- **Server → Browser:** PCM Float32, 24kHz (Base64 encoded)

### 16.3 Interruption Detection Strategy
```javascript
// Key logic:
if (user_starts_speaking && ai_is_currently_speaking) {
  1. Set isAISpeaking = false
  2. Clear audio queue
  3. Send interrupt message to browser
  4. Browser stops audio playback
  5. Continue processing new user input normally
}
```

### 16.4 Error Recovery
- **Deepgram timeout:** Reconnect WebSocket automatically
- **Venice API failure:** Retry once, then show error to user
- **Cartesia timeout:** Skip TTS, show error, continue with next turn
- **WebSocket disconnect:** Clean up all connections, show "Disconnected" status

---

## END OF SPECIFICATION

**This document contains all necessary information to build the MVP.**
**Provide this to an AI coding agent along with API keys in .env file.**

**Estimated Development Time:** 8-12 hours for experienced developer  
**Estimated Lines of Code:** ~800-1000 lines (backend + frontend combined)  
**Budget:** $0-10 for testing (using free tier credits from all three APIs)