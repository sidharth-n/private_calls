import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const ConfigSection = ({ title, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <span className="text-sm font-medium text-gray-800">{title}</span>
        </div>
        {isOpen ? (
          <ChevronDownIcon className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRightIcon className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="p-3 bg-gray-50 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
};

export default function ConfigPanel({ config, updateConfig }) {
  return (
    <div className="bg-white h-full overflow-y-auto">
      <ConfigSection title="LLM Settings" icon="🤖" defaultOpen={false}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Model
            </label>
            <select
              value={config.llmSettings.model}
              onChange={(e) => updateConfig('llmSettings', {
                ...config.llmSettings,
                model: e.target.value
              })}
              className="w-full p-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="llama-3.3-70b">llama-3.3-70b</option>
              <option value="llama-3.1-405b">llama-3.1-405b</option>
              <option value="mistral-large">mistral-large</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
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
            <p className="text-xs text-gray-500 mt-1">
              Response length (20-40 words recommended)
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
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
            <p className="text-xs text-gray-500 mt-1">
              Higher = more creative
            </p>
          </div>
        </div>
      </ConfigSection>

      <ConfigSection title="Functions" icon="⚡" defaultOpen={false}>
        <p className="text-xs text-gray-600 mb-2">
          Add custom functions for your agent to call during conversations
        </p>
        <button className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs">
          + Add Function
        </button>
      </ConfigSection>

      <ConfigSection title="Knowledge Base" icon="📚" defaultOpen={false}>
        <p className="text-xs text-gray-600 mb-2">
          Upload documents or add URLs for your agent to reference
        </p>
        <button className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs">
          + Add Knowledge
        </button>
      </ConfigSection>

      <ConfigSection title="Speech Settings" icon="🎙️" defaultOpen={false}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Voice ID
            </label>
            <input
              type="text"
              value={config.speechSettings.voiceId}
              onChange={(e) => updateConfig('speechSettings', {
                ...config.speechSettings,
                voiceId: e.target.value
              })}
              className="w-full p-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              placeholder="Voice ID"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
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
      </ConfigSection>

      <ConfigSection title="Realtime Transcription" icon="⚡" defaultOpen={false}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Endpointing: {config.realtimeSettings.endpointing}s
            </label>
            <input
              type="range"
              min="0.01"
              max="1"
              step="0.01"
              value={config.realtimeSettings.endpointing}
              onChange={(e) => updateConfig('realtimeSettings', {
                ...config.realtimeSettings,
                endpointing: parseFloat(e.target.value)
              })}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Lower = faster interruption
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Max Duration: {config.realtimeSettings.maxDuration}s
            </label>
            <input
              type="range"
              min="5"
              max="60"
              step="1"
              value={config.realtimeSettings.maxDuration}
              onChange={(e) => updateConfig('realtimeSettings', {
                ...config.realtimeSettings,
                maxDuration: parseInt(e.target.value)
              })}
              className="w-full"
            />
          </div>
        </div>
      </ConfigSection>

      <ConfigSection title="Call Settings" icon="📞" defaultOpen={false}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Max Call Duration: {Math.floor(config.callSettings.maxDuration / 60)}m
            </label>
            <input
              type="range"
              min="60"
              max="1800"
              step="60"
              value={config.callSettings.maxDuration}
              onChange={(e) => updateConfig('callSettings', {
                ...config.callSettings,
                maxDuration: parseInt(e.target.value)
              })}
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recordCall"
              checked={config.callSettings.recordCall}
              onChange={(e) => updateConfig('callSettings', {
                ...config.callSettings,
                recordCall: e.target.checked
              })}
              className="w-3 h-3 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="recordCall" className="text-xs text-gray-700">
              Record conversation
            </label>
          </div>
        </div>
      </ConfigSection>

      <ConfigSection title="Post-Call Analysis" icon="📊" defaultOpen={false}>
        <p className="text-xs text-gray-600">
          Configure post-call analytics and insights
        </p>
      </ConfigSection>

      <ConfigSection title="Security & Fallback" icon="🔒" defaultOpen={false}>
        <p className="text-xs text-gray-600">
          Configure security policies and fallback behaviors
        </p>
      </ConfigSection>

      <ConfigSection title="Webhook Settings" icon="🔗" defaultOpen={false}>
        <p className="text-xs text-gray-600 mb-2">
          Configure webhooks for call events
        </p>
        <button className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs">
          + Add Webhook
        </button>
      </ConfigSection>

      <ConfigSection title="MCPs" icon="🔌" defaultOpen={false}>
        <p className="text-xs text-gray-600">
          Model Context Protocol integrations
        </p>
      </ConfigSection>
    </div>
  );
}
