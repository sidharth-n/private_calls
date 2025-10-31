import { useRef, useCallback } from 'react';

export function useAudioPlayer() {
  const audioContextRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);
  const sourcesRef = useRef([]);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 24000, // Cartesia outputs 24kHz
        latencyHint: 'interactive', // ✅ OPTIMIZED: Low latency mode
      });
    }
    return audioContextRef.current;
  }, []);

  const playAudioChunk = useCallback(async (base64Audio) => {
    try {
      const audioContext = initAudioContext();
      const chunkReceiveTime = Date.now();

      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM Float32 to AudioBuffer
      const float32Array = new Float32Array(bytes.buffer);
      const audioBuffer = audioContext.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      // Schedule playback immediately or at next available time
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      const currentTime = audioContext.currentTime;
      const startTime = Math.max(currentTime, nextPlayTimeRef.current);
      const gap = startTime - currentTime;
      const duration = audioBuffer.duration;
      
      console.log(`[AudioPlayer] 🎵 Chunk #${sourcesRef.current.length + 1}:`, {
        duration: `${(duration * 1000).toFixed(0)}ms`,
        currentTime: currentTime.toFixed(2),
        scheduleAt: startTime.toFixed(2),
        gap: gap > 0 ? `${(gap * 1000).toFixed(0)}ms ahead` : 'playing now',
        queuedSources: sourcesRef.current.length,
        isPlaying: isPlayingRef.current
      });
      
      source.start(startTime);
      nextPlayTimeRef.current = startTime + audioBuffer.duration;
      
      sourcesRef.current.push(source);
      isPlayingRef.current = true;
      
      source.onended = () => {
        const remaining = sourcesRef.current.length - 1;
        if (remaining >= 0) {
          console.log(`[AudioPlayer] ✅ Chunk ended, ${remaining} remaining`);
          sourcesRef.current = sourcesRef.current.filter(s => s !== source);
          if (sourcesRef.current.length === 0) {
            isPlayingRef.current = false;
            const audioContext = audioContextRef.current;
            if (audioContext) {
              nextPlayTimeRef.current = audioContext.currentTime;
            }
            console.log('[AudioPlayer] 🏁 All chunks finished');
          }
        }
      };
    } catch (err) {
      console.error('[AudioPlayer] ❌ Error playing chunk:', err);
    }
  }, [initAudioContext]);

  const enqueueAudio = useCallback((base64Audio) => {
    console.log('[AudioPlayer] 📥 Received audio chunk, queue size:', audioQueueRef.current.length);
    // Play immediately - no queuing delay
    playAudioChunk(base64Audio);
  }, [playAudioChunk]);

  const stopPlayback = useCallback(() => {
    const sourceCount = sourcesRef.current.length;
    console.log(`[AudioPlayer] 🛑 STOP called - killing ${sourceCount} sources`);
    
    // Stop all playing sources immediately (including future-scheduled ones)
    sourcesRef.current.forEach((source, idx) => {
      try {
        source.stop(0); // Stop immediately at time 0
        source.disconnect(); // Disconnect from audio graph
        console.log(`[AudioPlayer] Killed source ${idx + 1}/${sourceCount}`);
      } catch (err) {
        // Ignore if already stopped/disconnected
      }
    });
    
    // Clear all state
    sourcesRef.current = [];
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    
    // CRITICAL: Reset the play time to current time, not 0
    // This prevents new chunks from being scheduled far in the future
    const audioContext = audioContextRef.current;
    if (audioContext) {
      nextPlayTimeRef.current = audioContext.currentTime;
      console.log(`[AudioPlayer] Reset nextPlayTime to ${audioContext.currentTime.toFixed(2)}`);
    } else {
      nextPlayTimeRef.current = 0;
    }
    
    console.log('[AudioPlayer] ✅ All audio stopped and state reset');
  }, []);

  return {
    enqueueAudio,
    stopPlayback,
    isPlaying: isPlayingRef.current,
  };
}
