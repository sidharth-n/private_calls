import { useState, useCallback, useRef, useEffect } from 'react';
import { useAudioCapture } from './hooks/useAudioCapture';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useVoiceSocket } from './hooks/useVoiceSocket';

export default function App() {
  const [status, setStatus] = useState('Connecting...');
  const [isTalking, setIsTalking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [pendingStart, setPendingStart] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const messagesEndRef = useRef(null);

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
      if (transcript.role === 'user') {
        setIsUserSpeaking(false);
      }
    },
    onAudioChunk: (base64Audio) => {
      enqueueAudio(base64Audio);
      setIsAISpeaking(true);
    },
    onInterrupt: () => {
      stopPlayback();
      setIsAISpeaking(false);
      setStatus('Interrupted. Listening...');
    },
  });
  
  const sendAudioData = voiceSocket?.sendAudioData;
  const sendMessage = voiceSocket?.sendMessage;

  // Audio capture hook with speaking detection
  const { startCapture, stopCapture } = useAudioCapture((audioData) => {
    sendAudioData(audioData);
    setIsUserSpeaking(true);
  });

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reset AI speaking state after audio ends
  useEffect(() => {
    if (isAISpeaking) {
      const timer = setTimeout(() => setIsAISpeaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isAISpeaking]);

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

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 h-96 overflow-y-auto scroll-smooth">
          {messages.length === 0 ? (
            <div className="text-purple-100 text-center mt-32">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-lg">Your conversation will appear here...</p>
              <p className="text-sm text-purple-200 mt-2">Click "Start Talking" to begin</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideIn`}>
                  <div className={`max-w-[80%] px-5 py-3 rounded-2xl shadow-lg transition-all hover:scale-[1.02] ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                      : 'bg-white/20 backdrop-blur text-purple-50 border border-white/10'
                  }`}>
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{msg.role === 'user' ? '👤' : '🌙'}</span>
                      <span className="flex-1">{msg.text}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Audio Visualizers */}
        <div className="flex justify-center items-center gap-8 mb-6">
          {/* User Speaking Visualizer */}
          <div className="flex flex-col items-center">
            <div className={`relative w-20 h-20 rounded-full transition-all duration-300 ${
              isUserSpeaking 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50' 
                : 'bg-white/10'
            }`}>
              <div className="absolute inset-0 flex items-center justify-center text-3xl">
                👤
              </div>
              {isUserSpeaking && (
                <>
                  <div className="absolute inset-0 rounded-full bg-purple-500/30 animate-ping"></div>
                  <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-pulse"></div>
                </>
              )}
            </div>
            <span className="text-white text-xs mt-2">You</span>
          </div>

          {/* Main Control Button */}
          <button 
            onClick={handleToggleTalk}
            className={`px-10 py-5 text-white rounded-full font-bold text-xl shadow-2xl hover:scale-105 transition-all duration-300 ${
              isTalking 
                ? 'bg-gradient-to-r from-red-500 to-pink-500 animate-pulse' 
                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-purple-500/50'
            }`}
          >
            {isTalking ? '⏸️ Stop' : '🎤 Start'}
          </button>

          {/* AI Speaking Visualizer */}
          <div className="flex flex-col items-center">
            <div className={`relative w-20 h-20 rounded-full transition-all duration-300 ${
              isAISpeaking 
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/50' 
                : 'bg-white/10'
            }`}>
              <div className="absolute inset-0 flex items-center justify-center text-3xl">
                🌙
              </div>
              {isAISpeaking && (
                <>
                  <div className="absolute inset-0 rounded-full bg-indigo-500/30 animate-ping"></div>
                  <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-pulse"></div>
                </>
              )}
            </div>
            <span className="text-white text-xs mt-2">Luna</span>
          </div>
        </div>

        <div className="text-center text-white/80 text-sm bg-white/5 rounded-full px-4 py-2 inline-block mx-auto">
          {status}
        </div>
      </div>
    </div>
  );
}
