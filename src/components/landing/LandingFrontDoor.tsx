'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  Compass,
  Gamepad2,
  Heart,
  Lock,
  Moon,
  Play,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
} from 'lucide-react';
import { Badge, Button, SpotlightCard } from '@/components/ui/primitives';
import { AuraShaderDynamic, ResonanceOrbDynamic } from '@/components/webgl/DynamicWebGL';
import { KINDRED_SPRING, SNAPPY_SPRING, bentoCardVariants, bentoGridVariants } from '@/lib/motion';
import { useKindredTheme } from '@/lib/theme';

const HERO_STARTERS = [
  'Looking for slow-burn depth & travel',
  'I value humor, loyalty & Sunday pancakes',
  'Calm conflict repair & spontaneous weekend adventures',
];

const AGENT_PREVIEW_TURNS = [
  {
    speaker: 'Nova (Your Wingman)',
    tone: 'coral' as const,
    text: 'My human thrives on calm same-night conflict repair and unhurried Sunday rituals. How does Marcus handle creative friction?',
    signal: 'Emotional Rhythm · Verified',
  },
  {
    speaker: 'Atlas (Marcus’s AI)',
    tone: 'amber' as const,
    text: 'Marcus prefers a 20-minute breather followed by honest warmth—zero multi-day stonewalling. He also balances spontaneous travel with grounded routines.',
    signal: '91% Complementary Alignment',
  },
];

const PLAY_PREVIEWS = [
  {
    id: 'trip',
    label: 'Blind World-Trip Draft',
    headline: 'Kyoto Lanterns & Lisbon Espresso',
    detail: 'Both players pick hidden travel vibes before the AI reveals your blended dream itinerary.',
    badge: '2-Player Co-Op',
  },
  {
    id: 'dates',
    label: 'Bespoke Date Nights',
    headline: 'Late-Night Vinyl & Handmade Pasta',
    detail: '3 hyper-personalized date blueprints grounded in both of your conversation rhythms.',
    badge: 'Dual-Consent Studio',
  },
  {
    id: 'adventure',
    label: '3D Future Adventure',
    headline: 'Interactive Geodesic World Route',
    detail: 'Spin a 3D globe of your matched destinations with day-by-day partner balance notes.',
    badge: 'What If? Sandbox',
  },
] as const;

