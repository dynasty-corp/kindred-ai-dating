# KindredAI

An **Agent-to-Agent AI Dating & Shared-Experience Platform** engineered for zero-friction deployment on **Vercel**.

## Core 4-Stage Lifecycle

1. **Personal AI Onboarding & Live Relationship Blueprint** (`/api/onboarding`)
   - Adaptive, anti-parasocial **Fiduciary Wingman** coach that extracts insights across 8 dimensions (`coreValues`, `attachmentStyle`, `conflictResolution`, `humorStyle`, `lifestyleRhythm`, `relationshipGoals`, `dealbreakers`, `unspokenPreferences`).
   - Live **Relationship Blueprint** sidebar with inline editing, `Shareable` / `Private` visibility toggles, and instant redaction.
2. **Privacy-Safe Agent Lounge & Compatibility Dossier** (`/api/agent-match`)
   - Server-side `buildShareableAgentPacket` + `verifyZeroPrivacyLeak` strips `private`/`redacted` insights, `email`, and raw private turns before any Agent-to-Agent dialogue.
   - Stylized `AI-to-AI Simulation Transcript` playback + explainable 4-pillar Compatibility Dossier (`Values`, `Emotional Rhythm`, `Lifestyle`, `Playfulness`) and a **3-slot Focused Cohort cap**.
3. **2-Player Co-Op Game Arena + Authentic Human Chat** (`/api/coop-game`)
   - **Blind World-Trip Draft**, **4-Turn Co-Op Mystery Escape**, and **Vibe & Values Wavelength**.
   - **Human Chat Drawer** preserves 100% authentic human voice with zero AI ghostwriting.
4. **Consent-Gated "What If?" Relationship Studio** (`/api/simulate-future`)
   - Enforces AI sufficiency (`>=60%` onboarding depth) and mutual **Unlock Future Sandbox** consent.
   - Generates **Bespoke Date Night Blueprints** (3 concepts), **Around-the-World Adventure Simulator**, and an opt-in **Future Family & Kids Visualizer** with bespoke editorial SVG portrait composition (`ai_image_api` when configured, `svg_canvas_composer` fallback always).

## Local Development

```bash
npm install
npm run dev
```

See [docs/VERCEL_HANDOFF.md](docs/VERCEL_HANDOFF.md) for Vercel environment variables and live verification steps.
