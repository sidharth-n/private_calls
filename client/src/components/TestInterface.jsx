import { useState, useCallback, useEffect } from 'react';
import { useAudioCapture } from '../hooks/useAudioCapture';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useVoiceSocket } from '../hooks/useVoiceSocket';

export default function TestInterface({ config }) {
  const [isTesting, setIsTesting] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [pendingStart, setPendingStart] = useState(false);

  const { enqueueAudio, stopPlayback } = useAudioPlayer();

  const voiceSocket = useVoiceSocket({
    onStatusChange: async (msg) => {
      setStatus(msg);
      if (msg === 'Ready to listen' && pendingStart) {
        try {
          await startCapture();
          setIsTesting(true);
          setStatus('🎤 Listening...');
          
          // Send welcome message if configured
          if (config.welcomeMessage && config.welcomeMessage.trim()) {
            console.log('[Test] Sending welcome message request');
            sendMessage({ 
              type: 'welcome_message', 
              text: config.welcomeMessage 
            });
          }
        } catch (err) {
          setStatus(`Microphone error: ${err.message}`);
        } finally {
          setPendingStart(false);
        }
      }
    },
    onTranscript: (transcript) => {
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
      setStatus('⚡ Interrupted - Listening...');
    },
  });

  const sendAudioData = voiceSocket?.sendAudioData;
  const sendMessage = voiceSocket?.sendMessage;

  const { startCapture, stopCapture } = useAudioCapture((audioData) => {
    sendAudioData(audioData);
    setIsUserSpeaking(true);
  });

  useEffect(() => {
    if (isAISpeaking) {
      const timer = setTimeout(() => setIsAISpeaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isAISpeaking]);

  const handleTest = useCallback(async () => {
    if (!isTesting) {
      console.log('[Test] Starting test with config:', config);
      
      // Send config to backend
      const startMessage = { 
        type: 'start', 
        timestamp: Date.now(),
        config: {
          systemPrompt: config.systemPrompt,
          welcomeMessage: config.welcomeMessage,
          providers: config.providers,
          llmSettings: config.llmSettings,
          speechSettings: config.speechSettings,
          realtimeSettings: config.realtimeSettings,
        }
      };
      
      setPendingStart(true);
      sendMessage(startMessage);
    } else {
      stopCapture();
      stopPlayback();
      setIsTesting(false);
      setStatus('Ready');
    }
  }, [isTesting, stopCapture, stopPlayback, sendMessage, config]);

  return (
    <div className="bg-white p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Test your agent</h3>
        <div className="flex gap-1">
          <button className="px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-1">
            🎧 Audio
          </button>
          <button className="px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-1">
            💬 Chat
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center flex-1">
        {/* Microphone Visualizer */}
        <div className="relative mb-4">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
            isUserSpeaking 
              ? 'bg-blue-500 shadow-lg shadow-blue-500/50' 
              : isTesting
              ? 'bg-gray-200'
              : 'bg-gray-100'
          }`}>
            <svg 
              className="w-12 h-12 text-white" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </div>
          {isUserSpeaking && (
            <>
              <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping"></div>
              <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-pulse"></div>
            </>
          )}
          {isAISpeaking && (
            <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
              <span className="text-xl">🌙</span>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="text-center mb-4">
          <p className="text-xs text-gray-600">{status}</p>
        </div>

        {/* Test Button */}
        <button
          onClick={handleTest}
          className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
            isTesting
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isTesting ? 'Stop Test' : 'Test'}
        </button>
      </div>
    </div>
  );
}
