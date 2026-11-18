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
import { Badge, Button } from '@/components/ui/primitives';
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
      <aside className="space-y-3 lg:col-span-4">
        <div className="editorial-card rounded-3xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-editorial text-xl font-semibold text-[#15181C]">
                Discovery Cohort
              </h2>
              <p className="text-xs text-[#535963]">
                6 seeded personas + active accounts. Send your Wingman to interview any candidate.
              </p>
            </div>
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
                <button
                  key={candidate.id}
                  type="button"
                  data-testid={`candidate-card-${candidate.id}`}
                  onClick={() => onSelectCandidate(candidate.id)}
                  className={`w-full rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#D96B4F] bg-white shadow-md'
                      : 'border-[#E4DDD2] bg-[#FAF7F2]/80 hover:bg-white'
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
                        <span className="font-semibold text-sm text-[#15181C]">
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
                          <Badge tone="neutral">Wingman: {candidate.wingmanName}</Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-[#535963]">
                        {candidate.occupation} · {candidate.city}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-[#7A808A]">
                        {candidate.bioTagline}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Right: Live Agent Lounge + Explainable Match Dossier */}
      <section className="space-y-6 lg:col-span-8">
        {actionError && (
          <div className="rounded-2xl border border-[#9B3B2E]/30 bg-[#9B3B2E]/10 px-4 py-3 text-sm text-[#9B3B2E]">
            {actionError}
          </div>
        )}

        {activeCandidate && (
          <div className="editorial-card rounded-3xl p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E4DDD2] pb-4">
              <div className="flex items-center gap-3.5">
                <AvatarPortrait
                  config={activeCandidate.avatarConfig}
                  name={activeCandidate.displayName}
                  size={56}
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-editorial text-2xl font-semibold text-[#15181C]">
                      {activeCandidate.displayName}
                    </h3>
                    <Badge tone="charcoal">
                      <Bot className="h-3 w-3 text-[#D96B4F]" />
                      Agent Lounge
                    </Badge>
                  </div>
                  <p className="text-xs text-[#535963]">
                    {activeCandidate.occupation} · Wingman: {activeCandidate.wingmanName} ·{' '}
                    {activeCandidate.shareableInsightCount} shareable signals (
                    {activeCandidate.privateContextCount} private withheld)
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

            {/* Agent Lounge Transcript */}
            {activeConversation ? (
              <div className="mt-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#C89B54]/35 bg-[#C89B54]/10 px-4 py-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#8A6427]">
                    <Bot className="h-4 w-4" />
                    <span>AI-to-AI Simulation Transcript</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#42614C]">
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
                  className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1"
                >
                  {activeConversation.turns
                    .slice(0, visibleTurnsCount)
                    .map((turn) => (
                      <motion.div
                        key={turn.turnNumber}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-[#E4DDD2] bg-[#FAF7F2] p-3.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <span className="font-semibold text-[#15181C]">
                            Turn {turn.turnNumber} · {turn.speakerLabel}
                          </span>
                          <Badge tone="neutral">{turn.phase.replace(/_/g, ' ')}</Badge>
                        </div>
                        {turn.scenarioPrompt && (
                          <p className="mt-1.5 rounded-lg bg-[#D96B4F]/10 px-2.5 py-1 text-[11px] font-medium text-[#B85137]">
                            {turn.scenarioPrompt}
                          </p>
                        )}
                        <p className="mt-1.5 text-sm leading-relaxed text-[#15181C]">
                          {turn.message}
                        </p>
                        <p className="mt-1.5 font-mono-label text-[11px] text-[#42614C]">
                          Signal: {turn.signalExtracted}
                        </p>
                      </motion.div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-[#DFD7CA] bg-[#FAF7F2]/60 p-8 text-center">
                <p className="text-sm font-medium text-[#15181C]">
                  Ready for Privacy-Safe Agent Discovery
                </p>
                <p className="mt-1 text-xs text-[#535963]">
                  Click <strong>Run Agent-to-Agent Interview</strong> to watch your Wingman probe values, emotional repair, and complementary lifestyle balance with {activeCandidate.wingmanName}.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Explainable Compatibility Dossier */}
        {activeDossier && activeCandidate && (
          <div
            data-testid="match-dossier-card"
            className="editorial-card rounded-3xl p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E4DDD2] pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={activeDossier.meetsGamingThreshold ? 'sage' : 'danger'}>
                    {activeDossier.overallScore}% Overall Alignment
                  </Badge>
                  <Badge tone="neutral">Status: {activeDossier.status.replace(/_/g, ' ')}</Badge>
                </div>
                <h3 className="font-editorial mt-2 text-2xl font-semibold text-[#15181C]">
                  {activeDossier.headline}
                </h3>
                <p className="mt-1 text-xs text-[#535963]">
                  {activeDossier.complementaryPairingNote}
                </p>
              </div>
            </div>

            {/* 4 Sub-scores */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Values', val: activeDossier.subScores.values },
                { label: 'Emotional Rhythm', val: activeDossier.subScores.emotionalRhythm },
                { label: 'Lifestyle', val: activeDossier.subScores.lifestyle },
                { label: 'Playfulness', val: activeDossier.subScores.playfulness },
              ].map((pill) => (
                <div
                  key={pill.label}
                  className="rounded-2xl border border-[#E4DDD2] bg-[#FAF7F2] p-3"
                >
                  <div className="flex items-center justify-between text-xs font-medium text-[#535963]">
                    <span>{pill.label}</span>
                    <span className="font-mono-label font-semibold text-[#15181C]">
                      {pill.val}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E4DDD2]">
                    <div
                      className="h-full rounded-full bg-[#D96B4F]"
                      style={{ width: `${pill.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Why You'd Click & Potential Friction */}
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#6E8F78]/30 bg-[#6E8F78]/8 p-4">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#42614C]">
                  <CheckCircle2 className="h-4 w-4" />
                  Why You&apos;d Click
                </h4>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#15181C]">
                  {activeDossier.whyYoudClick.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-[#C89B54]/35 bg-[#C89B54]/10 p-4">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8A6427]">
                  <AlertTriangle className="h-4 w-4" />
                  Potential Friction Points
                </h4>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#15181C]">
                  {activeDossier.potentialFrictionPoints.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E4DDD2] pt-4">
              {!activeDossier.meetsGamingThreshold ? (
                <p className="text-xs font-medium text-[#9B3B2E]">
                  Alignment is below the 80% threshold required to unlock Stage 3 Co-Op Games.
                </p>
              ) : activeDossier.status === 'active_cohort' ? (
                <p className="text-xs font-medium text-[#42614C]">
                  In your Focused Cohort — Stage 3 Co-Op Games and Authentic Human Chat are unlocked!
                </p>
              ) : activeDossier.status === 'awaiting_partner' ? (
                <p className="text-xs font-medium text-[#8A6427]">
                  You accepted! Switch to {activeCandidate.displayName} in the top account switcher to accept mutually.
                </p>
              ) : (
                <p className="text-xs text-[#535963]">
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
          </div>
        )}
      </section>
    </div>
  );
}
