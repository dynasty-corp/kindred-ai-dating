# KindredAI — Vercel Deployment & Verification Handoff

## 1. Environment Variables for Vercel

Configure the following variables in **Vercel Project Settings -> Environment Variables** (all are optional—if omitted, KindredAI boots cleanly on its deterministic simulation engine and Tier 2 `/tmp` + memory store):

| Variable | Required? | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | Optional | Enables live OpenAI structured outputs (`gpt-4o-mini`) + `dall-e-3` Future Family portrait generation |
| `GEMINI_API_KEY` | Optional | Alternative live AI provider (`gemini-2.5-flash` + `imagen-3.0-generate-002`) when `OPENAI_API_KEY` is unset |
| `KINDRED_OPENAI_MODEL` | Optional | Override default OpenAI model (defaults to `gpt-4o-mini`) |
| `KINDRED_GEMINI_MODEL` | Optional | Override default Gemini model (defaults to `gemini-2.5-flash`) |
| `DATABASE_URL` | Optional | PostgreSQL connection string (Neon / Supabase / Vercel Postgres) for Tier 1 Prisma persistence |

## 2. Build & Framework Settings

- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (runs `prisma generate && next build`)
- **Install Command**: `npm install`

## 3. Live Vercel Verification Checklist

1. **Health Diagnostic**: Visit `GET /api/health` and confirm `ok: true`, `seededCount: 6`, and expected `aiMode` / `storageMode`.
2. **Stage 1 (Wingman & Privacy Controls)**: Send a confidential reflection (`Keep this strictly private`) and verify it is marked `Private` in the Relationship Blueprint sidebar.
3. **Stage 2 (Agent Lounge & Cohort Cap)**: Run Agent-to-Agent interviews across the 6 seeded demo personas; confirm `AI-to-AI Simulation Transcript` badging, >=80% threshold gating, and 3/3 Focused Cohort cap enforcement.
4. **Stage 3 (Co-Op Arena & Human Chat)**: Play Blind World-Trip Draft, 4-Turn Mystery Escape, and Vibe & Values Wavelength; confirm Human Chat preserves authentic verbatim messages.
5. **Stage 4 (Dual-Consent Future Studio)**: Click **Unlock Future Sandbox**, generate Date Night Blueprints + World Adventure, and toggle the opt-in Future Family Visualizer to verify the bespoke portrait composer.
