import { useState, useEffect, useRef } from 'react';

export default function AgentInfoPanel({ config, updateConfig }) {
  const [showLlmSettings, setShowLlmSettings] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  
  const llmRef = useRef(null);
  const voiceRef = useRef(null);

  // Close popups when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (llmRef.current && !llmRef.current.contains(event.target)) {
        setShowLlmSettings(false);
      }
      if (voiceRef.current && !voiceRef.current.contains(event.target)) {
        setShowVoiceSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-white p-6 flex flex-col">
      {/* Agent Name - Horizontal with Stats */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <input
          type="text"
          value={config.name}
          onChange={(e) => updateConfig('name', e.target.value)}
          className="text-2xl font-bold text-gray-900 border-none focus:outline-none focus:ring-0 p-0 flex-shrink-0"
          placeholder="Agent Name"
        />
        <div className="flex items-center gap-4 text-sm flex-shrink-0">
          <div className="text-gray-600">
            <span className="font-mono text-xs">{config.agentId}</span>
          </div>
          <div className="text-green-600 font-semibold">
            {config.stats.cost}
          </div>
          <div className="text-blue-600 font-semibold">
            {config.stats.latency}
          </div>
        </div>
      </div>

      {/* Providers - Horizontal Row with Card Design */}
      <div className="mb-6">
        <div className="flex gap-2">
          {/* LLM Provider Card */}
          <div className="flex-1 relative" ref={llmRef}>
            <div className="bg-gray-50 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
              <div className="flex items-center px-2 py-2">
                <select
                  value={config.llmSettings.model}
                  onChange={(e) => updateConfig('llmSettings', {
                    ...config.llmSettings,
                    model: e.target.value
                  })}
                  className="flex-1 text-sm bg-gray-50 border-none focus:outline-none focus:ring-0 cursor-pointer font-medium pr-1"
                >
                  <option value="llama-3.3-70b">llama-3.3-70b</option>
                  <option value="llama-3.1-405b">llama-3.1-405b</option>
                  <option value="mistral-large">mistral-large</option>
                </select>
                <button
                  onClick={() => setShowLlmSettings(!showLlmSettings)}
                  className={`p-1 rounded hover:bg-gray-200 transition-colors ${showLlmSettings ? 'bg-gray-200' : ''}`}
                  title="LLM Settings"
                >
                  <span className="text-sm">⚙️</span>
                </button>
              </div>
            </div>
            
            {/* LLM Settings - Absolute positioned popup aligned to right */}
            {showLlmSettings && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-50 w-64">
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Max Tokens: {config.llmSettings.maxTokens}
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="200"
                      step="10"
                      value={config.llmSettings.maxTokens}
                      onChange={(e) => updateConfig('llmSettings', {
                        ...config.llmSettings,
                        maxTokens: parseInt(e.target.value)
                      })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Temperature: {config.llmSettings.temperature}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={config.llmSettings.temperature}
                      onChange={(e) => updateConfig('llmSettings', {
                        ...config.llmSettings,
                        temperature: parseFloat(e.target.value)
                      })}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Voice Provider Card */}
          <div className="flex-1 relative" ref={voiceRef}>
            <div className="bg-gray-50 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
              <div className="flex items-center px-2 py-2">
                <select
                  value={config.providers.voice}
                  onChange={(e) => updateConfig('providers', {
                    ...config.providers,
                    voice: e.target.value
                  })}
                  className="flex-1 text-sm bg-gray-50 border-none focus:outline-none focus:ring-0 cursor-pointer font-medium pr-1"
                >
                  <option value="cartesia-sonic-3">sonic-3</option>
                  <option value="cartesia-sonic-english">sonic-english</option>
                </select>
                <button
                  onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                  className={`p-1 rounded hover:bg-gray-200 transition-colors ${showVoiceSettings ? 'bg-gray-200' : ''}`}
                  title="Voice Settings"
                >
                  <span className="text-sm">⚙️</span>
                </button>
              </div>
            </div>
            
            {/* Voice Settings - Absolute positioned popup aligned to right */}
            {showVoiceSettings && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-50 w-64">
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Voice Character</label>
                    <select
                      value={config.speechSettings.voiceId}
                      onChange={(e) => updateConfig('speechSettings', {
                        ...config.speechSettings,
                        voiceId: e.target.value
                      })}
                      className="w-full p-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="b56c6aac-f35f-46f7-9361-e8f078cec72e">Luna (Female, Warm)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Speed: {config.speechSettings.speed}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={config.speechSettings.speed}
                      onChange={(e) => updateConfig('speechSettings', {
                        ...config.speechSettings,
                        speed: parseFloat(e.target.value)
                      })}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Transcriber Card */}
          <div className="flex-1">
            <div className="bg-gray-50 border border-gray-300 rounded-lg px-2 py-2 hover:border-gray-400 transition-colors">
              <select
                value={config.providers.transcriber}
                onChange={(e) => updateConfig('providers', {
                  ...config.providers,
                  transcriber: e.target.value
                })}
                className="w-full text-sm bg-gray-50 border-none focus:outline-none focus:ring-0 cursor-pointer font-medium"
              >
                <option value="gladia-solaria-1">solaria-1</option>
                <option value="gladia-fast">fast</option>
              </select>
            </div>
          </div>

          {/* Language Card */}
          <div className="flex-1">
            <div className="bg-gray-50 border border-gray-300 rounded-lg px-2 py-2 hover:border-gray-400 transition-colors">
              <select
                value={config.providers.language}
                onChange={(e) => updateConfig('providers', {
                  ...config.providers,
                  language: e.target.value
                })}
                className="w-full text-sm bg-gray-50 border-none focus:outline-none focus:ring-0 cursor-pointer font-medium"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* System Prompt - Takes most of the space */}
      <div className="mb-4 flex-1 flex flex-col">
        <label className="block text-xs font-medium text-gray-600 mb-2">
          System Prompt
        </label>
        <textarea
          value={config.systemPrompt}
          onChange={(e) => updateConfig('systemPrompt', e.target.value)}
          className="flex-1 p-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="Enter system prompt..."
        />
      </div>

      {/* Welcome Message - Small at bottom */}
      <div className="mb-0">
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Welcome Message
        </label>
        <input
          type="text"
          value={config.welcomeMessage}
          onChange={(e) => updateConfig('welcomeMessage', e.target.value)}
          className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="AI speaks first..."
        />
      </div>
    </div>
  );
}
