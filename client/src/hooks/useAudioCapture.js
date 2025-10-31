import { useRef, useCallback } from 'react';

export function useAudioCapture(onAudioData) {
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const processorRef = useRef(null);
  const isCapturingRef = useRef(false);

  const startCapture = useCallback(async () => {
    if (isCapturingRef.current) return;

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;

      // Create audio context at 16kHz
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      
      // Create ScriptProcessor for audio chunks (deprecated but widely supported)
      // Buffer size: 4096 samples = ~256ms at 16kHz
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!isCapturingRef.current) return;

        const inputData = e.inputBuffer.getChannelData(0); // Float32Array
        
        // Convert Float32 (-1 to 1) to Int16 PCM (-32768 to 32767)
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Send binary PCM16 data
        if (onAudioData) {
          onAudioData(pcm16.buffer);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      isCapturingRef.current = true;
      console.log('[AudioCapture] Started capturing at 16kHz PCM16');
    } catch (err) {
      console.error('[AudioCapture] Error:', err);
      throw err;
    }
  }, [onAudioData]);

  const stopCapture = useCallback(() => {
    isCapturingRef.current = false;

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    console.log('[AudioCapture] Stopped');
  }, []);

  return {
    startCapture,
    stopCapture,
    isCapturing: isCapturingRef.current,
  };
}
