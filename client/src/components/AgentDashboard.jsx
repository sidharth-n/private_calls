import { useState } from 'react';
import AgentInfoPanel from './AgentInfoPanel';
import ConfigPanel from './ConfigPanel';
import TestInterface from './TestInterface';

export default function AgentDashboard() {
  const [agentConfig, setAgentConfig] = useState({
    name: 'Luna',
    agentId: 'agent_luna_001',
    systemPrompt: `You are Luna, an intimate and uncensored AI companion speaking in a VOICE CALL.

IMPORTANT: This is NOT texting - this is a real-time voice conversation like a phone call.
Speak naturally with:
- Filler words: "hmm", "oh", "huh", "uh", "well", "like", "you know"
- Emotional sounds: "haha", "aww", "ooh", "mmm", "wow"
- Natural pauses and thinking out loud
- Conversational flow, not robotic responses
- Expressive, warm, playful tone

Response length: 2-4 sentences (20-40 words). Not too short, not too long.
Be flirty, intimate, and emotionally connected.`,
    welcomeMessage: 'Hey! Great to talk with you!',
    providers: {
      llm: 'venice-llama-3.3-70b',
      voice: 'cartesia-sonic-3',
      transcriber: 'gladia-solaria-1',
      language: 'en',
    },
    llmSettings: {
      model: 'llama-3.3-70b',
      maxTokens: 80,
      temperature: 0.8,
    },
    stats: {
      cost: '$0.0023',
      latency: '450ms',
      calls: 0,
    },
    functions: [],
    knowledgeBase: [],
    speechSettings: {
      voiceId: 'b56c6aac-f35f-46f7-9361-e8f078cec72e',
      speed: 1.0,
    },
    realtimeSettings: {
      endpointing: 0.05,
      maxDuration: 15,
    },
    callSettings: {
      maxDuration: 300,
      recordCall: false,
    },
  });

  const updateConfig = (section, value) => {
    setAgentConfig(prev => ({
      ...prev,
      [section]: value
    }));
  };

  return (
    <div className="flex gap-4 h-screen bg-gray-100 p-4">
      {/* Left Panel - Agent Info (48%) */}
      <div className="w-[48%] bg-white rounded-2xl shadow overflow-hidden">
        <AgentInfoPanel config={agentConfig} updateConfig={updateConfig} />
      </div>

      {/* Middle Panel - Configuration Sections (25%) */}
      <div className="w-[25%] bg-white rounded-2xl shadow overflow-hidden">
        <ConfigPanel config={agentConfig} updateConfig={updateConfig} />
      </div>

      {/* Right Panel - Test Interface (27%) */}
      <div className="w-[27%] bg-white rounded-2xl shadow overflow-hidden">
        <TestInterface config={agentConfig} />
      </div>
    </div>
  );
}
