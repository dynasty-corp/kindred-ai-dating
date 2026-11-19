'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Stage2Discovery } from '@/components/discovery/Stage2Discovery';
import { Stage4FutureStudio } from '@/components/future/Stage4FutureStudio';
import { Stage3GamesAndChat } from '@/components/games/Stage3GamesAndChat';
import { LandingFrontDoor } from '@/components/landing/LandingFrontDoor';
import { Stage1Onboarding } from '@/components/onboarding/Stage1Onboarding';
import {
  FocusedCohortModal,
  HeaderBar,
  NewProfileModal,
  type StageTab,
  type WorkspaceUserSummary,
} from '@/components/shell/HeaderAndModals';
import { stageTransitionVariants } from '@/lib/motion';
import type {
  AgentConversation,
  AgentPersona,
  BlindTripPick,
  CoopGameMode,
  CoopGameSession,
  FutureSimulation,
  MatchDossier,
  SanitizedCandidate,
  UserProfile,
} from '@/lib/types/schemas';

export default function KindredStudioPage() {
  const [viewMode, setViewMode] = useState<'landing' | 'studio'>('landing');
  const [stage, setStage] = useState<StageTab>('onboarding');
  const [aiMode, setAiMode] = useState<string>('deterministic_simulation');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activePersona, setActivePersona] = useState<AgentPersona | null>(null);
  const [users, setUsers] = useState<WorkspaceUserSummary[]>([]);
  const [candidates, setCandidates] = useState<SanitizedCandidate[]>([]);
  const [matches, setMatches] = useState<MatchDossier[]>([]);
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [activeCohortCount, setActiveCohortCount] = useState(0);
  const [maxCohortSize, setMaxCohortSize] = useState(3);

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>('seed-1');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [sessionsByMatch, setSessionsByMatch] = useState<Record<string, CoopGameSession[]>>({});
  const [simulationByMatch, setSimulationByMatch] = useState<Record<string, FutureSimulation | null>>({});

  const [newProfileOpen, setNewProfileOpen] = useState(false);
  const [cohortModalOpen, setCohortModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyCandidateId, setBusyCandidateId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const applyWorkspace = useCallback((data: {
    currentUser: UserProfile;
    activePersona: AgentPersona;
    users: WorkspaceUserSummary[];
    candidates: SanitizedCandidate[];
    matches: MatchDossier[];
    conversations: AgentConversation[];
    activeCohortCount: number;
    maxCohortSize: number;
  }) => {
    setCurrentUser(data.currentUser);
    setActivePersona(data.activePersona);
    setUsers(data.users);
    setCandidates(data.candidates);
    setMatches(data.matches);
    setConversations(data.conversations);
    setActiveCohortCount(data.activeCohortCount);
    setMaxCohortSize(data.maxCohortSize);

    if (typeof window !== 'undefined' && !data.currentUser.isSeededDemo) {
      try {
        window.localStorage.setItem(
          `kindred_backup_${data.currentUser.id}`,
          JSON.stringify(data.currentUser),
        );
      } catch {
        // ignore storage quota errors
      }
    }
  }, []);

  const loadWorkspace = useCallback(async () => {
    try {
      const [healthRes, profRes] = await Promise.all([
        fetch('/api/health', { cache: 'no-store' }),
        fetch('/api/profiles', { cache: 'no-store' }),
      ]);
      if (healthRes.ok) {
        const h = await healthRes.json();
        setAiMode(h.aiMode ?? 'deterministic_simulation');
      }
      if (profRes.ok) {
        const p = await profRes.json();
        applyWorkspace(p);
      }
    } catch {
      setErrorMsg('Unable to load KindredAI studio.');
    }
  }, [applyWorkspace]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [healthRes, profRes] = await Promise.all([
          fetch('/api/health', { cache: 'no-store' }),
          fetch('/api/profiles', { cache: 'no-store' }),
        ]);
        if (cancelled) return;
        if (healthRes.ok) {
          const h = await healthRes.json();
          setAiMode(h.aiMode ?? 'deterministic_simulation');
        }
        if (profRes.ok) {
          const p = await profRes.json();
          applyWorkspace(p);
        }
      } catch {
        if (!cancelled) setErrorMsg('Unable to load KindredAI studio.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyWorkspace]);

  const activeCohortMatches = matches.filter((m) => m.status === 'active_cohort');
  const activeMatchTargetId = selectedMatchId ?? activeCohortMatches[0]?.id ?? null;

  const refreshMatchGameAndFuture = useCallback(async (matchId: string) => {
    const [cgRes, simRes] = await Promise.all([
      fetch(`/api/coop-game?matchId=${encodeURIComponent(matchId)}`, { cache: 'no-store' }),
      fetch(`/api/simulate-future?matchId=${encodeURIComponent(matchId)}`, { cache: 'no-store' }),
    ]);
    if (cgRes.ok) {
      const cg = await cgRes.json();
      setSessionsByMatch((prev) => ({ ...prev, [matchId]: cg.sessions ?? [] }));
    }
    if (simRes.ok) {
      const sim = await simRes.json();
      setSimulationByMatch((prev) => ({ ...prev, [matchId]: sim.simulation ?? null }));
    }
  }, []);

  useEffect(() => {
    if (!activeMatchTargetId || (stage !== 'games' && stage !== 'future')) return;
    let cancelled = false;
    (async () => {
      const [cgRes, simRes] = await Promise.all([
        fetch(`/api/coop-game?matchId=${encodeURIComponent(activeMatchTargetId)}`, {
          cache: 'no-store',
        }),
        fetch(`/api/simulate-future?matchId=${encodeURIComponent(activeMatchTargetId)}`, {
          cache: 'no-store',
        }),
      ]);
      if (cancelled) return;
      if (cgRes.ok) {
        const cg = await cgRes.json();
        setSessionsByMatch((prev) => ({ ...prev, [activeMatchTargetId]: cg.sessions ?? [] }));
      }
      if (simRes.ok) {
        const sim = await simRes.json();
        setSimulationByMatch((prev) => ({
          ...prev,
          [activeMatchTargetId]: sim.simulation ?? null,
        }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stage, activeMatchTargetId]);

  const handleSwitchUser = async (userId: string) => {
    setErrorMsg(null);
    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'switch', userId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(data.message ?? 'Could not switch profile.');
      return;
    }
    applyWorkspace(data);
    setSelectedMatchId(null);
  };

  const handleCreateProfile = async (payload: {
    displayName: string;
    age: number;
    pronouns: string;
    city: string;
    occupation: string;
    bioTagline: string;
    interests: string[];
    wingmanName: string;
  }) => {
    setProfileError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.message ?? 'Could not create profile.');
        return;
      }
      applyWorkspace(data);
      setNewProfileOpen(false);
      setStage('onboarding');
    } finally {
      setBusy(false);
    }
  };

  const handleResetDemo = async () => {
    setErrorMsg(null);
    setBusy(true);
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_demo' }),
      });
      const data = await res.json();
      if (res.ok) {
        applyWorkspace(data);
        setSessionsByMatch({});
        setSimulationByMatch({});
        setSelectedMatchId(null);
        setStage('onboarding');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSendWingmanMessage = async (message: string, isPrivateTurn: boolean) => {
    setErrorMsg(null);
    setBusy(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, isPrivateTurn }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message ?? 'Wingman turn failed.');
        return;
      }
      await loadWorkspace();
    } finally {
      setBusy(false);
    }
  };

  const handleMutateBlueprint = async (payload: Record<string, unknown>) => {
    setErrorMsg(null);
    setBusy(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message ?? 'Blueprint update failed.');
        return;
      }
      await loadWorkspace();
    } finally {
      setBusy(false);
    }
  };

  const handleRunAgentMatch = async (candidateUserId: string) => {
    setErrorMsg(null);
    setBusyCandidateId(candidateUserId);
    try {
      const res = await fetch('/api/agent-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message ?? 'Agent interview failed.');
        return;
      }
      await loadWorkspace();
    } finally {
      setBusyCandidateId(null);
    }
  };

  const handleDecideMatch = async (
    matchId: string,
    action: 'accept' | 'pass' | 'archive',
  ) => {
    setErrorMsg(null);
    setBusy(true);
    try {
      const res = await fetch('/api/agent-match', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message ?? 'Could not update match decision.');
        return;
      }
      await loadWorkspace();
      if (action === 'accept' && data.dossier?.status === 'active_cohort') {
        setSelectedMatchId(matchId);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleStartGame = async (matchId: string, mode: CoopGameMode, restart?: boolean) => {
    setErrorMsg(null);
    setBusy(true);
    try {
      const res = await fetch('/api/coop-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_game', matchId, mode, restart }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message ?? 'Failed to start co-op game.');
        return;
      }
      await refreshMatchGameAndFuture(matchId);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitBlindTrip = async (matchId: string, pick: BlindTripPick) => {
    setErrorMsg(null);
    setBusy(true);
    try {
      const res = await fetch('/api/coop-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit_blind_trip', matchId, pick }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message ?? 'Could not submit blind trip pick.');
        return;
      }
      await refreshMatchGameAndFuture(matchId);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitMysteryChoice = async (matchId: string, choiceId: string) => {
    setErrorMsg(null);
    setBusy(true);
    try {
      const res = await fetch('/api/coop-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit_mystery_choice', matchId, choiceId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message ?? 'Could not submit mystery choice.');
        return;
      }
      await refreshMatchGameAndFuture(matchId);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitWavelengthGuess = async (matchId: string, guess: number) => {
    setErrorMsg(null);
    setBusy(true);
    try {
      const res = await fetch('/api/coop-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit_wavelength_guess', matchId, guess }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message ?? 'Could not submit wavelength guess.');
        return;
      }
      await refreshMatchGameAndFuture(matchId);
    } finally {
      setBusy(false);
    }
  };

  const handleSendHumanChat = async (matchId: string, message: string) => {
    setErrorMsg(null);
    setBusy(true);
    try {
      const res = await fetch('/api/coop-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_human_chat', matchId, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message ?? 'Could not send chat message.');
        return;
      }
      await loadWorkspace();
    } finally {
      setBusy(false);
    }
  };

  const handleToggleConsent = async (matchId: string, consent: boolean) => {
    setErrorMsg(null);
    setBusy(true);
    try {
      const res = await fetch('/api/simulate-future', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, consent }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message ?? 'Could not update consent.');
        return;
      }
      await loadWorkspace();
      await refreshMatchGameAndFuture(matchId);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleFamilyOptIn = async (matchId: string, optIn: boolean) => {
    setErrorMsg(null);
    setBusy(true);
    try {
      const res = await fetch('/api/simulate-future', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, familyVisualizerOptIn: optIn }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message ?? 'Could not update Family Visualizer opt-in.');
        return;
      }
      await loadWorkspace();
      await refreshMatchGameAndFuture(matchId);
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateFutureModule = async (
    matchId: string,
    module: 'date_nights' | 'world_adventure' | 'future_family' | 'all',
  ) => {
    setErrorMsg(null);
    setBusy(true);
    try {
      const res = await fetch('/api/simulate-future', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, module }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message ?? 'Failed to generate Future Studio module.');
        return;
      }
      setSimulationByMatch((prev) => ({ ...prev, [matchId]: data.simulation ?? null }));
    } finally {
      setBusy(false);
    }
  };

  const handleStartFromHero = async (thought: string) => {
    setViewMode('studio');
    setStage('onboarding');
    await handleSendWingmanMessage(thought, false);
  };

  if (viewMode === 'landing') {
    return (
      <MotionConfig reducedMotion="user">
        <LandingFrontDoor
          onStartWithThought={handleStartFromHero}
          onStartInstantDemo={() => {
            setStage('discovery');
            setViewMode('studio');
          }}
          onEnterOnboarding={() => {
            setStage('onboarding');
            setViewMode('studio');
          }}
          busy={busy}
        />
      </MotionConfig>
    );
  }

  if (!currentUser || !activePersona) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--surface-canvas)] text-sm text-[var(--ink-secondary)]">
        <div className="h-9 w-9 animate-pulse rounded-2xl border border-[var(--border-hairline)] bg-[var(--accent-coral-soft)]" />
        <span className="font-editorial text-2xl text-[var(--ink-primary)]">KindredAI</span>
        <span className="text-xs text-[var(--ink-muted)]">Warming up your editorial studio...</span>
      </div>
    );
  }

  const currentUserSummary = users.find((u) => u.id === currentUser.id) ?? {
    id: currentUser.id,
    displayName: currentUser.displayName,
    isSeededDemo: currentUser.isSeededDemo,
    onboardingProgress: currentUser.onboardingProgress,
    activeCohortCount,
    occupation: currentUser.occupation,
    city: currentUser.city,
    avatarConfig: currentUser.avatarConfig,
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen bg-[var(--surface-canvas)] text-[var(--ink-primary)]">
        <HeaderBar
          stage={stage}
          onSelectStage={(next) => {
            setErrorMsg(null);
            setStage(next);
          }}
          onReturnToLanding={() => setViewMode('landing')}
          currentUser={currentUserSummary}
          users={users}
          activeCohortCount={activeCohortCount}
          maxCohortSize={maxCohortSize}
          aiMode={aiMode}
          onSwitchUser={handleSwitchUser}
          onOpenNewProfile={() => {
            setProfileError(null);
            setNewProfileOpen(true);
          }}
          onOpenCohort={() => setCohortModalOpen(true)}
          onResetDemo={handleResetDemo}
        />

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">

          <AnimatePresence mode="wait">
            {stage === 'onboarding' && (
              <motion.div
                key="stage-onboarding"
                variants={stageTransitionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <Stage1Onboarding
                  user={currentUser}
                  persona={activePersona}
                  busy={busy}
                  onSendMessage={handleSendWingmanMessage}
                  onMutateBlueprint={handleMutateBlueprint}
                  onGoToDiscovery={() => setStage('discovery')}
                />
              </motion.div>
            )}

            {stage === 'discovery' && (
              <motion.div
                key="stage-discovery"
                variants={stageTransitionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <Stage2Discovery
                  currentUserId={currentUser.id}
                  candidates={candidates}
                  matches={matches}
                  conversations={conversations}
                  selectedCandidateId={selectedCandidateId}
                  onSelectCandidate={setSelectedCandidateId}
                  onRunAgentMatch={handleRunAgentMatch}
                  onDecideMatch={handleDecideMatch}
                  onEnterCoopArena={(matchId) => {
                    setSelectedMatchId(matchId);
                    setStage('games');
                  }}
                  busyCandidateId={busyCandidateId}
                  actionError={errorMsg}
                />
              </motion.div>
            )}

            {stage === 'games' && (
              <motion.div
                key="stage-games"
                variants={stageTransitionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <Stage3GamesAndChat
                  currentUserId={currentUser.id}
                  activeMatches={activeCohortMatches}
                  candidates={candidates}
                  selectedMatchId={selectedMatchId}
                  sessions={
                    sessionsByMatch[selectedMatchId ?? activeCohortMatches[0]?.id ?? ''] ?? []
                  }
                  onSelectMatch={(matchId) => setSelectedMatchId(matchId)}
                  onStartGame={handleStartGame}
                  onSubmitBlindTrip={handleSubmitBlindTrip}
                  onSubmitMysteryChoice={handleSubmitMysteryChoice}
                  onSubmitWavelengthGuess={handleSubmitWavelengthGuess}
                  onSendHumanChat={handleSendHumanChat}
                  onGoToFutureStudio={() => setStage('future')}
                  busy={busy}
                  error={errorMsg}
                />
              </motion.div>
            )}

            {stage === 'future' && (
              <motion.div
                key="stage-future"
                variants={stageTransitionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <Stage4FutureStudio
                  currentUserId={currentUser.id}
                  activeMatches={activeCohortMatches}
                  candidates={candidates}
                  selectedMatchId={selectedMatchId}
                  simulationByMatchId={simulationByMatch}
                  onSelectMatch={(matchId) => setSelectedMatchId(matchId)}
                  onToggleConsent={handleToggleConsent}
                  onToggleFamilyOptIn={handleToggleFamilyOptIn}
                  onGenerateModule={handleGenerateFutureModule}
                  busy={busy}
                  error={errorMsg}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <NewProfileModal
          open={newProfileOpen}
          onOpenChange={setNewProfileOpen}
          onCreate={handleCreateProfile}
          busy={busy}
          error={profileError}
        />

        <FocusedCohortModal
          open={cohortModalOpen}
          onOpenChange={setCohortModalOpen}
          activeMatches={activeCohortMatches}
          candidates={candidates}
          currentUserId={currentUser.id}
          maxCohortSize={maxCohortSize}
          onArchiveMatch={async (matchId) => {
            await handleDecideMatch(matchId, 'archive');
          }}
          onOpenMatchInArena={(matchId) => {
            setSelectedMatchId(matchId);
            setStage('games');
          }}
        />
      </div>
    </MotionConfig>
  );
}
