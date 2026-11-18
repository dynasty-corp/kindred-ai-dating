'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Baby,
  CalendarHeart,
  Check,
  Copy,
  Globe2,
  Lock,
  ShieldAlert,
  Sparkles,
  Unlock,
} from 'lucide-react';
import { Badge, Button, SpotlightCard, Switch } from '@/components/ui/primitives';
import { DreamGlobeDynamic } from '@/components/webgl/DynamicWebGL';
import { KINDRED_SPRING, SNAPPY_SPRING, bentoCardVariants } from '@/lib/motion';
import { useKindredTheme } from '@/lib/theme';
import type {
  FutureSimulation,
  MatchDossier,
  SanitizedCandidate,
} from '@/lib/types/schemas';

export function FamilyPortraitComposer({
  caption,
  palette,
  traitsIllustrated,
  imageUrl,
  renderMode,
}: {
  caption: string;
  palette: string[];
  traitsIllustrated: string[];
  imageUrl?: string;
  renderMode: 'ai_image_api' | 'svg_canvas_composer';
}) {
  if (renderMode === 'ai_image_api' && imageUrl) {
    return (
      <div className="overflow-hidden rounded-3xl border border-[var(--border-hairline)] bg-[var(--surface-elevated)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={caption} className="h-64 w-full object-cover" />
        <p className="p-4 text-xs text-[var(--ink-secondary)]">{caption}</p>
      </div>
    );
  }

  const c1 = palette[1] ?? '#D96B4F';
  const c2 = palette[2] ?? '#6E8F78';
  const c3 = palette[3] ?? '#C89B54';

  return (
    <div
      data-testid="family-portrait-svg-composer"
      className="overflow-hidden rounded-3xl border border-[var(--border-hairline)] bg-[var(--surface-elevated)]"
    >
      <svg
        viewBox="0 0 420 220"
        className="h-52 w-full"
        role="img"
        aria-label={caption}
      >
        <defs>
          <linearGradient id="sunWash" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FAF7F2" />
            <stop offset="100%" stopColor="#F2ECE3" />
          </linearGradient>
        </defs>
        <rect width="420" height="220" fill="url(#sunWash)" />
        {/* Sunlit window frame */}
        <rect x="26" y="20" width="120" height="145" rx="14" fill="#FFFFFF" stroke="#E4DDD2" strokeWidth="2" />
        <circle cx="86" cy="68" r="24" fill={c3} fillOpacity="0.28" />
        <path d="M26 132 Q86 108 146 138 L146 165 L26 165 Z" fill={c2} fillOpacity="0.24" />

        {/* Adult A silhouette */}
        <circle cx="205" cy="84" r="21" fill="#D9A684" />
        <path d="M174 176 C174 130, 236 130, 236 176 Z" fill={c1} />
        {/* Adult B silhouette */}
        <circle cx="305" cy="80" r="22" fill="#8C583A" />
        <path d="M274 176 C274 128, 336 128, 336 176 Z" fill={c2} />
        {/* Playful Child silhouette in center */}
        <circle cx="256" cy="118" r="15" fill="#C88D68" />
        <path d="M235 176 C235 144, 277 144, 277 176 Z" fill={c3} />

        {/* Kitchen table & ceramic mug */}
        <rect x="155" y="174" width="210" height="16" rx="8" fill="#15181C" fillOpacity="0.86" />
        <rect x="242" y="158" width="18" height="16" rx="4" fill="#FFFFFF" stroke={c1} strokeWidth="2" />
      </svg>
      <div className="border-t border-[var(--border-hairline)] bg-[var(--surface-elevated)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge tone="ochre">Editorial SVG Keepsake</Badge>
          <span className="text-[11px] text-[var(--ink-secondary)]">
            {traitsIllustrated.join(' · ')}
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[var(--ink-primary)]">{caption}</p>
      </div>
    </div>
  );
}

