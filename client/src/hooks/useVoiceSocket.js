import { useRef, useEffect, useCallback } from 'react';
import { WS_URL } from '../config';

export function useVoiceSocket({ onStatusChange, onTranscript, onAudioChunk, onInterrupt }) {
  const wsRef = useRef(null);
  const isConnectedRef = useRef(false);
  const pendingQueueRef = useRef([]); // queue of stringified messages to send when socket opens
  
  // Store callbacks in refs to avoid recreating WebSocket on callback changes
  const onStatusChangeRef = useRef(onStatusChange);
  const onTranscriptRef = useRef(onTranscript);
  const onAudioChunkRef = useRef(onAudioChunk);
  const onInterruptRef = useRef(onInterrupt);
  
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
    onTranscriptRef.current = onTranscript;
    onAudioChunkRef.current = onAudioChunk;
    onInterruptRef.current = onInterrupt;
  });

  useEffect(() => {
    console.log('[VoiceSocket] Creating WebSocket connection to:', WS_URL);
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      isConnectedRef.current = true;
      onStatusChangeRef.current?.('Connected');
      console.log('[VoiceSocket] ✅ Connected');

      // Flush any queued messages
      if (pendingQueueRef.current.length > 0) {
        console.log('[VoiceSocket] Flushing queued messages:', pendingQueueRef.current.length);
        for (const queued of pendingQueueRef.current) {
          try {
            ws.send(queued);
          } catch (e) {
            console.error('[VoiceSocket] Failed to send queued message:', e);
          }
        }
        pendingQueueRef.current = [];
      }
    };

    ws.onmessage = (evt) => {
      // Check if binary data (audio)
      if (evt.data instanceof Blob) {
        // Handle binary audio (if needed in future)
        return;
      }

      try {
        const msg = JSON.parse(evt.data);
        console.log('[VoiceSocket] Received message:', msg.type, msg);
        
        switch (msg.type) {
          case 'status':
            onStatusChangeRef.current?.(msg.message);
            break;
          case 'partial_transcript':
            console.log('[VoiceSocket] 📝 Partial transcript:', msg.text);
            // Show partial transcript in status for real-time feedback
            onStatusChangeRef.current?.(`Listening: "${msg.text}"`);
            break;
          case 'user_transcript':
            console.log('[VoiceSocket] User transcript:', msg.text);
            onTranscriptRef.current?.({ role: 'user', text: msg.text });
            break;
          case 'ai_transcript':
            console.log('[VoiceSocket] AI transcript:', msg.text);
            onTranscriptRef.current?.({ role: 'assistant', text: msg.text });
            break;
          case 'audio':
            console.log('[VoiceSocket] Received audio chunk');
            onAudioChunkRef.current?.(msg.data);
            break;
          case 'interrupt':
            console.log('[VoiceSocket] ⚡⚡⚡ INTERRUPT RECEIVED - Stopping all audio immediately');
            onInterruptRef.current?.();
            break;
          case 'error':
            onStatusChangeRef.current?.(`Error: ${msg.message}`);
            console.error('[VoiceSocket] Error:', msg.message);
            break;
          default:
            console.log('[VoiceSocket] Unknown message:', msg);
        }
      } catch (err) {
        console.error('[VoiceSocket] Parse error:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('[VoiceSocket] Error:', err);
      onStatusChangeRef.current?.('WebSocket error');
    };

    ws.onclose = () => {
      isConnectedRef.current = false;
      onStatusChangeRef.current?.('Disconnected');
      console.log('[VoiceSocket] Closed');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []); // Empty deps - only create WebSocket once

  const sendAudioData = useCallback((audioBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[VoiceSocket] Sending audio chunk, size:', audioBuffer.byteLength);
      wsRef.current.send(audioBuffer);
    } else {
      console.warn('[VoiceSocket] Cannot send audio, WebSocket not open. State:', wsRef.current?.readyState);
    }
  }, []);

  const sendMessage = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[VoiceSocket] Sending message:', msg);
      wsRef.current.send(JSON.stringify(msg));
    } else {
      const str = JSON.stringify(msg);
      pendingQueueRef.current.push(str);
      console.warn('[VoiceSocket] Socket not open, queued message. State:', wsRef.current?.readyState);
    }
  }, []);

  return {
    sendAudioData,
    sendMessage,
    isConnected: isConnectedRef.current,
  };
}
