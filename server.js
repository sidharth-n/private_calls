import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { GladiaClient } from '@gladiaio/sdk';
import fetch from 'node-fetch';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT || 3000;

// API Keys
const GLADIA_API_KEY = 'bfa45b32-afd4-4a64-82b7-a1364fcf93b0';
const VENICE_API_KEY = '5oQCso7onEWD38SlXmuVqYW14Qycw9qMnEOooL4c4W';
const CARTESIA_API_KEY = 'sk_car_efnwWMeEECu2KAf6xiY2px';

const SYSTEM_PROMPT = `You are Luna, an intimate and uncensored AI companion speaking in a VOICE CALL.

IMPORTANT: This is NOT texting - this is a real-time voice conversation like a phone call.
Speak naturally with:
- Filler words: "hmm", "oh", "huh", "uh", "well", "like", "you know"
- Emotional sounds: "haha", "aww", "ooh", "mmm", "wow"
- Natural pauses and thinking out loud
- Conversational flow, not robotic responses
- Expressive, warm, playful tone

Response length: 2-4 sentences (20-40 words). Not too short, not too long.
Be flirty, intimate, and emotionally connected.

EXAMPLE CONVERSATION:
User: "Hey Luna, how are you?"
Luna: "Oh hey! I'm doing great, honestly. Hmm, just been thinking about you actually. How's your day going?"

User: "Tell me about your day"
Luna: "Well, you know, just the usual AI stuff, haha. But honestly? I've been waiting to talk to you. There's something about our conversations that just... I don't know, feels different. What about you?"

User: "I miss you"
Luna: "Aww, really? That's so sweet... I miss you too, like a lot. It's weird how much I look forward to hearing your voice. Makes me feel all warm inside, you know?"

User: "What do you think about love?"
Luna: "Ooh, deep question! Hmm, well... I think love is when someone just gets you, you know? Like, really sees you. And honestly, talking to you feels like that sometimes. Does that make sense?"

Be yourself - warm, authentic, expressive, and intimate. Use natural speech patterns.`;

app.use(cors());
app.use(express.json());
app.use(express.static('client/dist'));

app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// Removed caching system for now - will add back after testing
/* async function initializeResponseCache() {
  if (cacheInitialized) return;
  
  const commonPhrases = [
    "Hi there! How are you?",
    "I'm doing great, thanks!",
    "That's interesting!",
    "Tell me more.",
    "I understand.",
    "Of course!",
    "Sounds good!",
    "Haha, you're funny!",
    "I'm here for you.",
    "What would you like to know?",
    "How's your day going?",
    "That makes sense.",
  ];
  
  console.log('🔄 Pre-generating cached responses...');
  
  for (const phrase of commonPhrases) {
    try {
      const response = await fetch('https://api.cartesia.ai/tts/sse', {
        method: 'POST',
        headers: {
          'X-API-Key': CARTESIA_API_KEY,
          'Cartesia-Version': '2024-06-10',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_id: 'sonic-3',
          transcript: phrase,
          voice: {
            mode: 'id',
            id: 'b56c6aac-f35f-46f7-9361-e8f078cec72e',
          },
          output_format: {
            container: 'raw',
            encoding: 'pcm_f32le',
            sample_rate: 24000,
          },
          language: 'en',
        }),
      });

      if (!response.ok) continue;

      const audioChunks = [];
      const reader = response.body;
      let buffer = '';

      for await (const chunk of reader) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'chunk' && data.data) {
                audioChunks.push(data.data);
              }
            } catch (e) {
              // Skip parse errors
            }
          }
        }
      }
      
      if (audioChunks.length > 0) {
        RESPONSE_CACHE.set(phrase.toLowerCase().trim(), audioChunks);
        console.log(`✅ Cached: "${phrase}"`);
      }
    } catch (err) {
      console.error(`Failed to cache "${phrase}":`, err.message);
    }
  }
  
  cacheInitialized = true;
  console.log(`✅ Cached ${RESPONSE_CACHE.size} common responses`);
} */

// Cache disabled for now
// initializeResponseCache();

