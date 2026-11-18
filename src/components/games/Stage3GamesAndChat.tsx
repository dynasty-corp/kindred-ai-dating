'use client';

import { useState } from 'react';
import * as RadioGroup from '@radix-ui/react-radio-group';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Compass,
  Gamepad2,
  KeyRound,
  MessageCircleHeart,
  Radio,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { AvatarPortrait } from '@/components/ui/AvatarPortrait';
import { Badge, Button, RadialScoreRing, Slider, SpotlightCard } from '@/components/ui/primitives';
import { KINDRED_SPRING, SNAPPY_SPRING } from '@/lib/motion';
import type {
  BlindTripPick,
  CoopGameMode,
  CoopGameSession,
  MatchDossier,
  SanitizedCandidate,
} from '@/lib/types/schemas';
import { formatTimestamp } from '@/lib/utils';

const CONFETTI_PARTICLES = [
  { x: -110, y: -70, rotate: -28, color: 'var(--accent-coral)' },
  { x: -70, y: -95, rotate: 22, color: 'var(--accent-amber)' },
  { x: -24, y: -110, rotate: -14, color: 'var(--accent-sage)' },
  { x: 26, y: -108, rotate: 18, color: 'var(--accent-coral)' },
  { x: 74, y: -92, rotate: -26, color: 'var(--accent-sage)' },
  { x: 112, y: -66, rotate: 32, color: 'var(--accent-amber)' },
];

function MicroConfettiBurst() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative flex h-0 w-full items-center justify-center overflow-visible"
    >
      {CONFETTI_PARTICLES.map((p, idx) => (
        <motion.span
          key={idx}
          initial={{ opacity: 0.95, x: 0, y: 0, scale: 0.5, rotate: 0 }}
          animate={{ opacity: 0, x: p.x, y: p.y, scale: 1.15, rotate: p.rotate }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: idx * 0.03 }}
          className="absolute h-2.5 w-2.5 rounded-sm"
          style={{ backgroundColor: p.color }}
        />
      ))}
    </div>
  );
}