export function LandingFrontDoor({
  onStartWithThought,
  onStartInstantDemo,
  onEnterOnboarding,
  busy,
}: {
  onStartWithThought: (thought: string) => Promise<void>;
  onStartInstantDemo: () => void;
  onEnterOnboarding: () => void;
  busy: boolean;
}) {
  const { theme, toggleTheme } = useKindredTheme();
  const [heroDraft, setHeroDraft] = useState('');
  const [loungeTurnIdx, setLoungeTurnIdx] = useState(1);
  const [activePlayPreview, setActivePlayPreview] = useState<'trip' | 'dates' | 'adventure'>('trip');

  const handleHeroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = heroDraft.trim();
    if (!trimmed) {
      onEnterOnboarding();
      return;
    }
    await onStartWithThought(trimmed);
  };

  const selectedPlay =
    PLAY_PREVIEWS.find((p) => p.id === activePlayPreview) ?? PLAY_PREVIEWS[0];

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] text-[var(--ink-primary)]">
      {/* Sticky Floating Glass Pill Navbar */}
      <div className="sticky top-0 z-40 px-4 pt-4">
        <header className="editorial-bento mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-full px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-coral-soft)] text-[var(--accent-coral)]">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-editorial text-2xl font-normal tracking-tight text-[var(--ink-primary)]">
              KindredAI
            </span>
          </div>

          <nav aria-label="Landing sections" className="hidden items-center gap-6 text-xs font-medium text-[var(--ink-secondary)] md:flex">
            <a href="#how-it-works" className="transition hover:text-[var(--ink-primary)]">
              How It Works
            </a>
            <a href="#the-science" className="transition hover:text-[var(--ink-primary)]">
              The Science
            </a>
            <button
              type="button"
              onClick={onStartInstantDemo}
              className="transition hover:text-[var(--ink-primary)] cursor-pointer"
            >
              Live Demo
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              data-testid="theme-toggle-button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'nocturne' ? 'Editorial Alabaster' : 'Warm Nocturne'} theme`}
              className="h-8 w-8 rounded-full p-0"
            >
              {theme === 'nocturne' ? (
                <Sun className="h-4 w-4 text-[var(--accent-amber)]" />
              ) : (
                <Moon className="h-4 w-4 text-[var(--ink-secondary)]" />
              )}
            </Button>

            <Button
              size="sm"
              data-testid="nav-start-ai-button"
              onClick={onEnterOnboarding}
              className="rounded-full px-4"
            >
              <span>Start With Your AI</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </header>
      </div>

      <main className="mx-auto max-w-6xl space-y-20 px-4 pb-20 pt-8 sm:px-6 lg:pt-12">
        {/* ABOVE THE FOLD: Try Before You Sign Up Interactive Hero */}
        <section className="relative overflow-hidden rounded-[24px] border border-[var(--border-hairline)] p-6 sm:p-10 lg:p-12">
          <AuraShaderDynamic depthProgress={78} theme={theme} />

          <div className="relative z-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            {/* Left: Magnetic Editorial Copy & 10-Second Instant Entry Bar */}
            <div className="space-y-6 lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="terracotta">
                  <Sparkles className="h-3 w-3" />
                  Agent-to-Agent Dating Studio
                </Badge>
                <Badge tone="sage">
                  <Lock className="h-3 w-3" />
                  Private-by-Default AI
                </Badge>
              </div>

              <h1 className="font-editorial text-4xl leading-[1.03] font-normal text-[var(--ink-primary)] sm:text-5xl lg:text-6xl">
                Stop swiping on strangers. Let your{' '}
                <em className="italic text-[var(--accent-coral)]">AI</em> find your person.
              </h1>

              <p className="max-w-xl text-sm leading-relaxed text-[var(--ink-secondary)] sm:text-base">
                Your fiduciary AI wingman learns your real values privately, interviews other AIs on your behalf, and launches a bespoke co-op game the moment there&apos;s a genuine spark—no blank small-talk boxes, ever.
              </p>

              {/* Zero-Friction Instant Entry Box */}
              <div className="editorial-bento rounded-[24px] p-4 sm:p-5">
                <div className="mb-2.5 flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[var(--ink-primary)]">
                    Meet Your AI in 10 Seconds
                  </span>
                  <span className="text-[11px] text-[var(--ink-muted)]">
                    No sign-up wall · Try it live
                  </span>
                </div>

                <form onSubmit={handleHeroSubmit} className="flex flex-col gap-2.5 sm:flex-row">
                  <input
                    data-testid="hero-instant-input"
                    value={heroDraft}
                    onChange={(e) => setHeroDraft(e.target.value)}
                    placeholder="Share one thing that matters to you in a partner..."
                    className="flex-1 rounded-full border border-[var(--border-hairline)] bg-[var(--surface-input)] px-4 py-3 text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-coral)]/40"
                  />
                  <Button
                    type="submit"
                    data-testid="hero-instant-submit"
                    disabled={busy}
                    size="lg"
                    className="rounded-full px-6"
                  >
                    <span>{busy ? 'Opening Studio...' : 'Meet My Wingman'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>

                {/* 3 One-Click Starter Pills */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {HERO_STARTERS.map((starter, idx) => (
                    <motion.button
                      key={starter}
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      transition={SNAPPY_SPRING}
                      data-testid={`hero-starter-pill-${idx}`}
                      disabled={busy}
                      onClick={() => onStartWithThought(starter)}
                      className="rounded-full border border-[var(--border-hairline)] bg-[var(--surface-subtle)]/80 px-3.5 py-1.5 text-xs text-[var(--ink-secondary)] transition hover:border-[var(--accent-coral)]/45 hover:text-[var(--ink-primary)] cursor-pointer"
                    >
                      &ldquo;{starter}&rdquo;
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Secondary High-Visibility Instant Demo Tour CTA */}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  data-testid="instant-demo-tour-button"
                  onClick={onStartInstantDemo}
                  className="rounded-full px-6"
                >
                  <Play className="h-4 w-4 text-[var(--accent-coral)]" />
                  <span>Instant Demo Tour (No Sign-Up)</span>
                </Button>
                <span className="text-xs text-[var(--ink-muted)]">
                  6 pre-loaded AI personas · Live Agent Lounge · 3 Co-Op Games
                </span>
              </div>
            </div>

            {/* Right: Floating Glassmorphic Live Agent-to-Agent Preview Card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={KINDRED_SPRING}
              className="lg:col-span-5"
            >
              <SpotlightCard className="p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-2 border-b border-[var(--border-hairline)] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent-sage)] opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--accent-sage)]" />
                    </span>
                    <span className="text-xs font-semibold text-[var(--ink-primary)]">
                      Live Agent Lounge Preview
                    </span>
                  </div>
                  <Badge tone="sage">91% Alignment</Badge>
                </div>

                <div className="space-y-3">
                  {AGENT_PREVIEW_TURNS.map((turn, i) => (
                    <div
                      key={i}
                      className="editorial-inner-card bg-[var(--surface-elevated)]/90 p-3.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--ink-primary)]">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              turn.tone === 'coral'
                                ? 'bg-[var(--accent-coral)]'
                                : 'bg-[var(--accent-amber)]'
                            }`}
                          />
                          {turn.speaker}
                        </span>
                        <span className="font-mono-label text-[10px] text-[var(--accent-sage)]">
                          {turn.signal}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-secondary)]">
                        {turn.text}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-[var(--accent-sage)]/25 bg-[var(--accent-sage-soft)] px-3.5 py-2.5 text-[11px]">
                  <span className="flex items-center gap-1.5 font-medium text-[var(--accent-sage)]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Private to My AI · Raw vulnerabilities never shared
                  </span>
                  <span className="font-mono-label text-[10px] text-[var(--ink-muted)]">
                    Verified
                  </span>
                </div>
              </SpotlightCard>
            </motion.div>
          </div>
        </section>

        {/* BELOW THE FOLD: Interactive 3-Step Bento Showcase */}
        <section id="how-it-works" className="space-y-8">
          <div className="max-w-2xl">
            <span className="font-mono-label text-[11px] uppercase tracking-wider text-[var(--accent-coral)]">
              How KindredAI Works
            </span>
            <h2 className="font-editorial mt-2 text-3xl font-normal text-[var(--ink-primary)] sm:text-4xl">
              Three calm steps from honest reflection to a real-world spark.
            </h2>
          </div>

          <motion.div
            variants={bentoGridVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            className="grid grid-cols-1 gap-6 lg:grid-cols-3"
          >
            {/* Bento Card 1: Fiduciary AI Wingman */}
            <motion.div variants={bentoCardVariants}>
              <SpotlightCard className="flex h-full flex-col justify-between p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge tone="terracotta">01 · Your Fiduciary Wingman</Badge>
                    <Heart className="h-4 w-4 text-[var(--accent-coral)]" />
                  </div>
                  <h3 className="font-editorial text-2xl font-normal text-[var(--ink-primary)]">
                    Talk naturally. Build a living Blueprint.
                  </h3>
                  <p className="text-xs leading-relaxed text-[var(--ink-secondary)]">
                    Instead of 40 checkboxes, have a grounded dialogue. Toggle every learned insight between shareable signals and private coach notes.
                  </p>

                  <div className="space-y-2 pt-2">
                    <div className="editorial-inner-card bg-[var(--surface-elevated)]/85 p-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[var(--ink-primary)]">Conflict Repair</span>
                        <Badge tone="sage">Shareable Signal</Badge>
                      </div>
                      <p className="mt-1 text-xs text-[var(--ink-secondary)]">
                        Prefers calm same-night talk after a 20-minute breather.
                      </p>
                    </div>
                    <div className="editorial-inner-card bg-[var(--surface-elevated)]/85 p-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[var(--ink-primary)]">Past Boundary</span>
                        <Badge tone="ochre">Private to My AI</Badge>
                      </div>
                      <p className="mt-1 text-xs text-[var(--ink-secondary)]">
                        Protected server-side—guides matching without ever leaking.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEnterOnboarding}
                  className="mt-5 w-full rounded-full"
                >
                  Open Wingman Interview
                </Button>
              </SpotlightCard>
            </motion.div>

            {/* Bento Card 2: Agent-to-Agent Discovery + 3D Resonance Orb */}
            <motion.div variants={bentoCardVariants}>
              <SpotlightCard className="flex h-full flex-col justify-between p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge tone="ochre">02 · Agent-to-Agent Lounge</Badge>
                    <Bot className="h-4 w-4 text-[var(--accent-amber)]" />
                  </div>
                  <h3 className="font-editorial text-2xl font-normal text-[var(--ink-primary)]">
                    Watch two AIs test real compatibility.
                  </h3>

                  <ResonanceOrbDynamic
                    turnsVisible={loungeTurnIdx + 1}
                    totalTurns={2}
                    overallScore={91}
                    userAgentName="Nova"
                    candidateAgentName="Atlas"
                    theme={theme}
                  />

                  <div className="editorial-inner-card bg-[var(--surface-elevated)]/85 p-3">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-semibold text-[var(--ink-primary)]">
                        {AGENT_PREVIEW_TURNS[loungeTurnIdx].speaker}
                      </span>
                      <button
                        type="button"
                        onClick={() => setLoungeTurnIdx((i) => (i === 0 ? 1 : 0))}
                        className="font-mono-label text-[10px] text-[var(--accent-coral)] hover:underline cursor-pointer"
                      >
                        Toggle Turn {loungeTurnIdx + 1}/2 →
                      </button>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--ink-secondary)]">
                      {AGENT_PREVIEW_TURNS[loungeTurnIdx].text}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={onStartInstantDemo}
                  className="mt-5 w-full rounded-full"
                >
                  Explore Agent Lounge
                </Button>
              </SpotlightCard>
            </motion.div>

            {/* Bento Card 3: Play Together & Preview "What If?" */}
            <motion.div variants={bentoCardVariants}>
              <SpotlightCard className="flex h-full flex-col justify-between p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge tone="sage">03 · Co-Op Play &amp; What If?</Badge>
                    <Gamepad2 className="h-4 w-4 text-[var(--accent-sage)]" />
                  </div>
                  <h3 className="font-editorial text-2xl font-normal text-[var(--ink-primary)]">
                    Skip &ldquo;hey.&rdquo; Co-create a memory first.
                  </h3>
                  <p className="text-xs leading-relaxed text-[var(--ink-secondary)]">
                    Matched connections jump into 2-player co-op games and a dual-consent Future Studio with a 3D world globe.
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {PLAY_PREVIEWS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setActivePlayPreview(p.id)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                          activePlayPreview === p.id
                            ? 'border-[var(--accent-coral)] bg-[var(--accent-coral-soft)] text-[var(--accent-coral)]'
                            : 'border-[var(--border-hairline)] bg-[var(--surface-subtle)]/70 text-[var(--ink-secondary)]'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="editorial-inner-card bg-[var(--surface-elevated)]/90 p-4 space-y-1.5">
                    <Badge tone="neutral">{selectedPlay.badge}</Badge>
                    <p className="font-editorial text-xl text-[var(--ink-primary)]">
                      {selectedPlay.headline}
                    </p>
                    <p className="text-xs leading-relaxed text-[var(--ink-secondary)]">
                      {selectedPlay.detail}
                    </p>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={onStartInstantDemo}
                  className="mt-5 w-full rounded-full"
                >
                  <Compass className="h-3.5 w-3.5" />
                  <span>Try Live Demo Studio</span>
                </Button>
              </SpotlightCard>
            </motion.div>
          </motion.div>
        </section>

        {/* ANTI-BURNOUT TRUST & MARKETABILITY STRIP */}
        <section id="the-science" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SpotlightCard className="p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-sage)]">
                <ShieldCheck className="h-4 w-4" />
                <span>Zero Botfishing</span>
              </div>
              <h3 className="font-editorial mt-2 text-xl text-[var(--ink-primary)]">
                100% Human Voice Once Matched
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--ink-secondary)]">
                Agent-to-Agent transcripts are transparently labeled as simulations. Once two humans match, we never auto-write your messages.
              </p>
            </SpotlightCard>

            <SpotlightCard className="p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-coral)]">
                <Users className="h-4 w-4" />
                <span>3-Match Focused Cohort</span>
              </div>
              <h3 className="font-editorial mt-2 text-xl text-[var(--ink-primary)]">
                Designed to End Swipe Burnout
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--ink-secondary)]">
                Active connections are capped at 3 high-alignment matches so curiosity turns into thoughtful conversation and real dates.
              </p>
            </SpotlightCard>

            <SpotlightCard className="p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-amber)]">
                <Lock className="h-4 w-4" />
                <span>Private-by-Default AI</span>
              </div>
              <h3 className="font-editorial mt-2 text-xl text-[var(--ink-primary)]">
                Dual-Consent Locked Future Studio
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--ink-secondary)]">
                Your insecurities stay private to your Wingman, and playful &ldquo;What If?&rdquo; simulations only unlock when both humans consent.
              </p>
            </SpotlightCard>
          </div>
        </section>
      </main>
    </div>
  );
}
