'use client';

import { useState } from 'react';
import {
  Baby,
  CalendarHeart,
  Globe2,
  Lock,
  ShieldAlert,
  Sparkles,
  Unlock,
} from 'lucide-react';
import { Badge, Button, Switch } from '@/components/ui/primitives';
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
      <div className="overflow-hidden rounded-2xl border border-[#E4DDD2] bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={caption} className="h-64 w-full object-cover" />
        <p className="p-3 text-xs text-[#535963]">{caption}</p>
      </div>
    );
  }

  const c1 = palette[1] ?? '#D96B4F';
  const c2 = palette[2] ?? '#6E8F78';
  const c3 = palette[3] ?? '#C89B54';

  return (
    <div
      data-testid="family-portrait-svg-composer"
      className="overflow-hidden rounded-2xl border border-[#E4DDD2] bg-[#FAF7F2]"
    >
      <svg
        viewBox="0 0 420 220"
        className="w-full h-52"
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
      <div className="border-t border-[#E4DDD2] bg-white p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge tone="ochre">Editorial SVG Composer</Badge>
          <span className="text-[11px] text-[#535963]">{traitsIllustrated.join(' · ')}</span>
        </div>
        <p className="mt-1.5 text-xs text-[#15181C]">{caption}</p>
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
  const activeMatch =
    activeMatches.find((m) => m.id === selectedMatchId) ?? activeMatches[0] ?? null;

  const [activeTab, setActiveTab] = useState<'date_nights' | 'world_adventure' | 'future_family'>(
    'date_nights',
  );

  if (!activeMatch) {
    return (
      <div className="editorial-card rounded-3xl p-10 text-center">
        <Lock className="mx-auto h-10 w-10 text-[#C89B54]" />
        <h2 className="font-editorial mt-3 text-2xl font-semibold text-[#15181C]">
          Future Simulation Studio Is Consent-Gated
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#535963]">
          Accept an 80%+ match into your Focused Cohort first so both partners can mutually unlock the &ldquo;What If?&rdquo; Simulator.
        </p>
      </div>
    );
  }

  const partnerId =
    activeMatch.userAId === currentUserId ? activeMatch.userBId : activeMatch.userAId;
  const partner = candidates.find((c) => c.id === partnerId);
  const consent = activeMatch.sandboxConsent;
  const sim = simulationByMatchId[activeMatch.id] ?? null;

  return (
    <div className="space-y-6">
      {/* Match & Dual-Consent Gate Header */}
      <section className="editorial-card rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
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
                  className="h-7 rounded-lg border border-[#DFD7CA] bg-white px-2 text-xs"
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
            <h2 className="font-editorial mt-2 text-2xl font-semibold text-[#15181C]">
              &ldquo;What If?&rdquo; Relationship Studio · {partner?.displayName ?? partnerId}
            </h2>
            <p className="mt-1 text-xs text-[#535963]">{consent.sufficiencyReason}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!consent.mutuallyUnlocked ? (
              <Button
                data-testid="unlock-future-sandbox-button"
                variant="sage"
                disabled={busy || !consent.aiSufficiencyMet}
                onClick={() => onToggleConsent(activeMatch.id, true)}
              >
                <Unlock className="h-4 w-4" />
                Unlock Future Sandbox
              </Button>
            ) : (
              <>
                <Button
                  data-testid="generate-all-future-button"
                  disabled={busy}
                  onClick={() => onGenerateModule(activeMatch.id, 'all')}
                >
                  <Sparkles className="h-4 w-4" />
                  {busy ? 'Generating...' : 'Generate Full Future Studio'}
                </Button>
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
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#C89B54]/40 bg-[#C89B54]/10 px-4 py-3 text-xs text-[#8A6427]">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>
              Anti-future-faking guardrail: both Wingman blueprints need at least 60% onboarding depth before this gate can unlock.
            </span>
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-2xl border border-[#9B3B2E]/30 bg-[#9B3B2E]/10 px-4 py-3 text-sm text-[#9B3B2E]">
          {error}
        </div>
      )}

      {/* Unlocked Studio Tabs */}
      {consent.mutuallyUnlocked && (
        <section className="editorial-card rounded-3xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4DDD2] pb-4">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={activeTab === 'date_nights' ? 'primary' : 'outline'}
                onClick={() => setActiveTab('date_nights')}
              >
                <CalendarHeart className="h-3.5 w-3.5" />
                Date Night Blueprints
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'world_adventure' ? 'primary' : 'outline'}
                onClick={() => setActiveTab('world_adventure')}
              >
                <Globe2 className="h-3.5 w-3.5" />
                Around-the-World Adventure
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'future_family' ? 'primary' : 'outline'}
                onClick={() => setActiveTab('future_family')}
              >
                <Baby className="h-3.5 w-3.5" />
                Future Family Visualizer (Opt-In)
              </Button>
            </div>

            <label className="flex items-center gap-2 text-xs text-[#535963] cursor-pointer">
              <Switch
                checked={consent.familyVisualizerOptIn}
                onCheckedChange={(val) => onToggleFamilyOptIn(activeMatch.id, val)}
                aria-label="Opt in to Future Family Visualizer"
              />
              <span>Opt in to Future Family Visualizer</span>
            </label>
          </div>

          <div className="mt-5">
            {/* Tab 1: Date Nights */}
            {activeTab === 'date_nights' && (
              <div className="space-y-4">
                {!sim?.dateNightBlueprints ? (
                  <div className="py-8 text-center">
                    <Button
                      disabled={busy}
                      onClick={() => onGenerateModule(activeMatch.id, 'date_nights')}
                    >
                      Generate 3 Date Night Blueprints
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {sim.dateNightBlueprints.map((concept) => (
                      <article
                        key={concept.stageLabel}
                        className="rounded-2xl border border-[#E4DDD2] bg-[#FAF7F2] p-4 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <Badge tone="terracotta">{concept.stageLabel}</Badge>
                          <span className="font-mono-label text-[11px] text-[#535963]">
                            {concept.estimatedBudget}
                          </span>
                        </div>
                        <h3 className="font-editorial text-lg font-semibold text-[#15181C]">
                          {concept.title}
                        </h3>
                        <p className="text-xs text-[#535963]">
                          <strong>Vibe:</strong> {concept.venueVibe}
                        </p>
                        <p className="text-xs leading-relaxed text-[#15181C]">
                          {concept.activity}
                        </p>
                        <p className="rounded-xl bg-white p-2.5 text-[11px] text-[#42614C] border border-[#E4DDD2]">
                          <strong>Starter:</strong> &ldquo;{concept.conversationStarter}&rdquo;
                        </p>
                        <p className="text-[11px] text-[#535963]">{concept.whyItFitsBoth}</p>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: World Adventure */}
            {activeTab === 'world_adventure' && (
              <div className="space-y-4">
                {!sim?.worldAdventure ? (
                  <div className="py-8 text-center">
                    <Button
                      disabled={busy}
                      onClick={() => onGenerateModule(activeMatch.id, 'world_adventure')}
                    >
                      Generate World Adventure Simulator
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-editorial text-xl font-semibold text-[#15181C]">
                        {sim.worldAdventure.tripTitle}
                      </h3>
                      <p className="mt-1 text-xs text-[#535963]">
                        {sim.worldAdventure.routeSummary}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      {sim.worldAdventure.dayByDayHighlights.map((stop, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl border border-[#E4DDD2] bg-[#FAF7F2] p-4 space-y-1.5"
                        >
                          <Badge tone="sage">
                            {stop.dayRange} · {stop.city}
                          </Badge>
                          <p className="text-xs leading-relaxed text-[#15181C]">
                            {stop.highlight}
                          </p>
                          <p className="text-[11px] text-[#535963]">{stop.partnerBalanceNote}</p>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-2xl border border-[#E4DDD2] bg-white p-4 text-xs text-[#535963] space-y-1">
                      <p>
                        <strong className="text-[#15181C]">Packing &amp; Vibe Match:</strong>{' '}
                        {sim.worldAdventure.packingAndVibeMatch}
                      </p>
                      <p>
                        <strong className="text-[#15181C]">Travel Style Balance:</strong>{' '}
                        {sim.worldAdventure.travelStyleBalance}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Future Family Visualizer */}
            {activeTab === 'future_family' && (
              <div className="space-y-4">
                {!consent.familyVisualizerOptIn ? (
                  <div className="rounded-2xl border border-dashed border-[#DFD7CA] p-8 text-center space-y-3">
                    <p className="text-sm font-medium text-[#15181C]">
                      Playful Future Family Visualizer Requires Explicit Opt-In
                    </p>
                    <p className="mx-auto max-w-md text-xs text-[#535963]">
                      Toggle <strong>Opt in to Future Family Visualizer</strong> above to generate a lighthearted personality mashup and portrait card.
                    </p>
                  </div>
                ) : !sim?.futureFamily ? (
                  <div className="py-8 text-center">
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
                    <div className="space-y-3 rounded-2xl border border-[#E4DDD2] bg-[#FAF7F2] p-5">
                      <h3 className="font-editorial text-xl font-semibold text-[#15181C]">
                        {sim.futureFamily.mashupHeadline}
                      </h3>
                      <p className="text-xs leading-relaxed text-[#15181C]">
                        {sim.futureFamily.kidPersonalityBlend}
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
                        <div className="rounded-xl bg-white p-3 border border-[#E4DDD2]">
                          <p className="font-semibold text-[#B85137]">Inherited Spark A</p>
                          <ul className="mt-1 space-y-1 text-[#535963]">
                            {sim.futureFamily.inheritedFromUserA.map((t, i) => (
                              <li key={i}>• {t}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-xl bg-white p-3 border border-[#E4DDD2]">
                          <p className="font-semibold text-[#42614C]">Inherited Spark B</p>
                          <ul className="mt-1 space-y-1 text-[#535963]">
                            {sim.futureFamily.inheritedFromUserB.map((t, i) => (
                              <li key={i}>• {t}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <p className="text-xs text-[#535963]">
                        <strong className="text-[#15181C]">Sunday Ritual:</strong>{' '}
                        {sim.futureFamily.sundayFamilyRitual}
                      </p>
                      <p className="text-xs text-[#535963]">
                        <strong className="text-[#15181C]">Dinner Debate:</strong>{' '}
                        {sim.futureFamily.dinnerTableDebateTopic}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
