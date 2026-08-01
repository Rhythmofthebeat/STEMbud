# MIS STEMbud

AI-powered STEM homework helper built with React + TypeScript (Vite) frontend and Express + TypeScript backend.

## Stack

- **Frontend**: React 18, TypeScript, Vite (port 5000 in dev)
- **Backend**: Express 4, TypeScript, tsx (port 3001 in dev, $PORT in production)
- **AI**: OpenAI Responses API (`client.responses.create`) with file_search tool
- **Storage**: OpenAI Vector Store (corpus pre-loaded, ID in `config.json`)
- **Auth & data**: Supabase (email/password auth, Postgres for achievements + chat history). Project URL and publishable key are hardcoded in `src/lib/supabase.ts` / `server.ts`, safe to expose, access is enforced entirely by Postgres RLS policies (see `supabase/migrations/`). `/api/chat` and `/api/upload` reject any request without a valid Supabase session token.

## Setup

### Required secrets (Replit Secrets)
- `OPENAI_API_KEY`, your OpenAI API key

### Required config
Edit `config.json` and replace `YOUR_VECTOR_STORE_ID_HERE` with your actual OpenAI Vector Store ID (find it in the OpenAI dashboard under Storage → Vector Stores):

```json
{
  "assistant_name": "STEMMY",
  "assistant_instructions": "...",
  "vector_store_id": "vs_xxxxxxxxxxxxxxxx",
  "model": "gpt-4o-mini"
}
```

## Running

### Development
```
npm run dev
```
Runs Vite (port 5000, user-facing) + Express API (port 3001) concurrently. Vite proxies `/api` to Express.

### Production
```
npm run build        # builds React app into dist/
NODE_ENV=production npx tsx server.ts   # serves dist/ + API on $PORT
```

## Features

- 🔐 Email/password sign-up & sign-in (Supabase Auth), gating the whole app
- 💬 Streaming chat responses via SSE, persisted per-user and restored on login
- 📝 One-click quiz generation targeting topics the student struggled with
- 📚 Expandable source citations from the vector store
- 📎 User file uploads (PDF, txt, docx, md) scoped per conversation
- 🌙 Light / dark mode (auto-detects system preference)
- 🏅 Achievement badges based on time spent learning, synced to your account
- 💡 Suggested starter questions on the welcome screen

## Achievement Badges

| Badge | Requirement |
|-------|-------------|
| 🌱 Newcomer | Send first message |
| ⚡ Quick Learner | 5 minutes |
| 🔬 STEM Explorer | 15 minutes |
| 🧠 Deep Thinker | 30 minutes |
| 🚀 STEM Champion | 60 minutes |
| 💎 STEM Master | 120 minutes |

## User Preferences

- Keep `config.json` as the single source of truth for the assistant name, instructions, model, and vector store ID.
- Never hardcode the OpenAI API key, always read from `process.env.OPENAI_API_KEY`.
- Use the OpenAI Responses API (`client.responses.create`), not the deprecated Assistants API.
