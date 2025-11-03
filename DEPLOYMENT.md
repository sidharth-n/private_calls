# Deployment Guide - uvox ai

## Quick Deploy (5 minutes)

### 1. Deploy Backend to Render.com

1. Go to [render.com](https://render.com) and sign up (free)
2. Click "New +" → "Web Service"
3. Connect your GitHub repo: `sidharth-n/private_calls`
4. Render will auto-detect `render.yaml`
5. Click "Create Web Service"
6. **Copy your backend URL**: `https://uvox-backend.onrender.com`

### 2. Update Frontend WebSocket URL

Edit `client/src/hooks/useVoiceSocket.js`:
```javascript
// Change this line:
const ws = new WebSocket('ws://localhost:3000/ws');

// To your Render URL:
const ws = new WebSocket('wss://uvox-backend.onrender.com/ws');
```

Commit and push:
```bash
git add .
git commit -m "Update WebSocket URL for production"
git push
```

### 3. Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up
2. Click "Add New..." → "Project"
3. Import `sidharth-n/private_calls`
4. Vercel auto-detects settings from `vercel.json`
5. Click "Deploy"
6. **Your site is live!** `https://uvox-ai.vercel.app`

## Keep Backend Awake During Demo

Render free tier sleeps after 15 min. To keep it awake:

**Option 1: Use UptimeRobot (Free)**
- Sign up at [uptimerobot.com](https://uptimerobot.com)
- Add monitor: `https://uvox-backend.onrender.com/health`
- Pings every 5 minutes → stays awake

**Option 2: Manual ping before demo**
```bash
curl https://uvox-backend.onrender.com/health
```

## Your Live URLs

- **Landing Page**: `https://uvox-ai.vercel.app`
- **Dashboard**: `https://uvox-ai.vercel.app/dashboard`
- **Backend API**: `https://uvox-backend.onrender.com`

## Environment Variables (if needed)

On Render dashboard, add:
- `GLADIA_API_KEY`
- `VENICE_API_KEY`
- `CARTESIA_API_KEY`

(Currently hardcoded in server.js - move to env vars for production)

## Troubleshooting

**WebSocket not connecting?**
- Check browser console for errors
- Verify backend URL is correct
- Ensure using `wss://` (not `ws://`) for production

**Backend sleeping?**
- First request takes ~30s to wake up
- Use UptimeRobot to keep it awake

**Build failing?**
- Check Node version (use 18.x or 20.x)
- Verify all dependencies in package.json
