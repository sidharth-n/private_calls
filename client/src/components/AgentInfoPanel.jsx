export default function AgentInfoPanel({ config, updateConfig }) {
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

      {/* Providers - Horizontal Row */}
      <div className="mb-6 flex gap-3">
        <select
          value={config.providers.llm}
          onChange={(e) => updateConfig('providers', {
            ...config.providers,
            llm: e.target.value
          })}
          className="flex-1 p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          <option value="venice-llama-3.3-70b">llama-3.3-70b</option>
          <option value="venice-llama-3.1-405b">llama-3.1-405b</option>
          <option value="venice-mistral-large">mistral-large</option>
        </select>

        <select
          value={config.providers.voice}
          onChange={(e) => updateConfig('providers', {
            ...config.providers,
            voice: e.target.value
          })}
          className="flex-1 p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          <option value="cartesia-sonic-3">sonic-3</option>
          <option value="cartesia-sonic-english">sonic-english</option>
        </select>

        <select
          value={config.providers.transcriber}
          onChange={(e) => updateConfig('providers', {
            ...config.providers,
            transcriber: e.target.value
          })}
          className="flex-1 p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          <option value="gladia-solaria-1">solaria-1</option>
          <option value="gladia-fast">fast</option>
        </select>

        <select
          value={config.providers.language}
          onChange={(e) => updateConfig('providers', {
            ...config.providers,
            language: e.target.value
          })}
          className="flex-1 p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
        </select>
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
