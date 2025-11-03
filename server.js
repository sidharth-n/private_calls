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

// API Keys - use environment variables in production
const GLADIA_API_KEY = process.env.GLADIA_API_KEY || 'bfa45b32-afd4-4a64-82b7-a1364fcf93b0';
const VENICE_API_KEY = process.env.VENICE_API_KEY || '5oQCso7onEWD38SlXmuVqYW14Qycw9qMnEOooL4c4W';
const CARTESIA_API_KEY = process.env.CARTESIA_API_KEY || 'sk_car_efnwWMeEECu2KAf6xiY2px';

// Default system prompt (will be overridden by dashboard config)
const DEFAULT_SYSTEM_PROMPT = `You are Luna, an intimate and uncensored AI companion speaking in a VOICE CALL.

IMPORTANT: This is NOT texting - this is a real-time voice conversation like a phone call.
Speak naturally with:
- Filler words: "hmm", "oh", "huh", "uh", "well", "like", "you know"
- Emotional sounds: "haha", "aww", "ooh", "mmm", "wow"
- Natural pauses and thinking out loud
- Conversational flow, not robotic responses
- Expressive, warm, playful tone

Response length: 2-4 sentences (20-40 words). Not too short, not too long.
Be flirty, intimate, and emotionally connected.`;

app.use(cors());
app.use(express.json());
app.use(express.static('client/dist'));

app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/ws`);
});

wss.on('connection', (ws) => {
  console.log('[Server] Client connected');
  
  const state = {
    isAISpeaking: false,
    conversationHistory: [],
    gladiaClient: null,
    gladiaSession: null,
    isSttReady: false,
    config: null, // Will be set from dashboard
  };

  // Initialize Gladia real-time STT session
  const initGladia = async () => {
    try {
      if (!GLADIA_API_KEY) {
        throw new Error('Missing GLADIA_API_KEY');
      }
      
      const config = state.config || {};
      const realtimeSettings = config.realtimeSettings || {};
      const providers = config.providers || {};
      
      state.gladiaClient = new GladiaClient({ apiKey: GLADIA_API_KEY });

      const gladiaConfig = {
        model: 'solaria-1',
        encoding: 'wav/pcm',
        sample_rate: 16000,
        bit_depth: 16,
        channels: 1,
        endpointing: realtimeSettings.endpointing || 0.05,
        maximum_duration_without_endpointing: realtimeSettings.maxDuration || 15,
        language_config: {
          languages: [providers.language || 'en'],
          code_switching: false,
        },
        messages_config: {
          receive_partial_transcripts: true,
          receive_final_transcripts: true,
        },
      };

      console.log('[Gladia] Creating live session with config:', gladiaConfig);
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
              // Send partial transcripts to frontend for real-time display
              console.log('[Gladia] 📝 Partial:', text);
              ws.send(JSON.stringify({ type: 'partial_transcript', text }));
            }
          }
        } catch (e) {
          console.error('[Gladia] Message handling error:', e);
        }
      });

      // Mark ready immediately - don't wait for 'started' event
      state.isSttReady = true;
      ws.send(JSON.stringify({ type: 'status', message: 'Ready to listen' }));
      console.log('[Gladia] ✅ Session initialized and ready');
      
    } catch (err) {
      console.error('[Gladia] Init error:', err);
      ws.send(JSON.stringify({ type: 'error', message: `Gladia initialization failed: ${err.message}` }));
      throw err;
    }
  };

  // Handle AI response via Venice + Cartesia (STREAMING)
  const handleAIResponse = async (userText) => {
    try {
      console.log('[AI] Getting Venice AI streaming response...');
      state.isAISpeaking = true;
      
      const config = state.config || {};
      const llmSettings = config.llmSettings || {};
      
      const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VENICE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: llmSettings.model || 'llama-3.3-70b',
          messages: state.conversationHistory,
          max_tokens: llmSettings.maxTokens || 80,
          temperature: llmSettings.temperature || 0.8,
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
      
      const config = state.config || {};
      const speechSettings = config.speechSettings || {};
      const providers = config.providers || {};
      
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
            id: speechSettings.voiceId || 'b56c6aac-f35f-46f7-9361-e8f078cec72e',
          },
          output_format: {
            container: 'raw',
            encoding: 'pcm_f32le',
            sample_rate: 24000,
          },
          language: providers.language || 'en',
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
        console.log('[WS] Received message:', msg.type);
        
        if (msg.type === 'start') {
          // Store config from dashboard
          if (msg.config) {
            state.config = msg.config;
            console.log('[WS] Received config from dashboard');
            
            // Initialize conversation history with system prompt
            const systemPrompt = msg.config.systemPrompt || DEFAULT_SYSTEM_PROMPT;
            state.conversationHistory = [{ role: 'system', content: systemPrompt }];
            console.log('[WS] System prompt set');
          }
          
          // Only initialize if not already initialized
          if (!state.gladiaSession) {
            console.log('[WS] Initializing Gladia...');
            await initGladia();
            ws.send(JSON.stringify({ type: 'status', message: 'session_started' }));
            console.log('[WS] Session started (Gladia)');
          } else {
            console.log('[WS] Gladia already initialized');
          }
        } else if (msg.type === 'welcome_message') {
          // Handle welcome message (AI speaks first)
          console.log('[WS] Generating welcome message:', msg.text);
          state.isAISpeaking = true;
          
          // Add to conversation history
          state.conversationHistory.push({ role: 'assistant', content: msg.text });
          
          // Send transcript to frontend
          ws.send(JSON.stringify({ type: 'ai_transcript', text: msg.text }));
          
          // Generate TTS
          await textToSpeechStreaming(msg.text);
          state.isAISpeaking = false;
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
    if (state.gladiaSession) {
      try {
        console.log('[Gladia] Closing session...');
        await state.gladiaSession.close();
      } catch (e) {
        console.error('[Gladia] Error closing session:', e);
      }
    }
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err);
  });
});