export function Stage4FutureStudio({
  currentUserId,
  activeMatches,
  candidates,
  selectedMatchId,
  simulationByMatchId,
  onSelectMatch,
  onToggleConsent,
  onToggleFamilyOptIn,
  onGenerateModule,
  busy,
  error,
}: {
  currentUserId: string;
  activeMatches: MatchDossier[];
  candidates: SanitizedCandidate[];
  selectedMatchId: string | null;
  simulationByMatchId: Record<string, FutureSimulation | null>;
  onSelectMatch: (matchId: string) => void;
  onToggleConsent: (matchId: string, consent: boolean) => Promise<void>;
  onToggleFamilyOptIn: (matchId: string, optIn: boolean) => Promise<void>;
  onGenerateModule: (
    matchId: string,
    module: 'date_nights' | 'world_adventure' | 'future_family' | 'all',
  ) => Promise<void>;
  busy: boolean;
  error: string | null;
}) {
  const { theme } = useKindredTheme();
  const activeMatch =
    activeMatches.find((m) => m.id === selectedMatchId) ?? activeMatches[0] ?? null;

  const [activeTab, setActiveTab] = useState<'date_nights' | 'world_adventure' | 'future_family'>(
    'date_nights',
  );
  const [selectedStopIndex, setSelectedStopIndex] = useState(0);
  const [copiedSummary, setCopiedSummary] = useState(false);

  if (!activeMatch) {
    return (
      <SpotlightCard className="p-10 text-center">
        <Lock className="mx-auto h-10 w-10 text-[var(--accent-amber)]" />
        <h2 className="font-editorial mt-3 text-3xl font-normal text-[var(--ink-primary)]">
          Future Simulation Studio Is Consent-Gated
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--ink-secondary)]">
          Accept an 80%+ match into your Focused Cohort first so both partners can mutually unlock the &ldquo;What If?&rdquo; Simulator.
        </p>
      </SpotlightCard>
    );
  }

  const partnerId =
    activeMatch.userAId === currentUserId ? activeMatch.userBId : activeMatch.userAId;
  const partner = candidates.find((c) => c.id === partnerId);
  const consent = activeMatch.sandboxConsent;
  const sim = simulationByMatchId[activeMatch.id] ?? null;

  const handleCopyShareableCard = async () => {
    if (!sim) return;
    const summaryLines: string[] = [
      `KindredAI "What If?" Studio — ${partner?.displayName ?? partnerId}`,
    ];
    if (sim.dateNightBlueprints) {
      summaryLines.push(
        `Date Nights: ${sim.dateNightBlueprints.map((d) => `${d.stageLabel} (${d.title})`).join(' | ')}`,
      );
    }
    if (sim.worldAdventure) {
      summaryLines.push(
        `Adventure: ${sim.worldAdventure.tripTitle} — ${sim.worldAdventure.dayByDayHighlights.map((s) => s.city).join(' -> ')}`,
      );
    }
    if (sim.futureFamily) {
      summaryLines.push(`Future Family Card: ${sim.futureFamily.mashupHeadline}`);
    }
    try {
      await navigator.clipboard.writeText(summaryLines.join('\n'));
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  const studioTabs: Array<{
    id: 'date_nights' | 'world_adventure' | 'future_family';
    label: string;
    icon: React.ReactNode;
  }> = [
    { id: 'date_nights', label: 'Date Night Blueprints', icon: <CalendarHeart className="h-3.5 w-3.5" /> },
    { id: 'world_adventure', label: 'Around-the-World Adventure', icon: <Globe2 className="h-3.5 w-3.5" /> },
    { id: 'future_family', label: 'Future Family Visualizer (Opt-In)', icon: <Baby className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Tactile Dual-Consent Gate Header */}
      <SpotlightCard className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={consent.mutuallyUnlocked ? 'sage' : 'ochre'}>
                {consent.mutuallyUnlocked ? (
                  <>
                    <Unlock className="h-3 w-3" />
                    Future Sandbox Unlocked
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3" />
                    Dual-Consent Required
                  </>
                )}
              </Badge>
              {activeMatches.length > 1 && (
                <select
                  value={activeMatch.id}
                  onChange={(e) => onSelectMatch(e.target.value)}
                  className="h-7 rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-elevated)] px-2.5 text-xs text-[var(--ink-primary)]"
                >
                  {activeMatches.map((m) => {
                    const pid = m.userAId === currentUserId ? m.userBId : m.userAId;
                    const p = candidates.find((c) => c.id === pid);
                    return (
                      <option key={m.id} value={m.id}>
                        {p?.displayName ?? pid}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
            <h2 className="font-editorial mt-2.5 text-3xl font-normal text-[var(--ink-primary)] sm:text-4xl">
              &ldquo;What If?&rdquo; Relationship Studio ·{' '}
              <em className="italic text-[var(--accent-coral)]">{partner?.displayName ?? partnerId}</em>
            </h2>
            <p className="mt-1 text-xs text-[var(--ink-secondary)]">{consent.sufficiencyReason}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!consent.mutuallyUnlocked ? (
              <div className="rounded-2xl border border-[var(--accent-sage)]/30 bg-[var(--accent-sage-soft)] p-2">
                <Button
                  data-testid="unlock-future-sandbox-button"
                  variant="sage"
                  disabled={busy || !consent.aiSufficiencyMet}
                  onClick={() => onToggleConsent(activeMatch.id, true)}
                >
                  <Unlock className="h-4 w-4" />
                  Unlock Future Sandbox
                </Button>
              </div>
            ) : (
              <>
                <Button
                  data-testid="generate-all-future-button"
                  disabled={busy}
                  onClick={() => onGenerateModule(activeMatch.id, 'all')}
                >
                  <Sparkles className="h-4 w-4" />
                  {busy ? 'Composing Editorial Spread...' : 'Generate Full Future Studio'}
                </Button>
                {sim && (
                  <Button variant="outline" size="sm" onClick={handleCopyShareableCard}>
                    {copiedSummary ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[var(--accent-sage)]" />
                        Copied Card
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Share Summary
                      </>
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="revoke-future-consent-button"
                  onClick={() => onToggleConsent(activeMatch.id, false)}
                >
                  Revoke Consent
                </Button>
              </>
            )}
          </div>
        </div>

        {!consent.aiSufficiencyMet && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[var(--accent-amber)]/35 bg-[var(--accent-amber-soft)] px-4 py-3 text-xs text-[var(--accent-amber)]">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>
              Anti-future-faking guardrail: both Wingman blueprints need at least 60% onboarding depth before this gate can unlock.
            </span>
          </div>
        )}
      </SpotlightCard>

      {error && (
        <div className="rounded-2xl border border-[var(--accent-danger)]/35 bg-[var(--accent-danger-soft)] px-4 py-3 text-sm text-[var(--accent-danger)]">
          {error}
        </div>
      )}

      {/* Unlocked Studio Magazine Spreads */}
      {consent.mutuallyUnlocked && (
        <SpotlightCard className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-hairline)] pb-4">
            <div className="flex flex-wrap gap-1.5 rounded-2xl border border-[var(--border-hairline)] bg-[var(--surface-subtle)]/75 p-1">
              {studioTabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                      active ? 'text-white' : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="future-studio-tab"
                        transition={SNAPPY_SPRING}
                        className="absolute inset-0 rounded-xl bg-[var(--accent-coral)] shadow-xs"
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      {tab.icon}
                      <span>{tab.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="flex items-center gap-2 text-xs text-[var(--ink-secondary)] cursor-pointer">
              <Switch
                checked={consent.familyVisualizerOptIn}
                onCheckedChange={(val) => onToggleFamilyOptIn(activeMatch.id, val)}
                aria-label="Opt in to Future Family Visualizer"
              />
              <span>Opt in to Future Family Visualizer</span>
            </label>
          </div>

          <div className="mt-6">
            {/* Tab 1: Editorial Date Night Magazine Spread */}
            {activeTab === 'date_nights' && (
              <div className="space-y-4">
                {!sim?.dateNightBlueprints ? (
                  <div className="py-10 text-center">
                    <Button
                      disabled={busy}
                      onClick={() => onGenerateModule(activeMatch.id, 'date_nights')}
                    >
                      Generate 3 Date Night Blueprints
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {sim.dateNightBlueprints.map((concept, idx) => (
                      <motion.article
                        key={concept.stageLabel}
                        variants={bentoCardVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ ...KINDRED_SPRING, delay: idx * 0.06 }}
                        className="flex flex-col justify-between space-y-3 rounded-3xl border border-[var(--border-hairline)] bg-[var(--surface-elevated)]/85 p-5"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <Badge tone="terracotta">{concept.stageLabel}</Badge>
                            <span className="font-mono-label text-[11px] text-[var(--ink-muted)]">
                              {concept.estimatedBudget}
                            </span>
                          </div>
                          <h3 className="font-editorial text-2xl font-normal text-[var(--ink-primary)]">
                            {concept.title}
                          </h3>
                          <p className="text-xs text-[var(--ink-secondary)]">
                            <strong className="text-[var(--ink-primary)]">Venue Vibe:</strong>{' '}
                            {concept.venueVibe}
                          </p>
                          <p className="text-xs leading-relaxed text-[var(--ink-primary)]">
                            {concept.activity}
                          </p>
                        </div>
                        <div className="space-y-2 border-t border-[var(--border-hairline)] pt-3">
                          <p className="rounded-2xl border border-[var(--accent-sage)]/30 bg-[var(--accent-sage-soft)] p-3 text-[11px] leading-relaxed text-[var(--accent-sage)]">
                            <strong>Starter:</strong> &ldquo;{concept.conversationStarter}&rdquo;
                          </p>
                          <p className="text-[11px] text-[var(--ink-secondary)]">
                            {concept.whyItFitsBoth}
                          </p>
                        </div>
                      </motion.article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: 3D Globe World Adventure Simulator */}
            {activeTab === 'world_adventure' && (
              <div className="space-y-5">
                {!sim?.worldAdventure ? (
                  <div className="py-10 text-center">
                    <Button
                      disabled={busy}
                      onClick={() => onGenerateModule(activeMatch.id, 'world_adventure')}
                    >
                      Generate World Adventure Simulator
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <span className="font-mono-label text-[10px] uppercase tracking-wider text-[var(--accent-sage)]">
                        Global Expedition Dossier
                      </span>
                      <h3 className="font-editorial mt-1 text-3xl font-normal text-[var(--ink-primary)]">
                        {sim.worldAdventure.tripTitle}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--ink-secondary)]">
                        {sim.worldAdventure.routeSummary}
                      </p>
                    </div>

                    {/* Signature WebGL Experience #3: Interactive 3D Geodesic Adventure Globe */}
                    <DreamGlobeDynamic
                      stops={sim.worldAdventure.dayByDayHighlights}
                      selectedStopIndex={Math.min(
                        selectedStopIndex,
                        Math.max(0, sim.worldAdventure.dayByDayHighlights.length - 1),
                      )}
                      onSelectStop={(idx) => setSelectedStopIndex(idx)}
                      theme={theme}
                    />

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      {sim.worldAdventure.dayByDayHighlights.map((stop, idx) => {
                        const isFocused = idx === selectedStopIndex;
                        return (
                          <motion.button
                            key={idx}
                            type="button"
                            whileTap={{ scale: 0.98 }}
                            transition={KINDRED_SPRING}
                            onClick={() => setSelectedStopIndex(idx)}
                            className={`space-y-2 rounded-3xl border p-4 text-left transition cursor-pointer ${
                              isFocused
                                ? 'border-[var(--accent-coral)] bg-[var(--surface-elevated)] shadow-md'
                                : 'border-[var(--border-hairline)] bg-[var(--surface-subtle)]/70 hover:border-[var(--border-strong)]'
                            }`}
                          >
                            <Badge tone={isFocused ? 'terracotta' : 'sage'}>
                              {stop.dayRange} · {stop.city}
                            </Badge>
                            <p className="text-xs leading-relaxed text-[var(--ink-primary)]">
                              {stop.highlight}
                            </p>
                            <p className="text-[11px] text-[var(--ink-secondary)]">
                              {stop.partnerBalanceNote}
                            </p>
                          </motion.button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 gap-3 rounded-3xl border border-[var(--border-hairline)] bg-[var(--surface-subtle)]/70 p-4 text-xs text-[var(--ink-secondary)] sm:grid-cols-2">
                      <p>
                        <strong className="text-[var(--ink-primary)]">Packing &amp; Vibe Match:</strong>{' '}
                        {sim.worldAdventure.packingAndVibeMatch}
                      </p>
                      <p>
                        <strong className="text-[var(--ink-primary)]">Travel Style Balance:</strong>{' '}
                        {sim.worldAdventure.travelStyleBalance}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Collectible Future Family Keepsake Spread */}
            {activeTab === 'future_family' && (
              <div className="space-y-4">
                {!consent.familyVisualizerOptIn ? (
                  <div className="space-y-3 rounded-3xl border border-dashed border-[var(--border-strong)] p-8 text-center">
                    <p className="text-sm font-medium text-[var(--ink-primary)]">
                      Playful Future Family Visualizer Requires Explicit Opt-In
                    </p>
                    <p className="mx-auto max-w-md text-xs text-[var(--ink-secondary)]">
                      Toggle <strong>Opt in to Future Family Visualizer</strong> above to generate a lighthearted personality mashup and keepsake portrait card.
                    </p>
                  </div>
                ) : !sim?.futureFamily ? (
                  <div className="py-10 text-center">
                    <Button
                      data-testid="generate-family-visualizer-button"
                      disabled={busy}
                      onClick={() => onGenerateModule(activeMatch.id, 'future_family')}
                    >
                      Generate Future Family Preview
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FamilyPortraitComposer
                      caption={sim.futureFamily.portraitConcept.caption}
                      palette={sim.futureFamily.portraitConcept.palette}
                      traitsIllustrated={sim.futureFamily.portraitConcept.traitsIllustrated}
                      imageUrl={sim.futureFamily.portraitConcept.imageUrl}
                      renderMode={sim.futureFamily.portraitConcept.renderMode}
                    />
                    <div className="space-y-3 rounded-3xl border border-[var(--border-hairline)] bg-[var(--surface-elevated)]/85 p-5">
                      <Badge tone="terracotta">Collectible Personality Blend</Badge>
                      <h3 className="font-editorial text-2xl font-normal text-[var(--ink-primary)]">
                        {sim.futureFamily.mashupHeadline}
                      </h3>
                      <p className="text-xs leading-relaxed text-[var(--ink-primary)]">
                        {sim.futureFamily.kidPersonalityBlend}
                      </p>
                      <div className="grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2">
                        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--surface-subtle)]/75 p-3">
                          <p className="font-semibold text-[var(--accent-coral)]">Inherited Spark A</p>
                          <ul className="mt-1.5 space-y-1 text-[var(--ink-secondary)]">
                            {sim.futureFamily.inheritedFromUserA.map((t, i) => (
                              <li key={i}>• {t}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--surface-subtle)]/75 p-3">
                          <p className="font-semibold text-[var(--accent-sage)]">Inherited Spark B</p>
                          <ul className="mt-1.5 space-y-1 text-[var(--ink-secondary)]">
                            {sim.futureFamily.inheritedFromUserB.map((t, i) => (
                              <li key={i}>• {t}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <p className="text-xs text-[var(--ink-secondary)]">
                        <strong className="text-[var(--ink-primary)]">Sunday Ritual:</strong>{' '}
                        {sim.futureFamily.sundayFamilyRitual}
                      </p>
                      <p className="text-xs text-[var(--ink-secondary)]">
                        <strong className="text-[var(--ink-primary)]">Dinner Debate:</strong>{' '}
                        {sim.futureFamily.dinnerTableDebateTopic}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </SpotlightCard>
      )}
    </div>
  );
}
