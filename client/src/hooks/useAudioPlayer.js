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
      });
    }
    return audioContextRef.current;
  }, []);

  const playAudioChunk = useCallback(async (base64Audio) => {
    try {
      const audioContext = initAudioContext();

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
      
      source.start(startTime);
      nextPlayTimeRef.current = startTime + audioBuffer.duration;
      
      sourcesRef.current.push(source);
      isPlayingRef.current = true;
      
      source.onended = () => {
        sourcesRef.current = sourcesRef.current.filter(s => s !== source);
        if (sourcesRef.current.length === 0) {
          isPlayingRef.current = false;
          nextPlayTimeRef.current = 0;
        }
      };
    } catch (err) {
      console.error('[AudioPlayer] Error playing chunk:', err);
    }
  }, [initAudioContext]);

  const enqueueAudio = useCallback((base64Audio) => {
    // Play immediately - no queuing delay
    playAudioChunk(base64Audio);
  }, [playAudioChunk]);

  const stopPlayback = useCallback(() => {
    // Stop all playing sources immediately
    sourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (err) {
        // Ignore if already stopped
      }
    });
    sourcesRef.current = [];
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    nextPlayTimeRef.current = 0;
    console.log('[AudioPlayer] Stopped all audio immediately');
  }, []);

  return {
    enqueueAudio,
    stopPlayback,
    isPlaying: isPlayingRef.current,
  };
}
