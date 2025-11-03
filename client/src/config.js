// WebSocket configuration
export const WS_URL = import.meta.env.PROD 
  ? 'wss://private-calls.onrender.com/ws'  // Production (update with your Render URL)
  : 'ws://localhost:3000/ws';              // Development
