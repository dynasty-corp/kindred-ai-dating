'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
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
      {/* Left: Calm, Scannable Candidate List */}
      <aside className="lg:col-span-4">
        <SpotlightCard className="p-4 sm:p-5">
          <div className="mb-3.5 px-1">
            <h2 className="font-editorial text-2xl font-normal text-[var(--ink-primary)]">
              People to Meet
            </h2>
            <p className="mt-0.5 text-xs text-[var(--ink-secondary)]">
              Pick someone to let your wingmen talk first.
            </p>
          </div>

          <div className="space-y-2">
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
                  whileTap={{ scale: 0.985 }}
                  transition={KINDRED_SPRING}
                  data-testid={`candidate-card-${candidate.id}`}
                  onClick={() => onSelectCandidate(candidate.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[var(--accent-coral)] bg-[var(--surface-elevated)] shadow-sm'
                      : 'border-transparent bg-[var(--surface-subtle)]/65 hover:border-[var(--border-hairline)] hover:bg-[var(--surface-elevated)]'
                  }`}
                >
                  <AvatarPortrait
                    config={candidate.avatarConfig}
                    name={candidate.displayName}
                    size={42}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-[var(--ink-primary)]">
                        {candidate.displayName}, {candidate.age}
                      </span>
                      {dossier && (
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
                      )}
                    </div>
                    <p className="truncate text-xs text-[var(--ink-secondary)]">
                      {candidate.occupation} · {candidate.city}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </SpotlightCard>
      </aside>

      {/* Right: Focused Candidate Stage, Compatibility Dossier & Agent Lounge */}
      <section className="space-y-5 lg:col-span-8">
        {actionError && (
          <div className="rounded-2xl border border-[var(--accent-danger)]/35 bg-[var(--accent-danger-soft)] px-4 py-3 text-sm text-[var(--accent-danger)]">
            {actionError}
          </div>
        )}

        {activeCandidate && (
          <SpotlightCard className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <AvatarPortrait
                  config={activeCandidate.avatarConfig}
                  name={activeCandidate.displayName}
                  size={56}
                />
                <div>
                  <h3 className="font-editorial text-3xl font-normal text-[var(--ink-primary)]">
                    {activeCandidate.displayName}, {activeCandidate.age}
                  </h3>
                  <p className="text-xs text-[var(--ink-secondary)]">
                    {activeCandidate.occupation} · {activeCandidate.city}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {activeConversation && (
                  <Button variant="outline" size="sm" onClick={replayTranscript} className="rounded-full">
                    <Play className="h-3.5 w-3.5" />
                    Replay
                  </Button>
                )}
                <Button
                  data-testid="run-agent-interview-button"
                  onClick={() => onRunAgentMatch(activeCandidate.id)}
                  disabled={busyCandidateId === activeCandidate.id}
                  className="rounded-full px-5"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {busyCandidateId === activeCandidate.id
                      ? 'Wingmen Talking...'
                      : activeConversation
                        ? 'Re-Run Interview'
                        : 'Introduce Our Wingmen'}
                  </span>
                </Button>
              </div>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-[var(--ink-secondary)]">
              {activeCandidate.bioTagline}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {activeCandidate.interests.map((interest) => (
                <Badge key={interest} tone="neutral">
                  {interest}
                </Badge>
              ))}
            </div>

            {/* Signature 3D Resonance Orb */}
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

            {/* Compatibility Dossier right below the Orb for effortless decision-making */}
            {activeDossier && (
              <motion.div
                variants={bentoCardVariants}
                initial="hidden"
                animate="visible"
                data-testid="match-dossier-card"
                className="mt-6 rounded-3xl border border-[var(--border-hairline)] bg-[var(--surface-elevated)] p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone={activeDossier.meetsGamingThreshold ? 'sage' : 'danger'}>
                    {activeDossier.overallScore}% Overall Alignment
                  </Badge>
                  <span className="text-xs text-[var(--ink-muted)]">
                    {activeDossier.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <h4 className="font-editorial mt-2 text-2xl font-normal text-[var(--ink-primary)]">
                  {activeDossier.headline}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-[var(--ink-secondary)]">
                  {activeDossier.complementaryPairingNote}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
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

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-[var(--accent-sage-soft)] p-3.5">
                    <h5 className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-sage)]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Why You&apos;ll Click
                    </h5>
                    <ul className="mt-2 space-y-1 text-xs leading-relaxed text-[var(--ink-primary)]">
                      {activeDossier.whyYoudClick.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl bg-[var(--accent-amber-soft)] p-3.5">
                    <h5 className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-amber)]">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Growth Edges
                    </h5>
                    <ul className="mt-2 space-y-1 text-xs leading-relaxed text-[var(--ink-primary)]">
                      {activeDossier.potentialFrictionPoints.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Clear Primary Decision Bar */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-hairline)] pt-4">
                  <p className="text-xs text-[var(--ink-secondary)]">
                    {!activeDossier.meetsGamingThreshold
                      ? 'Below the 80% alignment threshold for Stage 3 Co-Op Play.'
                      : activeDossier.status === 'active_cohort'
                        ? 'Matched! Ready for Co-Op Play and authentic human chat.'
                        : activeDossier.status === 'awaiting_partner'
                          ? `Accepted — switch to ${activeCandidate.displayName} to accept mutually.`
                          : 'Accept to add to your 3-match focused circle.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    {activeDossier.status === 'active_cohort' ? (
                      <>
                        <Button
                          variant="sage"
                          data-testid="enter-coop-arena-button"
                          onClick={() => onEnterCoopArena(activeDossier.id)}
                          className="rounded-full px-5"
                        >
                          Play Together
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDecideMatch(activeDossier.id, 'archive')}
                          className="rounded-full"
                        >
                          Archive
                        </Button>
                      </>
                    ) : activeDossier.status === 'passed' ? (
                      <Badge tone="danger">Passed</Badge>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          data-testid="pass-match-button"
                          onClick={() => onDecideMatch(activeDossier.id, 'pass')}
                          className="rounded-full"
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
                          className="rounded-full px-5"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {activeDossier.status === 'awaiting_partner'
                            ? 'Awaiting Partner'
                            : 'Accept Match'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Agent-to-Agent Dialogue Transcript */}
            {activeConversation ? (
              <div className="mt-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink-primary)]">
                    <Bot className="h-4 w-4 text-[var(--accent-coral)]" />
                    <span>AI-to-AI Simulation Transcript</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-[11px] text-[var(--accent-sage)]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {activeConversation.privacyAuditPassed ? 'Private notes protected' : 'Privacy scrubbed'}
                  </span>
                </div>

                <div
                  data-testid="agent-lounge-transcript"
                  className="kindred-scroll space-y-2.5 max-h-[300px] overflow-y-auto pr-1"
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
                          className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--surface-subtle)]/70 p-3.5"
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px]">
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
                            <span className="text-[10px] capitalize text-[var(--ink-muted)]">
                              {turn.phase.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-primary)]">
                            {turn.message}
                          </p>
                          <p className="mt-1.5 text-[11px] text-[var(--accent-sage)]">
                            Signal: {turn.signalExtracted}
                          </p>
                        </motion.div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-subtle)]/40 p-6 text-center">
                <p className="text-sm font-medium text-[var(--ink-primary)]">
                  Ready for a privacy-safe introduction
                </p>
                <p className="mx-auto mt-1 max-w-md text-xs text-[var(--ink-secondary)]">
                  Click <strong>Introduce Our Wingmen</strong> to let your AI explore shared values and rhythm with {activeCandidate.wingmanName} before you invest human time.
                </p>
              </div>
            )}
          </SpotlightCard>
        )}
      </section>
    </div>
  );
}
