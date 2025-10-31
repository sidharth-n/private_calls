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

app.use(cors());
app.use(express.json());
app.use(express.static('client/dist'));

app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

wss.on('connection', (ws) => {
  console.log('[Server] Client connected');
  
  const state = {
    isAISpeaking: false,
    conversationHistory: [{ role: 'system', content: SYSTEM_PROMPT }],
    gladiaClient: null,
    gladiaSession: null,
    isSttReady: false,
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
        endpointing: 0.3, // 300ms silence detection for fast response
        maximum_duration_without_endpointing: 5, // Min 5 seconds required
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
          
          if (message?.type === 'transcript') {
            const isFinal = message?.data?.is_final;
            const text = message?.data?.utterance?.text || '';
            
            // Interruption detection: if user speaks while AI is speaking
            if (!isFinal && text.length > 0 && state.isAISpeaking) {
              console.log('[Gladia] 🛑 User interrupted AI with partial:', text);
              state.isAISpeaking = false;
              ws.send(JSON.stringify({ type: 'interrupt', message: 'User interrupted' }));
            }
            
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

  // Handle AI response via Venice + Cartesia
  const handleAIResponse = async (userText) => {
    try {
      console.log('[AI] Getting Venice AI response...');
      // Call Venice AI
      const aiResponse = await getVeniceResponse();
      if (!aiResponse) {
        console.error('[AI] No response from Venice');
        return;
      }

      console.log('[AI] ✅ Venice response:', aiResponse);
      ws.send(JSON.stringify({ type: 'ai_transcript', text: aiResponse }));
      console.log('[AI] Sent AI transcript to frontend');

      // Add to conversation history
      state.conversationHistory.push({ role: 'assistant', content: aiResponse });

      // Convert to speech via Cartesia
      console.log('[AI] Converting to speech via Cartesia...');
      state.isAISpeaking = true;
      await textToSpeech(aiResponse);
      state.isAISpeaking = false;
      console.log('[AI] ✅ Speech generation complete');
    } catch (err) {
      console.error('[AI Response] Error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'AI response failed' }));
    }
  };

  // Venice AI streaming
  const getVeniceResponse = async () => {
    try {
      const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VENICE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b',
          messages: state.conversationHistory,
          max_tokens: 80, // Shorter for faster response
          temperature: 0.8,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Venice API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (err) {
      console.error('[Venice] Error:', err);
      return null;
    }
  };

  // Cartesia TTS
  const textToSpeech = async (text) => {
    try {
      const response = await fetch('https://api.cartesia.ai/tts/sse', {
        method: 'POST',
        headers: {
          'X-API-Key': CARTESIA_API_KEY,
          'Cartesia-Version': '2024-06-10',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_id: 'sonic-3', // Faster model
          transcript: text,
          voice: {
            mode: 'id',
            id: 'a0e99841-438c-4a64-b679-ae501e7d6091',
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

      for await (const chunk of reader) {
        // Check if interrupted
        if (!state.isAISpeaking) {
          console.log('[Cartesia] TTS interrupted, stopping');
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
                // Send audio chunk immediately
                ws.send(JSON.stringify({
                  type: 'audio',
                  data: data.data,
                }));
              } else if (data.type === 'done') {
                console.log('[Cartesia] TTS complete');
                break;
              }
            } catch (e) {
              // Skip parse errors
            }
          }
        }
      }
    } catch (err) {
      console.error('[Cartesia] Error:', err);
    }
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
