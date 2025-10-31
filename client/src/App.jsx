import { useState, useCallback } from 'react';
import { useAudioCapture } from './hooks/useAudioCapture';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useVoiceSocket } from './hooks/useVoiceSocket';

export default function App() {
  const [status, setStatus] = useState('Connecting...');
  const [isTalking, setIsTalking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [pendingStart, setPendingStart] = useState(false);

  // Audio player hook
  const { enqueueAudio, stopPlayback } = useAudioPlayer();

  // WebSocket hook
  const voiceSocket = useVoiceSocket({
    onStatusChange: async (msg) => {
      console.log('[App] Status changed:', msg);
      setStatus(msg);
      if (msg === 'Connected') {
        setStatus('Ready! Click "Start Talking" to begin');
      }
      if (msg === 'Ready to listen' && pendingStart) {
        console.log('[App] Server ready -> starting microphone');
        try {
          await startCapture();
          console.log('[App] Audio capture started (post-ready)');
          setIsTalking(true);
          setStatus('🎤 Listening...');
        } catch (err) {
          console.error('[App] Mic start failed:', err);
          setStatus(`Microphone error: ${err.message}`);
        } finally {
          setPendingStart(false);
        }
      }
    },
    onTranscript: (transcript) => {
      setMessages((prev) => [...prev, transcript]);
    },
    onAudioChunk: (base64Audio) => {
      enqueueAudio(base64Audio);
    },
    onInterrupt: () => {
      stopPlayback();
      setStatus('Interrupted. Listening...');
    },
  });
  
  const sendAudioData = voiceSocket?.sendAudioData;
  const sendMessage = voiceSocket?.sendMessage;

  // Audio capture hook
  const { startCapture, stopCapture } = useAudioCapture(sendAudioData);

  const handleToggleTalk = useCallback(async () => {
    if (!isTalking) {
      try {
        console.log('[App] Starting talk session...');
        // Ask server to initialize Deepgram, then wait for 'Ready to listen'
        const msg = { type: 'start', timestamp: Date.now() };
        console.log('[App] Sending start request to server:', msg);
        setPendingStart(true);
        sendMessage(msg);
      } catch (err) {
        console.error('[App] Error starting talk:', err);
        setStatus(`Microphone error: ${err.message}`);
      }
    } else {
      console.log('[App] Stopping talk session...');
      stopCapture();
      stopPlayback();
      setIsTalking(false);
      setStatus('Ready! Click "Start Talking" to begin');
      // Inform server optional stop (future)
    }
  }, [isTalking, startCapture, stopCapture, stopPlayback, sendMessage]);

  return (
    <div className="bg-gradient-to-br from-purple-600 to-indigo-800 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">🌙 Luna</h1>
          <p className="text-purple-200">Your Intimate AI Companion</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-purple-100 text-center">Your conversation will appear here...</div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-purple-500 text-white' : 'bg-white/20 text-purple-100'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-center mb-4">
          <button 
            onClick={handleToggleTalk}
            className={`px-8 py-4 text-white rounded-full font-bold text-lg hover:scale-105 transition-transform ${
              isTalking 
                ? 'bg-gradient-to-r from-red-500 to-pink-500 animate-pulse' 
                : 'bg-gradient-to-r from-purple-500 to-pink-500'
            }`}
          >
            {isTalking ? '⏸️ Stop Talking' : '🎤 Start Talking'}
          </button>
        </div>

        <div className="text-center text-white text-sm">{status}</div>
      </div>
    </div>
  );
}