export function Stage3GamesAndChat({
  currentUserId,
  activeMatches,
  candidates,
  selectedMatchId,
  sessions,
  onSelectMatch,
  onStartGame,
  onSubmitBlindTrip,
  onSubmitMysteryChoice,
  onSubmitWavelengthGuess,
  onSendHumanChat,
  onGoToFutureStudio,
  busy,
  error,
}: {
  currentUserId: string;
  activeMatches: MatchDossier[];
  candidates: SanitizedCandidate[];
  selectedMatchId: string | null;
  sessions: CoopGameSession[];
  onSelectMatch: (matchId: string) => void;
  onStartGame: (matchId: string, mode: CoopGameMode, restart?: boolean) => Promise<void>;
  onSubmitBlindTrip: (matchId: string, pick: BlindTripPick) => Promise<void>;
  onSubmitMysteryChoice: (matchId: string, choiceId: string) => Promise<void>;
  onSubmitWavelengthGuess: (matchId: string, guess: number) => Promise<void>;
  onSendHumanChat: (matchId: string, message: string) => Promise<void>;
  onGoToFutureStudio: () => void;
  busy: boolean;
  error: string | null;
}) {
  const activeMatch =
    activeMatches.find((m) => m.id === selectedMatchId) ?? activeMatches[0] ?? null;

  const [mode, setMode] = useState<CoopGameMode>('blind_trip_draft');
  const [chatCollapsed, setChatCollapsed] = useState(false);

  // Blind trip form state
  const [budget, setBudget] = useState<BlindTripPick['budget']>('balanced_local');
  const [pace, setPace] = useState<BlindTripPick['pace']>('slow_mornings');
  const [vibe, setVibe] = useState<BlindTripPick['vibe']>('culinary_markets');
  const [wildcard, setWildcard] = useState('Midnight gelato walk by the river');

  // Mystery choice state
  const [selectedMysteryChoice, setSelectedMysteryChoice] = useState<string>('');

  // Wavelength state
  const [wavelengthGuess, setWavelengthGuess] = useState<number>(65);

  // Authentic Human Chat state
  const [chatDraft, setChatDraft] = useState('');

  if (!activeMatch) {
    return (
      <SpotlightCard className="p-10 text-center">
        <Gamepad2 className="mx-auto h-10 w-10 text-[var(--accent-coral)]" />
        <h2 className="font-editorial mt-3 text-3xl font-normal text-[var(--ink-primary)]">
          No Active Cohort Connections Yet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--ink-secondary)]">
          Head to the <strong>Agent Lounge</strong>, run an Agent-to-Agent interview, and accept an 80%+ match into your Focused Cohort to unlock 2-Player Co-Op Games and Authentic Human Chat.
        </p>
      </SpotlightCard>
    );
  }

  const partnerId =
    activeMatch.userAId === currentUserId ? activeMatch.userBId : activeMatch.userAId;
  const partner = candidates.find((c) => c.id === partnerId);
  const currentSession = sessions.find(
    (s) => s.matchId === activeMatch.id && s.mode === mode,
  );

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatDraft.trim() || busy) return;
    const text = chatDraft;
    setChatDraft('');
    await onSendHumanChat(activeMatch.id, text);
  };

  const gameModes: Array<{ id: CoopGameMode; label: string; icon: React.ReactNode }> = [
    { id: 'blind_trip_draft', label: 'Blind World-Trip Draft', icon: <Compass className="h-3.5 w-3.5" /> },
    { id: 'coop_mystery_escape', label: 'Co-Op Mystery Escape', icon: <KeyRound className="h-3.5 w-3.5" /> },
    { id: 'vibe_values_wavelength', label: 'Vibe & Values Wavelength', icon: <Radio className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Match Selector Bar */}
      <SpotlightCard className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-3">
          {partner && (
            <AvatarPortrait config={partner.avatarConfig} name={partner.displayName} size={42} />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--ink-primary)]">
                Playing with {partner?.displayName ?? partnerId}
              </span>
              <Badge tone="sage">{activeMatch.overallScore}% Cohort Match</Badge>
            </div>
            <p className="text-xs text-[var(--ink-secondary)]">
              Shared anchors: {activeMatch.sharedInterests.join(', ') || 'Complementary curiosity'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeMatches.length > 1 && (
            <select
              value={activeMatch.id}
              onChange={(e) => onSelectMatch(e.target.value)}
              className="h-9 rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-elevated)] px-3 text-xs font-medium text-[var(--ink-primary)]"
            >
              {activeMatches.map((m) => {
                const pid = m.userAId === currentUserId ? m.userBId : m.userAId;
                const p = candidates.find((c) => c.id === pid);
                return (
                  <option key={m.id} value={m.id}>
                    {p?.displayName ?? pid} ({m.overallScore}%)
                  </option>
                );
              })}
            </select>
          )}
          <Button variant="secondary" size="sm" onClick={onGoToFutureStudio}>
            Continue to Stage 4: What-If Studio
          </Button>
        </div>
      </SpotlightCard>

      {error && (
        <div className="rounded-2xl border border-[var(--accent-danger)]/35 bg-[var(--accent-danger-soft)] px-4 py-3 text-sm text-[var(--accent-danger)]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Game-Show-Grade Co-Op Arena */}
        <SpotlightCard
          className={`p-5 sm:p-6 ${chatCollapsed ? 'lg:col-span-12' : 'lg:col-span-7'}`}
        >
          {/* Mode Switcher with layoutId pill */}
          <div className="flex flex-wrap gap-1.5 rounded-2xl border border-[var(--border-hairline)] bg-[var(--surface-subtle)]/75 p-1.5">
            {gameModes.map((gm) => {
              const active = mode === gm.id;
              return (
                <button
                  key={gm.id}
                  type="button"
                  data-testid={`mode-tab-${gm.id}`}
                  onClick={() => setMode(gm.id)}
                  className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    active ? 'text-white' : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="coop-mode-pill"
                      transition={SNAPPY_SPRING}
                      className="absolute inset-0 rounded-xl bg-[var(--accent-coral)] shadow-sm"
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    {gm.icon}
                    <span>{gm.label}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {!currentSession ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-hairline)] bg-[var(--accent-coral-soft)] text-[var(--accent-coral)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="font-editorial text-3xl font-normal text-[var(--ink-primary)]">
                {mode === 'blind_trip_draft'
                  ? 'Blind World-Trip Draft'
                  : mode === 'coop_mystery_escape'
                    ? '4-Turn Co-Op Mystery Escape'
                    : 'Vibe & Values Wavelength'}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[var(--ink-secondary)]">
                {mode === 'blind_trip_draft'
                  ? 'Each player submits hidden travel picks (budget, pace, vibe, wildcard) before the AI flips and reveals your blended dream itinerary.'
                  : mode === 'coop_mystery_escape'
                    ? 'A 4-turn interactive story puzzle tailored to your shared interests where both players must reach consensus.'
                    : 'Guess how your match answered onboarding-grounded spectrum prompts to measure real attunement.'}
              </p>
              <Button
                className="mt-6"
                data-testid="start-coop-game-button"
                disabled={busy}
                onClick={() => onStartGame(activeMatch.id, mode)}
              >
                <Gamepad2 className="h-4 w-4" />
                Start Co-Op Game
              </Button>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              {/* MODE 1: Blind World-Trip Draft */}
              {mode === 'blind_trip_draft' && currentSession.blindTripState && (
                <div data-testid="blind-trip-board" className="space-y-4">
                  <AnimatePresence mode="wait">
                    {!currentSession.blindTripState.revealed ? (
                      <motion.div
                        key="blind-trip-pick"
                        initial={{ opacity: 0, rotateX: -8 }}
                        animate={{ opacity: 1, rotateX: 0 }}
                        exit={{ opacity: 0, rotateX: 12 }}
                        transition={KINDRED_SPRING}
                        className="space-y-4"
                      >
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">
                            Budget Tier
                          </p>
                          <RadioGroup.Root
                            value={budget}
                            onValueChange={(v) => setBudget(v as BlindTripPick['budget'])}
                            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                          >
                            {[
                              ['boutique_splurge', 'Boutique Splurge'],
                              ['balanced_local', 'Balanced Local'],
                              ['backpacker_hidden_gems', 'Hidden Gems'],
                            ].map(([val, label]) => (
                              <RadioGroup.Item
                                key={val}
                                value={val}
                                className={`rounded-2xl border px-3 py-2.5 text-xs font-semibold transition cursor-pointer ${
                                  budget === val
                                    ? 'border-[var(--accent-coral)] bg-[var(--accent-coral-soft)] text-[var(--accent-coral)] shadow-xs'
                                    : 'border-[var(--border-hairline)] bg-[var(--surface-elevated)]/70 text-[var(--ink-secondary)] hover:border-[var(--border-strong)]'
                                }`}
                              >
                                {label}
                              </RadioGroup.Item>
                            ))}
                          </RadioGroup.Root>
                        </div>

                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">
                            Daily Rhythm
                          </p>
                          <RadioGroup.Root
                            value={pace}
                            onValueChange={(v) => setPace(v as BlindTripPick['pace'])}
                            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                          >
                            {[
                              ['slow_mornings', 'Slow Mornings'],
                              ['balanced_flow', 'Balanced Flow'],
                              ['dawn_to_dusk', 'Dawn to Dusk'],
                            ].map(([val, label]) => (
                              <RadioGroup.Item
                                key={val}
                                value={val}
                                className={`rounded-2xl border px-3 py-2.5 text-xs font-semibold transition cursor-pointer ${
                                  pace === val
                                    ? 'border-[var(--accent-coral)] bg-[var(--accent-coral-soft)] text-[var(--accent-coral)] shadow-xs'
                                    : 'border-[var(--border-hairline)] bg-[var(--surface-elevated)]/70 text-[var(--ink-secondary)] hover:border-[var(--border-strong)]'
                                }`}
                              >
                                {label}
                              </RadioGroup.Item>
                            ))}
                          </RadioGroup.Root>
                        </div>

                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">
                            Signature Vibe
                          </p>
                          <RadioGroup.Root
                            value={vibe}
                            onValueChange={(v) => setVibe(v as BlindTripPick['vibe'])}
                            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                          >
                            {[
                              ['culinary_markets', 'Culinary Markets'],
                              ['coastal_architecture', 'Coastal Architecture'],
                              ['mountain_atelier', 'Mountain Atelier'],
                              ['night_jazz_museums', 'Night Jazz & Museums'],
                            ].map(([val, label]) => (
                              <RadioGroup.Item
                                key={val}
                                value={val}
                                className={`rounded-2xl border px-3 py-2.5 text-xs font-semibold transition cursor-pointer ${
                                  vibe === val
                                    ? 'border-[var(--accent-coral)] bg-[var(--accent-coral-soft)] text-[var(--accent-coral)] shadow-xs'
                                    : 'border-[var(--border-hairline)] bg-[var(--surface-elevated)]/70 text-[var(--ink-secondary)] hover:border-[var(--border-strong)]'
                                }`}
                              >
                                {label}
                              </RadioGroup.Item>
                            ))}
                          </RadioGroup.Root>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">
                            Hidden Wildcard Must-Have
                          </label>
                          <input
                            data-testid="blind-trip-wildcard-input"
                            value={wildcard}
                            onChange={(e) => setWildcard(e.target.value)}
                            className="w-full rounded-2xl border border-[var(--border-hairline)] bg-[var(--surface-input)] px-3.5 py-2.5 text-sm text-[var(--ink-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-coral)]/40"
                          />
                        </div>

                        <Button
                          data-testid="submit-blind-trip-button"
                          disabled={busy || !wildcard.trim()}
                          onClick={() =>
                            onSubmitBlindTrip(activeMatch.id, {
                              budget,
                              pace,
                              vibe,
                              wildcard,
                            })
                          }
                        >
                          Lock Hidden Travel Picks
                        </Button>
                      </motion.div>
                    ) : (
                      currentSession.blindTripState.dreamItinerary && (
                        <motion.div
                          key="blind-trip-reveal"
                          data-testid="dream-itinerary-reveal"
                          initial={{ opacity: 0, rotateX: 16, scale: 0.97 }}
                          animate={{ opacity: 1, rotateX: 0, scale: 1 }}
                          transition={KINDRED_SPRING}
                          className="space-y-4 rounded-3xl border border-[var(--accent-sage)]/35 bg-[var(--surface-elevated)]/90 p-5"
                        >
                          <MicroConfettiBurst />
                          <div className="flex items-center justify-between gap-2">
                            <Badge tone="sage">Dream Itinerary Revealed</Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onStartGame(activeMatch.id, 'blind_trip_draft', true)}
                            >
                              Play Again
                            </Button>
                          </div>
                          <h4 className="font-editorial text-2xl font-normal text-[var(--ink-primary)]">
                            {currentSession.blindTripState.dreamItinerary.title}
                          </h4>
                          <p className="text-xs font-semibold text-[var(--accent-coral)]">
                            Destination: {currentSession.blindTripState.dreamItinerary.destination}
                          </p>
                          <p className="text-xs leading-relaxed text-[var(--ink-secondary)]">
                            {currentSession.blindTripState.dreamItinerary.synthesisNote}
                          </p>
                          <div className="space-y-2.5">
                            {currentSession.blindTripState.dreamItinerary.stops.map((stop, idx) => (
                              <div
                                key={idx}
                                className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--surface-subtle)]/75 p-3.5"
                              >
                                <p className="font-mono-label text-[11px] font-semibold text-[var(--accent-sage)]">
                                  {stop.dayLabel} — {stop.title}
                                </p>
                                <p className="mt-1 text-xs text-[var(--ink-primary)]">
                                  {stop.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* MODE 2: 4-Turn Co-Op Mystery Escape */}
              {mode === 'coop_mystery_escape' && currentSession.mysteryEscapeState && (
                <div data-testid="mystery-escape-board" className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge tone="terracotta">
                      Theme: {currentSession.mysteryEscapeState.hobbyTheme}
                    </Badge>
                    <Badge tone={currentSession.mysteryEscapeState.escaped ? 'sage' : 'neutral'}>
                      {currentSession.mysteryEscapeState.escaped
                        ? 'Escaped Together (4/4)'
                        : `Turn ${currentSession.mysteryEscapeState.currentTurn} of 4`}
                    </Badge>
                  </div>

                  {/* 4-Step Consensus Meter */}
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((step) => {
                      const done =
                        currentSession.mysteryEscapeState!.escaped ||
                        step < currentSession.mysteryEscapeState!.currentTurn;
                      const current =
                        !currentSession.mysteryEscapeState!.escaped &&
                        step === currentSession.mysteryEscapeState!.currentTurn;
                      return (
                        <div
                          key={step}
                          className={`h-1.5 rounded-full transition-colors ${
                            done
                              ? 'bg-[var(--accent-sage)]'
                              : current
                                ? 'bg-[var(--accent-coral)]'
                                : 'bg-[var(--surface-subtle)]'
                          }`}
                        />
                      );
                    })}
                  </div>

                  <h4 className="font-editorial text-2xl font-normal text-[var(--ink-primary)]">
                    {currentSession.mysteryEscapeState.storyTitle}
                  </h4>

                  {currentSession.mysteryEscapeState.escaped ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={KINDRED_SPRING}
                      className="space-y-3 rounded-3xl border border-[var(--accent-sage)]/35 bg-[var(--accent-sage-soft)] p-5"
                    >
                      <MicroConfettiBurst />
                      <p className="text-sm font-semibold text-[var(--accent-sage)]">
                        Vault Unlocked! 4-Turn Consensus Complete
                      </p>
                      <p className="text-xs leading-relaxed text-[var(--ink-primary)]">
                        {currentSession.mysteryEscapeState.teamworkDebrief}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onStartGame(activeMatch.id, 'coop_mystery_escape', true)}
                      >
                        Replay Mystery
                      </Button>
                    </motion.div>
                  ) : (
                    (() => {
                      const turn =
                        currentSession.mysteryEscapeState.turns[
                          currentSession.mysteryEscapeState.currentTurn - 1
                        ];
                      const chosen =
                        selectedMysteryChoice || turn.userAChoiceId || turn.options[0].id;
                      return (
                        <div className="space-y-3 rounded-3xl border border-[var(--border-hairline)] bg-[var(--surface-elevated)]/80 p-4 sm:p-5">
                          <p className="text-sm leading-relaxed text-[var(--ink-primary)]">
                            {turn.prompt}
                          </p>
                          {turn.outcomeNote && (
                            <p className="rounded-xl border border-[var(--accent-amber)]/30 bg-[var(--accent-amber-soft)] px-3 py-2 text-xs font-medium text-[var(--accent-amber)]">
                              {turn.outcomeNote}
                            </p>
                          )}
                          <div className="space-y-2">
                            {turn.options.map((opt) => (
                              <motion.button
                                key={opt.id}
                                type="button"
                                whileTap={{ scale: 0.985 }}
                                transition={SNAPPY_SPRING}
                                data-testid={`mystery-option-${opt.id}`}
                                onClick={() => setSelectedMysteryChoice(opt.id)}
                                className={`w-full rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                                  chosen === opt.id
                                    ? 'border-[var(--accent-coral)] bg-[var(--accent-coral-soft)] shadow-xs'
                                    : 'border-[var(--border-hairline)] bg-[var(--surface-subtle)]/60 hover:border-[var(--border-strong)]'
                                }`}
                              >
                                <p className="text-xs font-semibold text-[var(--ink-primary)]">
                                  {opt.label}
                                </p>
                                <p className="mt-0.5 text-[11px] text-[var(--ink-secondary)]">
                                  {opt.rationale}
                                </p>
                              </motion.button>
                            ))}
                          </div>
                          <Button
                            data-testid="lock-in-mystery-choice"
                            disabled={busy}
                            onClick={async () => {
                              await onSubmitMysteryChoice(activeMatch.id, chosen);
                              setSelectedMysteryChoice('');
                            }}
                          >
                            Lock In Choice
                          </Button>
                        </div>
                      );
                    })()
                  )}
                </div>
              )}

              {/* MODE 3: Vibe & Values Wavelength */}
              {mode === 'vibe_values_wavelength' && currentSession.wavelengthState && (
                <div data-testid="wavelength-board" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge tone="ochre">Onboarding-Grounded Spectrum</Badge>
                    <Badge tone={currentSession.wavelengthState.completed ? 'sage' : 'neutral'}>
                      {currentSession.wavelengthState.completed
                        ? `${currentSession.wavelengthState.overallWavelengthScore}% Closeness`
                        : `Round ${currentSession.wavelengthState.currentRound} of 3`}
                    </Badge>
                  </div>

                  {currentSession.wavelengthState.completed ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={KINDRED_SPRING}
                      className="space-y-4 rounded-3xl border border-[var(--accent-sage)]/35 bg-[var(--surface-elevated)]/90 p-5"
                    >
                      {(currentSession.wavelengthState.overallWavelengthScore ?? 0) >= 75 && (
                        <MicroConfettiBurst />
                      )}
                      <div className="flex flex-wrap items-center gap-4">
                        <RadialScoreRing
                          label="Sync Score"
                          value={currentSession.wavelengthState.overallWavelengthScore ?? 0}
                          accentColor="var(--accent-sage)"
                          size={76}
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-editorial text-2xl font-normal text-[var(--ink-primary)]">
                            Wavelength Score: {currentSession.wavelengthState.overallWavelengthScore}%
                          </h4>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--ink-secondary)]">
                            {currentSession.wavelengthState.debriefNote}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {currentSession.wavelengthState.rounds.map((r) => (
                          <div
                            key={r.roundNumber}
                            className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--surface-subtle)]/70 p-3 text-xs"
                          >
                            <div className="flex justify-between font-semibold text-[var(--ink-primary)]">
                              <span>Round {r.roundNumber}</span>
                              <span className="font-mono-label text-[var(--accent-sage)]">
                                {r.roundScore}% match
                              </span>
                            </div>
                            <p className="mt-1 text-[var(--ink-secondary)]">{r.insightRevealed}</p>
                          </div>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onStartGame(activeMatch.id, 'vibe_values_wavelength', true)
                        }
                      >
                        Play Again
                      </Button>
                    </motion.div>
                  ) : (
                    (() => {
                      const round =
                        currentSession.wavelengthState.rounds[
                          currentSession.wavelengthState.currentRound - 1
                        ];
                      return (
                        <div className="space-y-4 rounded-3xl border border-[var(--border-hairline)] bg-[var(--surface-elevated)]/85 p-5">
                          <p className="text-sm font-medium leading-relaxed text-[var(--ink-primary)]">
                            {round.prompt}
                          </p>
                          <div className="space-y-2.5">
                            <Slider
                              aria-label="Wavelength position guess"
                              value={[wavelengthGuess]}
                              onValueChange={(vals) => setWavelengthGuess(vals[0] ?? 50)}
                              min={0}
                              max={100}
                            />
                            <div className="flex justify-between gap-2 text-[11px] text-[var(--ink-secondary)]">
                              <span>{round.leftAnchor}</span>
                              <span className="font-mono-label font-semibold text-[var(--accent-coral)]">
                                Your Guess: {wavelengthGuess}
                              </span>
                              <span className="text-right">{round.rightAnchor}</span>
                            </div>
                          </div>
                          <Button
                            data-testid="submit-wavelength-guess"
                            disabled={busy}
                            onClick={() => onSubmitWavelengthGuess(activeMatch.id, wavelengthGuess)}
                          >
                            Submit Wavelength Guess
                          </Button>
                        </div>
                      );
                    })()
                  )}
                </div>
              )}
            </div>
          )}
        </SpotlightCard>

        {/* Right: Collapsible 100% Authentic Human Chat Drawer */}
        <aside
          data-testid="human-chat-drawer"
          className={`editorial-bento spotlight-card flex flex-col rounded-3xl p-5 sm:p-6 ${
            chatCollapsed ? 'lg:col-span-12' : 'lg:col-span-5'
          }`}
        >
          <div className="mb-3 border-b border-[var(--border-hairline)] pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageCircleHeart className="h-4 w-4 text-[var(--accent-coral)]" />
                <h3 className="font-editorial text-xl font-normal text-[var(--ink-primary)]">
                  Human Chat Drawer
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge tone="sage">
                  <ShieldCheck className="h-3 w-3" />
                  Zero AI Ghostwriting
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setChatCollapsed((c) => !c)}
                  aria-label={chatCollapsed ? 'Expand human chat drawer' : 'Collapse human chat drawer'}
                >
                  {chatCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-[var(--ink-secondary)]">
              Every message is sent 100% verbatim in your authentic voice — zero AI suggestions or ghostwriting.
            </p>
          </div>

          {!chatCollapsed && (
            <>
              <div
                data-testid="human-chat-messages"
                className="kindred-scroll flex-1 space-y-2.5 overflow-y-auto pr-1 min-h-[260px] max-h-[380px]"
              >
                {activeMatch.humanChatMessages.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-6 text-center text-xs text-[var(--ink-secondary)]">
                    React to a move in the co-op game to kick off a real conversation with{' '}
                    {partner?.displayName ?? 'your match'}.
                  </div>
                ) : (
                  activeMatch.humanChatMessages.map((msg) => {
                    const isMine = msg.senderUserId === currentUserId;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={SNAPPY_SPRING}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                            isMine
                              ? 'bg-[var(--ink-primary)] text-[var(--surface-canvas)]'
                              : 'border border-[var(--border-hairline)] bg-[var(--surface-elevated)] text-[var(--ink-primary)]'
                          }`}
                        >
                          <div className="mb-1 flex items-center justify-between gap-2 text-[10px] opacity-75">
                            <span className="font-semibold">
                              {msg.senderName}
                              {msg.authenticity === 'simulated_demo_partner' ? ' (Demo Partner)' : ''}
                            </span>
                            <span className="font-mono-label">{formatTimestamp(msg.timestamp)}</span>
                          </div>
                          <p>{msg.content}</p>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              <form
                onSubmit={handleChatSubmit}
                className="mt-3 flex gap-2 border-t border-[var(--border-hairline)] pt-3"
              >
                <input
                  data-testid="human-chat-input"
                  value={chatDraft}
                  onChange={(e) => setChatDraft(e.target.value)}
                  placeholder={`Write in your own voice to ${partner?.displayName ?? 'your match'}...`}
                  className="flex-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-input)] px-3 py-2 text-xs text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-coral)]/40"
                />
                <Button
                  type="submit"
                  size="sm"
                  data-testid="human-chat-send"
                  disabled={busy || !chatDraft.trim()}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
