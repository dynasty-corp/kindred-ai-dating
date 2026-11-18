'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Play,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { AvatarPortrait } from '@/components/ui/AvatarPortrait';
import { Badge, Button, RadialScoreRing, SpotlightCard } from '@/components/ui/primitives';
import { ResonanceOrbDynamic } from '@/components/webgl/DynamicWebGL';
import { KINDRED_SPRING, bentoCardVariants, transcriptTurnVariants } from '@/lib/motion';
import { useKindredTheme } from '@/lib/theme';
import type {
  AgentConversation,
  MatchDossier,
  SanitizedCandidate,
} from '@/lib/types/schemas';

export function Stage2Discovery({
  currentUserId,
  candidates,
  matches,
  conversations,
  selectedCandidateId,
  onSelectCandidate,
  onRunAgentMatch,
  onDecideMatch,
  onEnterCoopArena,
  busyCandidateId,
  actionError,
}: {
  currentUserId: string;
  candidates: SanitizedCandidate[];
  matches: MatchDossier[];
  conversations: AgentConversation[];
  selectedCandidateId: string | null;
  onSelectCandidate: (candidateId: string) => void;
  onRunAgentMatch: (candidateUserId: string) => Promise<void>;
  onDecideMatch: (matchId: string, action: 'accept' | 'pass' | 'archive') => Promise<void>;
  onEnterCoopArena: (matchId: string) => void;
  busyCandidateId: string | null;
  actionError: string | null;
}) {
  const { theme } = useKindredTheme();
  const [dossierExpanded, setDossierExpanded] = useState(true);

  const activeCandidate =
    candidates.find((c) => c.id === selectedCandidateId) ?? candidates[0] ?? null;

  const activeDossier = activeCandidate
    ? matches.find(
        (m) =>
          (m.userAId === currentUserId && m.userBId === activeCandidate.id) ||
          (m.userBId === currentUserId && m.userAId === activeCandidate.id),
      )
    : undefined;

  const activeConversation = activeDossier
    ? conversations.find((c) => c.id === activeDossier.conversationId)
    : activeCandidate
      ? conversations.find(
          (c) =>
            (c.initiatorUserId === currentUserId && c.candidateUserId === activeCandidate.id) ||
            (c.candidateUserId === currentUserId && c.initiatorUserId === activeCandidate.id),
        )
      : undefined;

  const [replayState, setReplayState] = useState<{ convId: string; count: number } | null>(null);
  const visibleTurnsCount =
    activeConversation && replayState?.convId === activeConversation.id
      ? replayState.count
      : (activeConversation?.turns.length ?? 0);

  const replayTranscript = () => {
    if (!activeConversation) return;
    const targetId = activeConversation.id;
    const total = activeConversation.turns.length;
    setReplayState({ convId: targetId, count: 1 });
    let count = 1;
    const timer = setInterval(() => {
      count += 1;
      setReplayState({ convId: targetId, count });
      if (count >= total) {
        clearInterval(timer);
      }
    }, 450);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left: Candidate Gallery */}
      <aside className="space-y-4 lg:col-span-4">
        <SpotlightCard className="p-5">
          <div className="mb-4 border-b border-[var(--border-hairline)] pb-3">
            <span className="font-mono-label text-[10px] uppercase tracking-wider text-[var(--accent-coral)]">
              Discovery Cohort
            </span>
            <h2 className="font-editorial mt-1 text-2xl font-normal text-[var(--ink-primary)]">
              Autonomous Introductions
            </h2>
            <p className="mt-1 text-xs text-[var(--ink-secondary)]">
              6 seeded personas + active accounts. Dispatch your Wingman to probe alignment before you invest human time.
            </p>
          </div>

          <div className="space-y-2.5">
            {candidates.map((candidate) => {
              const dossier = matches.find(
                (m) =>
                  (m.userAId === currentUserId && m.userBId === candidate.id) ||
                  (m.userBId === currentUserId && m.userAId === candidate.id),
              );
              const isSelected = activeCandidate?.id === candidate.id;

              return (
                <motion.button
                  key={candidate.id}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  transition={KINDRED_SPRING}
                  data-testid={`candidate-card-${candidate.id}`}
                  onClick={() => onSelectCandidate(candidate.id)}
                  className={`w-full rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[var(--accent-coral)] bg-[var(--surface-elevated)] shadow-md'
                      : 'border-[var(--border-hairline)] bg-[var(--surface-subtle)]/50 hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]/70'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AvatarPortrait
                      config={candidate.avatarConfig}
                      name={candidate.displayName}
                      size={44}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="text-sm font-semibold text-[var(--ink-primary)]">
                          {candidate.displayName}, {candidate.age}
                        </span>
                        {dossier ? (
                          <Badge
                            tone={
                              dossier.status === 'active_cohort'
                                ? 'sage'
                                : dossier.overallScore >= 80
                                  ? 'terracotta'
                                  : 'neutral'
                            }
                          >
                            {dossier.overallScore}%
                          </Badge>
                        ) : (
                          <Badge tone="neutral">{candidate.wingmanName}</Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-[var(--ink-secondary)]">
                        {candidate.occupation} · {candidate.city}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-[var(--ink-muted)]">
                        {candidate.bioTagline}
                      </p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </SpotlightCard>
      </aside>

      {/* Right: 3D Resonance Orb + Live Agent Lounge + Explainable Match Dossier */}
      <section className="space-y-6 lg:col-span-8">
        {actionError && (
          <div className="rounded-2xl border border-[var(--accent-danger)]/35 bg-[var(--accent-danger-soft)] px-4 py-3 text-sm text-[var(--accent-danger)]">
            {actionError}
          </div>
        )}

        {activeCandidate && (
          <SpotlightCard className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-hairline)] pb-4">
              <div className="flex items-center gap-3.5">
                <AvatarPortrait
                  config={activeCandidate.avatarConfig}
                  name={activeCandidate.displayName}
                  size={56}
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-editorial text-2xl font-normal text-[var(--ink-primary)] sm:text-3xl">
                      {activeCandidate.displayName}
                    </h3>
                    <Badge tone="charcoal">
                      <Bot className="h-3 w-3 text-[var(--accent-coral)]" />
                      Agent Lounge
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--ink-secondary)]">
                    {activeCandidate.occupation} · Wingman: {activeCandidate.wingmanName} ·{' '}
                    <span className="font-mono-label text-[11px]">
                      {activeCandidate.shareableInsightCount} shareable ({activeCandidate.privateContextCount} private withheld)
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {activeConversation && (
                  <Button variant="outline" size="sm" onClick={replayTranscript}>
                    <Play className="h-3.5 w-3.5" />
                    Replay Dialogue
                  </Button>
                )}
                <Button
                  data-testid="run-agent-interview-button"
                  onClick={() => onRunAgentMatch(activeCandidate.id)}
                  disabled={busyCandidateId === activeCandidate.id}
                >
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {busyCandidateId === activeCandidate.id
                      ? 'Agents Conversing...'
                      : activeConversation
                        ? 'Re-Run Agent Interview'
                        : 'Run Agent-to-Agent Interview'}
                  </span>
                </Button>
              </div>
            </div>

            {/* Interests */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {activeCandidate.interests.map((interest) => (
                <Badge key={interest} tone="neutral">
                  {interest}
                </Badge>
              ))}
            </div>

            {/* Signature WebGL Experience #2: Interactive 3D Compatibility Resonance Orb */}
            <div className="mt-5">
              <ResonanceOrbDynamic
                turnsVisible={visibleTurnsCount}
                totalTurns={activeConversation?.turns.length ?? 6}
                overallScore={activeDossier?.overallScore}
                isRunning={busyCandidateId === activeCandidate.id}
                userAgentName="Your Wingman"
                candidateAgentName={activeCandidate.wingmanName}
                theme={theme}
              />
            </div>

            {/* Stylized Agent Dialogue Feed */}
            {activeConversation ? (
              <div className="mt-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--accent-amber)]/30 bg-[var(--accent-amber-soft)] px-4 py-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-amber)]">
                    <Bot className="h-4 w-4" />
                    <span>AI-to-AI Simulation Transcript</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[var(--accent-sage)]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>
                      {activeConversation.privacyAuditPassed
                        ? 'Zero-Leak Privacy Audit Passed'
                        : 'Privacy Scrubbed'}
                    </span>
                  </div>
                </div>

                <div
                  data-testid="agent-lounge-transcript"
                  className="kindred-scroll space-y-2.5 max-h-[360px] overflow-y-auto pr-1"
                >
                  {activeConversation.turns
                    .slice(0, visibleTurnsCount)
                    .map((turn) => {
                      const isCandidateSpeaker = turn.speakerLabel.includes(
                        activeCandidate.wingmanName,
                      );
                      return (
                        <motion.div
                          key={turn.turnNumber}
                          variants={transcriptTurnVariants}
                          initial="hidden"
                          animate="visible"
                          className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--surface-elevated)]/85 p-3.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                            <span className="inline-flex items-center gap-2 font-semibold text-[var(--ink-primary)]">
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  isCandidateSpeaker
                                    ? 'bg-[var(--accent-amber)]'
                                    : 'bg-[var(--accent-coral)]'
                                }`}
                              />
                              Turn {turn.turnNumber} · {turn.speakerLabel}
                            </span>
                            <Badge tone="neutral">{turn.phase.replace(/_/g, ' ')}</Badge>
                          </div>
                          {turn.scenarioPrompt && (
                            <p className="mt-2 rounded-xl border border-[var(--accent-coral)]/25 bg-[var(--accent-coral-soft)] px-3 py-1.5 text-[11px] font-medium text-[var(--accent-coral)]">
                              {turn.scenarioPrompt}
                            </p>
                          )}
                          <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-primary)]">
                            {turn.message}
                          </p>
                          <p className="mt-2 font-mono-label text-[11px] text-[var(--accent-sage)]">
                            Signal: {turn.signalExtracted}
                          </p>
                        </motion.div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-subtle)]/40 p-7 text-center">
                <p className="text-sm font-medium text-[var(--ink-primary)]">
                  Ready for Privacy-Safe Agent Discovery
                </p>
                <p className="mx-auto mt-1 max-w-lg text-xs text-[var(--ink-secondary)]">
                  Click <strong>Run Agent-to-Agent Interview</strong> to watch the Resonance Orb weave both agents together as your Wingman explores values, conflict repair, and lifestyle rhythm with {activeCandidate.wingmanName}.
                </p>
              </div>
            )}
          </SpotlightCard>
        )}

        {/* Expandable Explainable Compatibility Dossier */}
        {activeDossier && activeCandidate && (
          <motion.div
            variants={bentoCardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
          >
            <SpotlightCard
              data-testid="match-dossier-card"
              className="p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-hairline)] pb-4">
                <div className="max-w-xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={activeDossier.meetsGamingThreshold ? 'sage' : 'danger'}>
                      {activeDossier.overallScore}% Overall Alignment
                    </Badge>
                    <Badge tone="neutral">Status: {activeDossier.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <h3 className="font-editorial mt-2.5 text-2xl font-normal text-[var(--ink-primary)] sm:text-3xl">
                    {activeDossier.headline}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--ink-secondary)]">
                    {activeDossier.complementaryPairingNote}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDossierExpanded((e) => !e)}
                  aria-expanded={dossierExpanded}
                >
                  {dossierExpanded ? (
                    <>
                      <span>Collapse Details</span>
                      <ChevronUp className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Expand Dossier</span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>

              {/* 4 Animated Radial Score Rings */}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <RadialScoreRing
                  label="Values"
                  value={activeDossier.subScores.values}
                  accentColor="var(--accent-coral)"
                />
                <RadialScoreRing
                  label="Emotional Rhythm"
                  value={activeDossier.subScores.emotionalRhythm}
                  accentColor="var(--accent-amber)"
                />
                <RadialScoreRing
                  label="Lifestyle"
                  value={activeDossier.subScores.lifestyle}
                  accentColor="var(--accent-sage)"
                />
                <RadialScoreRing
                  label="Playfulness"
                  value={activeDossier.subScores.playfulness}
                  accentColor="var(--accent-coral)"
                />
              </div>

              {/* Progressive Disclosure: Why You'll Click & Growth Edges */}
              {dossierExpanded && (
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--accent-sage)]/30 bg-[var(--accent-sage-soft)] p-4">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--accent-sage)]">
                      <CheckCircle2 className="h-4 w-4" />
                      Why You&apos;ll Click
                    </h4>
                    <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-[var(--ink-primary)]">
                      {activeDossier.whyYoudClick.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-[var(--accent-amber)]/30 bg-[var(--accent-amber-soft)] p-4">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--accent-amber)]">
                      <AlertTriangle className="h-4 w-4" />
                      Growth Edges &amp; Friction
                    </h4>
                    <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-[var(--ink-primary)]">
                      {activeDossier.potentialFrictionPoints.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-hairline)] pt-4">
                {!activeDossier.meetsGamingThreshold ? (
                  <p className="text-xs font-medium text-[var(--accent-danger)]">
                    Alignment is below the 80% threshold required to unlock Stage 3 Co-Op Games.
                  </p>
                ) : activeDossier.status === 'active_cohort' ? (
                  <p className="text-xs font-medium text-[var(--accent-sage)]">
                    In your Focused Cohort — Stage 3 Co-Op Games and Authentic Human Chat are unlocked!
                  </p>
                ) : activeDossier.status === 'awaiting_partner' ? (
                  <p className="text-xs font-medium text-[var(--accent-amber)]">
                    You accepted! Switch to {activeCandidate.displayName} in the top account switcher to accept mutually.
                  </p>
                ) : (
                  <p className="text-xs text-[var(--ink-secondary)]">
                    Accepting adds this connection to your 3-slot Focused Cohort.
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {activeDossier.status === 'active_cohort' ? (
                    <>
                      <Button
                        variant="sage"
                        data-testid="enter-coop-arena-button"
                        onClick={() => onEnterCoopArena(activeDossier.id)}
                      >
                        Launch Co-Op Game Arena
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => onDecideMatch(activeDossier.id, 'archive')}
                      >
                        Archive Slot
                      </Button>
                    </>
                  ) : activeDossier.status === 'passed' ? (
                    <Badge tone="danger">Passed (Final)</Badge>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        data-testid="pass-match-button"
                        onClick={() => onDecideMatch(activeDossier.id, 'pass')}
                      >
                        <XCircle className="h-4 w-4" />
                        Pass
                      </Button>
                      <Button
                        variant="sage"
                        data-testid="accept-match-button"
                        disabled={
                          !activeDossier.meetsGamingThreshold ||
                          activeDossier.status === 'awaiting_partner'
                        }
                        onClick={() => onDecideMatch(activeDossier.id, 'accept')}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {activeDossier.status === 'awaiting_partner'
                          ? 'Awaiting Partner'
                          : 'Accept into Focused Cohort'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </SpotlightCard>
          </motion.div>
        )}
      </section>
    </div>
  );
}