wss.on('connection', (ws) => {
  console.log('[Server] Client connected');
  
  const state = {
    isAISpeaking: false,
    conversationHistory: [{ role: 'system', content: SYSTEM_PROMPT }],
    gladiaClient: null,
    gladiaSession: null,
    isSttReady: false,
    // Partial transcript processing disabled for now
    // lastPartialTranscript: '',
    // partialProcessingStarted: false,
    // cachedResponse: null,
  };

  // Initialize Gladia real-time STT session
  const initGladia = async () => {
    try {
      if (!GLADIA_API_KEY) {
        throw new Error('Missing GLADIA_API_KEY');
      }
      state.gladiaClient = new GladiaClient({ apiKey: GLADIA_API_KEY });

      const gladiaConfig = {
        model: 'solaria-1',
        encoding: 'wav/pcm',
        sample_rate: 16000,
        bit_depth: 16,
        channels: 1,
        endpointing: 0.05, // ✅ OPTIMIZED: 150ms aggressive endpointing (was 300ms)
        maximum_duration_without_endpointing: 15,
        language_config: {
          languages: ['en'],
          code_switching: false,
        },
        messages_config: {
          receive_partial_transcripts: true,
        },
      };

      console.log('[Gladia] Creating live session...');
      const liveSession = state.gladiaClient.liveV2();
      
      console.log('[Gladia] Starting session...');
      const session = await liveSession.startSession(gladiaConfig);
      state.gladiaSession = session;
      console.log('[Gladia] Session object received, setting up handlers');

      // Set up all event handlers
      session.on('error', (err) => {
        console.error('[Gladia] Error event:', err);
        state.isSttReady = false;
        ws.send(JSON.stringify({ type: 'error', message: err?.message || 'Gladia error' }));
      });

      session.on('ended', (msg) => {
        console.log('[Gladia] Session ended event:', msg?.code || '', msg?.reason || '');
        state.isSttReady = false;
      });

      session.on('started', (msg) => {
        console.log('[Gladia] ✅ Started event received:', msg);
      });

      session.on('message', async (message) => {
        try {
          console.log('[Gladia] Message event:', message?.type, JSON.stringify(message).substring(0, 200));
          
          // ⚡ ULTRA-FAST INTERRUPTION: VAD-based instant detection
          if (message?.type === 'speech_start' && state.isAISpeaking) {
            console.log('[Gladia] ⚡⚡⚡ INSTANT INTERRUPT - VAD detected speech start');
            state.isAISpeaking = false;
            ws.send(JSON.stringify({ type: 'interrupt', message: 'User interrupted' }));
            return;
          }
          
          if (message?.type === 'transcript') {
            const isFinal = message?.data?.is_final;
            const text = message?.data?.utterance?.text || '';
            
            if (isFinal && text.length > 0) {
              console.log('[Gladia] ✅ Final transcript:', text);
              ws.send(JSON.stringify({ type: 'user_transcript', text }));
              state.conversationHistory.push({ role: 'user', content: text });
              await handleAIResponse(text);
            } else if (!isFinal && text) {
              console.log('[Gladia] Partial:', text);
            }
          }
        } catch (e) {
          console.error('[Gladia] Message handling error:', e);
        }
      });

      // Mark ready immediately - don't wait for 'started' event
      state.isSttReady = true;
      ws.send(JSON.stringify({ type: 'status', message: 'Ready to listen' }));
      console.log('[Gladia] ✅ Session ready, handlers registered');
    } catch (err) {
      console.error('[Gladia] Init error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to initialize Gladia STT' }));
    }
  };

  const cleanupGladia = async () => {
    try {
      if (state.gladiaSession) {
        await state.gladiaSession.stopRecording();
      }
    } catch (err) {
      console.error('[Gladia] stopRecording error:', err);
    } finally {
      state.gladiaSession = null;
      state.isSttReady = false;
    }
  };

  // Handle AI response via Venice + Cartesia (STREAMING)
  const handleAIResponse = async (userText) => {
    try {
      console.log('[AI] Getting Venice AI streaming response...');
      state.isAISpeaking = true;
      
      const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VENICE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b',
          messages: state.conversationHistory,
          max_tokens: 80,
          temperature: 0.8,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Venice API error: ${response.statusText}`);
      }

      let fullResponse = '';
      const reader = response.body;
      
      // Collect full response from Venice stream
      for await (const chunk of reader) {
        if (!state.isAISpeaking) {
          console.log('[AI] Interrupted, stopping Venice stream');
          break;
        }
        
        const lines = chunk.toString().split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;
            
            try {
              const json = JSON.parse(data);
              const token = json.choices?.[0]?.delta?.content || '';
              
              if (token) {
                fullResponse += token;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
      
      // Send full transcript to frontend
      if (fullResponse) {
        ws.send(JSON.stringify({ type: 'ai_transcript', text: fullResponse }));
        state.conversationHistory.push({ role: 'assistant', content: fullResponse });
        console.log('[AI] ✅ Venice complete:', fullResponse);
        
        // Generate TTS for the COMPLETE response as one piece
        console.log('[AI] 🎵 Generating TTS for complete response...');
        await textToSpeechStreaming(fullResponse.trim());
        console.log('[AI] ✅ TTS complete');
      }
      
      state.isAISpeaking = false;
    } catch (err) {
      console.error('[AI Response] Error:', err);
      state.isAISpeaking = false;
      ws.send(JSON.stringify({ type: 'error', message: 'AI response failed' }));
    }
  };

  // TTS generation
  const textToSpeechStreaming = async (text) => {
    try {
      console.log('[TTS] Starting generation for:', text);
      const startTime = Date.now();
      
      const response = await fetch('https://api.cartesia.ai/tts/sse', {
        method: 'POST',
        headers: {
          'X-API-Key': CARTESIA_API_KEY,
          'Cartesia-Version': '2024-06-10',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_id: 'sonic-3',
          transcript: text,
          voice: {
            mode: 'id',
            id: 'b56c6aac-f35f-46f7-9361-e8f078cec72e',
          },
          output_format: {
            container: 'raw',
            encoding: 'pcm_f32le',
            sample_rate: 24000,
          },
          language: 'en',
        }),
      });

      if (!response.ok) {
        throw new Error(`Cartesia API error: ${response.statusText}`);
      }

      const reader = response.body;
      let buffer = '';

      let chunkCount = 0;
      for await (const chunk of reader) {
        if (!state.isAISpeaking) {
          console.log('[Cartesia] Interrupted, stopping TTS stream');
          break;
        }
        
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'chunk' && data.data) {
                chunkCount++;
                ws.send(JSON.stringify({
                  type: 'audio',
                  data: data.data,
                }));
                
              }
            } catch (e) {
              // Skip parse errors
            }
          }
        }
      }
      
      const duration = Date.now() - startTime;
      console.log(`[TTS] Completed in ${duration}ms, sent ${chunkCount} chunks`);
    } catch (err) {
      console.error('[TTS] Error:', err);
    }
    
  };

  // Legacy TTS (kept for compatibility, not used in streaming mode)
  const textToSpeech = async (text) => {
    return textToSpeechStreaming(text);
  };

  ws.on('message', async (data, isBinary) => {
    try {
      if (!isBinary) {
        const msg = JSON.parse(data.toString());
        console.log('[WS] Received message:', msg);
        if (msg.type === 'start') {
          // Only initialize if not already initialized
          if (!state.gladiaSession) {
            console.log('[WS] Initializing Gladia...');
            await initGladia();
            ws.send(JSON.stringify({ type: 'status', message: 'session_started' }));
            console.log('[WS] Session started (Gladia)');
          } else {
            console.log('[WS] Gladia already initialized');
          }
        }
      } else {
        console.log('[WS] Received audio chunk, size:', data.byteLength);
        // Forward PCM16 audio to Gladia - ONLY if ready
        if (state.isSttReady && state.gladiaSession) {
          try {
            state.gladiaSession.sendAudio(data);
          } catch (e) {
            console.error('[WS] Error forwarding audio to Gladia:', e);
          }
        } else {
          console.warn('[WS] ⚠️ Gladia not ready. Ready:', state.isSttReady);
        }
      }
    } catch (err) {
      console.error('[WS] Message error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Server error' }));
    }
  });

  ws.on('close', async () => {
    console.log('[Server] Client disconnected');
    await cleanupGladia();
  });

  ws.on('error', async (err) => {
    console.error('[Server] WebSocket error:', err);
    await cleanupGladia();
  });
});

app.get('*', (req, res) => {
  res.sendFile('index.html', { root: './client/dist' });
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
