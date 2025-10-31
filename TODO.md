# Voice AI Optimization Roadmap
**Target:** <600ms voice-to-voice latency
**Current Estimated:** ~1200-1500ms

## Phase 1: Quick Wins (Target: <800ms) - ✅ COMPLETED

### ✅ OPTIMIZATION #1: Aggressive Endpointing (HIGHEST IMPACT)
- **Impact:** -800 to -1200ms
- **Status:** ✅ COMPLETED
- **Changes:**
  - Reduce Gladia endpointing from 300ms to 150ms
  - Enable semantic endpointing
  - Enable partial transcripts
- **Files:** `server.js` (Gladia config)

### ✅ OPTIMIZATION #5: Reduce LLM Max Tokens
- **Impact:** -300 to -500ms
- **Status:** ✅ COMPLETED
- **Changes:**
  - Reduce max_tokens from 80 to 45
  - Update system prompt for brevity (15 words max)
- **Files:** `server.js` (Venice API call, SYSTEM_PROMPT)

### ✅ OPTIMIZATION #3: Stream LLM Responses
- **Impact:** -300 to -600ms
- **Status:** ✅ COMPLETED
- **Changes:**
  - Enable Venice streaming (`stream: true`)
  - Send sentences to TTS as they arrive
  - Don't wait for full response
- **Files:** `server.js` (handleAIResponse, textToSpeech)

### ✅ OPTIMIZATION #7: WebRTC Audio Buffer Optimization
- **Impact:** -50 to -150ms
- **Status:** ✅ COMPLETED
- **Changes:**
  - Set AudioContext `latencyHint: 'interactive'`
  - Optimize playback scheduling
- **Files:** `client/src/hooks/useAudioPlayer.js`

---

## Phase 2: Advanced (Target: <600ms) - ✅ COMPLETED

### ✅ OPTIMIZATION #2: Partial Transcript LLM Processing
- **Impact:** -200 to -500ms
- **Status:** ✅ COMPLETED
- **Changes:**
  - Start LLM on high-confidence partial transcripts (>0.85)
  - Cache preliminary responses
  - Use cached if final matches partial
- **Files:** `server.js` (Gladia message handler)

### ✅ OPTIMIZATION #8: Audio Capture Optimization
- **Impact:** -30 to -80ms
- **Status:** ✅ COMPLETED
- **Changes:**
  - Reduce ScriptProcessor buffer from 8192 to 2048
  - Send audio more frequently
  - Add `latencyHint: 'interactive'`
- **Files:** `client/src/hooks/useAudioCapture.js`

### ✅ OPTIMIZATION #10: Response Caching
- **Impact:** -200 to -500ms (for cached phrases)
- **Status:** ✅ COMPLETED
- **Changes:**
  - Pre-generate TTS for common phrases
  - Cache audio chunks in memory
  - Check cache before generating new TTS
- **Files:** `server.js` (new cache system)

### ✅ OPTIMIZATION #9: VAD-based Interruption
- **Impact:** -100 to -200ms
- **Status:** ✅ COMPLETED
- **Changes:**
  - Use Gladia speech_activity events for instant interruption
  - Don't wait for partial transcripts
- **Files:** `server.js` (Gladia message handler)

---

## Phase 3: Production Polish (Target: <500ms)

### 🔮 OPTIMIZATION #6: Fine-tune Turn Detection
- **Impact:** -100 to -300ms
- **Status:** PENDING
- **Changes:**
  - Add silence_threshold, speech_threshold
  - Set min_speech_duration_ms
  - Optimize partial_transcript_interval_ms
- **Files:** `server.js` (Gladia config)

### 🔮 OPTIMIZATION #11: Network Compression
- **Impact:** -20 to -50ms
- **Status:** PENDING
- **Changes:**
  - Enable WebSocket perMessageDeflate
  - Use binary frames for audio (not Base64)
- **Files:** `server.js` (WebSocket server), `client/src/hooks/useVoiceSocket.js`

### 🔮 OPTIMIZATION #12: Faster LLM Model
- **Impact:** -100 to -200ms
- **Status:** PENDING
- **Changes:**
  - Test `llama-3.1-8b` vs `llama-3.3-70b`
  - A/B test for quality vs speed
- **Files:** `server.js` (Venice API call)

### 🔮 Performance Monitoring
- **Status:** PENDING
- **Changes:**
  - Add latency tracking for each pipeline stage
  - Log metrics to console
  - Display latency in UI
- **Files:** `server.js`, `client/src/App.jsx`

---

## Implementation Order

**Week 1 (Days 1-3):**
1. Optimization #1 (Endpointing) - Day 1
2. Optimization #5 (Max Tokens) - Day 1
3. Optimization #3 (Streaming) - Day 2
4. Optimization #7 (Audio Buffer) - Day 3

**Week 2 (Days 4-7):**
5. Optimization #2 (Partial Transcripts) - Day 4
6. Optimization #8 (Audio Capture) - Day 5
7. Optimization #10 (Caching) - Day 6
8. Optimization #9 (VAD Interruption) - Day 7

**Week 3 (Days 8-10):**
9. Optimization #6 (Turn Detection) - Day 8
10. Optimization #11 (Network) - Day 9
11. Optimization #12 (Model Testing) - Day 9
12. Performance Monitoring - Day 10

---

## Expected Results

| Phase | Target Latency | Completion |
|-------|----------------|------------|
| Current | ~1200-1500ms | - |
| Phase 1 | <800ms | ✅ 100% |
| Phase 2 | <600ms | ✅ 100% |
| Phase 3 | <500ms | 0% |

---

## Notes

- Test each optimization individually before moving to next
- Measure latency before/after each change
- Don't break existing functionality
- Keep voice quality high (don't sacrifice for speed)
