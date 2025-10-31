import { useRef, useCallback } from 'react';

export function useAudioPlayer() {
  const audioContextRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const currentSourceRef = useRef(null);

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

      // Create and play source
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      currentSourceRef.current = source;
      
      source.onended = () => {
        currentSourceRef.current = null;
        isPlayingRef.current = false;
        // Play next chunk in queue
        if (audioQueueRef.current.length > 0) {
          const nextChunk = audioQueueRef.current.shift();
          playAudioChunk(nextChunk);
        }
      };

      source.start(0);
      isPlayingRef.current = true;
      console.log('[AudioPlayer] Playing chunk');
    } catch (err) {
      console.error('[AudioPlayer] Error playing chunk:', err);
      isPlayingRef.current = false;
    }
  }, [initAudioContext]);

  const enqueueAudio = useCallback((base64Audio) => {
    if (isPlayingRef.current) {
      audioQueueRef.current.push(base64Audio);
    } else {
      playAudioChunk(base64Audio);
    }
  }, [playAudioChunk]);

  const stopPlayback = useCallback(() => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
        currentSourceRef.current = null;
      } catch (err) {
        console.error('[AudioPlayer] Error stopping:', err);
      }
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    console.log('[AudioPlayer] Stopped and cleared queue');
  }, []);

  return {
    enqueueAudio,
    stopPlayback,
    isPlaying: isPlayingRef.current,
  };
}
