'use client';

import { useState } from 'react';
import * as RadioGroup from '@radix-ui/react-radio-group';
import {
  Compass,
  Gamepad2,
  KeyRound,
  MessageCircleHeart,
  Radio,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { AvatarPortrait } from '@/components/ui/AvatarPortrait';
import { Badge, Button, Slider } from '@/components/ui/primitives';
import type {
  BlindTripPick,
  CoopGameMode,
  CoopGameSession,
  MatchDossier,
  SanitizedCandidate,
} from '@/lib/types/schemas';
import { formatTimestamp } from '@/lib/utils';

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
      <div className="editorial-card rounded-3xl p-10 text-center">
        <Gamepad2 className="mx-auto h-10 w-10 text-[#D96B4F]" />
        <h2 className="font-editorial mt-3 text-2xl font-semibold text-[#15181C]">
          No Active Cohort Connections Yet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#535963]">
          Head to the <strong>Discovery &amp; Agent Lounge</strong> stage, run an Agent-to-Agent interview, and accept a 80%+ match into your Focused Cohort to unlock 2-Player Co-Op Games and Authentic Human Chat.
        </p>
      </div>
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

  return (
    <div className="space-y-5">
      {/* Match Selector Bar */}
      <div className="editorial-card flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {partner && (
            <AvatarPortrait config={partner.avatarConfig} name={partner.displayName} size={40} />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-[#15181C]">
                Playing with {partner?.displayName ?? partnerId}
              </span>
              <Badge tone="sage">{activeMatch.overallScore}% Cohort Match</Badge>
            </div>
            <p className="text-xs text-[#535963]">
              Shared anchors: {activeMatch.sharedInterests.join(', ') || 'Complementary curiosity'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeMatches.length > 1 && (
            <select
              value={activeMatch.id}
              onChange={(e) => onSelectMatch(e.target.value)}
              className="h-9 rounded-xl border border-[#DFD7CA] bg-white px-3 text-xs font-medium"
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
      </div>

      {error && (
        <div className="rounded-2xl border border-[#9B3B2E]/30 bg-[#9B3B2E]/10 px-4 py-3 text-sm text-[#9B3B2E]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: 3 Co-Op Game Modes */}
        <section className="editorial-card rounded-3xl p-5 sm:p-6 lg:col-span-7">
          <div className="flex flex-wrap gap-2 border-b border-[#E4DDD2] pb-4">
            <Button
              size="sm"
              variant={mode === 'blind_trip_draft' ? 'primary' : 'outline'}
              data-testid="mode-tab-blind_trip_draft"
              onClick={() => setMode('blind_trip_draft')}
            >
              <Compass className="h-3.5 w-3.5" />
              Blind World-Trip Draft
            </Button>
            <Button
              size="sm"
              variant={mode === 'coop_mystery_escape' ? 'primary' : 'outline'}
              data-testid="mode-tab-coop_mystery_escape"
              onClick={() => setMode('coop_mystery_escape')}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Co-Op Mystery Escape
            </Button>
            <Button
              size="sm"
              variant={mode === 'vibe_values_wavelength' ? 'primary' : 'outline'}
              data-testid="mode-tab-vibe_values_wavelength"
              onClick={() => setMode('vibe_values_wavelength')}
            >
              <Radio className="h-3.5 w-3.5" />
              Vibe &amp; Values Wavelength
            </Button>
          </div>

          {!currentSession ? (
            <div className="py-10 text-center">
              <h3 className="font-editorial text-2xl font-semibold text-[#15181C]">
                {mode === 'blind_trip_draft'
                  ? 'Blind World-Trip Draft'
                  : mode === 'coop_mystery_escape'
                    ? '4-Turn Co-Op Mystery Escape'
                    : 'Vibe & Values Wavelength'}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#535963]">
                {mode === 'blind_trip_draft'
                  ? 'Each player submits hidden travel picks (budget, pace, vibe, wildcard) before the AI reveals your blended dream itinerary.'
                  : mode === 'coop_mystery_escape'
                    ? 'A 4-turn interactive story puzzle tailored to your shared interests where both players must reach consensus.'
                    : 'Guess how your match answered onboarding-grounded spectrum prompts to measure real attunement.'}
              </p>
              <Button
                className="mt-5"
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
              {/* MODE 1: Blind Trip Draft */}
              {mode === 'blind_trip_draft' && currentSession.blindTripState && (
                <div data-testid="blind-trip-board" className="space-y-4">
                  {!currentSession.blindTripState.revealed ? (
                    <div className="space-y-4">
                      <div>
                        <p className="mb-1.5 text-xs font-semibold text-[#15181C]">Budget</p>
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
                              className={`rounded-xl border px-3 py-2 text-xs font-medium cursor-pointer ${
                                budget === val
                                  ? 'border-[#D96B4F] bg-[#D96B4F]/10 text-[#B85137]'
                                  : 'border-[#DFD7CA] bg-white text-[#535963]'
                              }`}
                            >
                              {label}
                            </RadioGroup.Item>
                          ))}
                        </RadioGroup.Root>
                      </div>

                      <div>
                        <p className="mb-1.5 text-xs font-semibold text-[#15181C]">Pace</p>
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
                              className={`rounded-xl border px-3 py-2 text-xs font-medium cursor-pointer ${
                                pace === val
                                  ? 'border-[#D96B4F] bg-[#D96B4F]/10 text-[#B85137]'
                                  : 'border-[#DFD7CA] bg-white text-[#535963]'
                              }`}
                            >
                              {label}
                            </RadioGroup.Item>
                          ))}
                        </RadioGroup.Root>
                      </div>

                      <div>
                        <p className="mb-1.5 text-xs font-semibold text-[#15181C]">Vibe</p>
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
                              className={`rounded-xl border px-3 py-2 text-xs font-medium cursor-pointer ${
                                vibe === val
                                  ? 'border-[#D96B4F] bg-[#D96B4F]/10 text-[#B85137]'
                                  : 'border-[#DFD7CA] bg-white text-[#535963]'
                              }`}
                            >
                              {label}
                            </RadioGroup.Item>
                          ))}
                        </RadioGroup.Root>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-[#15181C]">
                          Hidden Wildcard Must-Have
                        </label>
                        <input
                          data-testid="blind-trip-wildcard-input"
                          value={wildcard}
                          onChange={(e) => setWildcard(e.target.value)}
                          className="w-full rounded-xl border border-[#DFD7CA] bg-white px-3 py-2 text-sm"
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
                    </div>
                  ) : (
                    currentSession.blindTripState.dreamItinerary && (
                      <div
                        data-testid="dream-itinerary-reveal"
                        className="space-y-4 rounded-2xl border border-[#6E8F78]/35 bg-[#FAF7F2] p-5"
                      >
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
                        <h4 className="font-editorial text-xl font-semibold text-[#15181C]">
                          {currentSession.blindTripState.dreamItinerary.title}
                        </h4>
                        <p className="text-xs font-semibold text-[#B85137]">
                          Destination: {currentSession.blindTripState.dreamItinerary.destination}
                        </p>
                        <p className="text-xs leading-relaxed text-[#535963]">
                          {currentSession.blindTripState.dreamItinerary.synthesisNote}
                        </p>
                        <div className="space-y-2.5">
                          {currentSession.blindTripState.dreamItinerary.stops.map((stop, idx) => (
                            <div
                              key={idx}
                              className="rounded-xl border border-[#E4DDD2] bg-white p-3"
                            >
                              <p className="font-mono-label text-[11px] font-semibold text-[#42614C]">
                                {stop.dayLabel} — {stop.title}
                              </p>
                              <p className="mt-1 text-xs text-[#15181C]">{stop.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* MODE 2: Co-Op Mystery Escape */}
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
                  <h4 className="font-editorial text-xl font-semibold text-[#15181C]">
                    {currentSession.mysteryEscapeState.storyTitle}
                  </h4>

                  {currentSession.mysteryEscapeState.escaped ? (
                    <div className="space-y-3 rounded-2xl border border-[#6E8F78]/35 bg-[#6E8F78]/10 p-5">
                      <p className="text-sm font-semibold text-[#42614C]">
                        Vault Unlocked! 4-Turn Consensus Complete
                      </p>
                      <p className="text-xs leading-relaxed text-[#15181C]">
                        {currentSession.mysteryEscapeState.teamworkDebrief}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onStartGame(activeMatch.id, 'coop_mystery_escape', true)}
                      >
                        Replay Mystery
                      </Button>
                    </div>
                  ) : (
                    (() => {
                      const turn =
                        currentSession.mysteryEscapeState.turns[
                          currentSession.mysteryEscapeState.currentTurn - 1
                        ];
                      const chosen = selectedMysteryChoice || turn.userAChoiceId || turn.options[0].id;
                      return (
                        <div className="space-y-3 rounded-2xl border border-[#E4DDD2] bg-[#FAF7F2] p-4">
                          <p className="text-sm leading-relaxed text-[#15181C]">{turn.prompt}</p>
                          {turn.outcomeNote && (
                            <p className="rounded-xl bg-[#C89B54]/15 px-3 py-2 text-xs font-medium text-[#8A6427]">
                              {turn.outcomeNote}
                            </p>
                          )}
                          <div className="space-y-2">
                            {turn.options.map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                data-testid={`mystery-option-${opt.id}`}
                                onClick={() => setSelectedMysteryChoice(opt.id)}
                                className={`w-full rounded-xl border p-3 text-left transition cursor-pointer ${
                                  chosen === opt.id
                                    ? 'border-[#D96B4F] bg-white shadow-xs'
                                    : 'border-[#DFD7CA] bg-white/60 hover:bg-white'
                                }`}
                              >
                                <p className="text-xs font-semibold text-[#15181C]">{opt.label}</p>
                                <p className="mt-0.5 text-[11px] text-[#535963]">{opt.rationale}</p>
                              </button>
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
                    <div className="space-y-3 rounded-2xl border border-[#6E8F78]/35 bg-[#FAF7F2] p-5">
                      <h4 className="font-editorial text-xl font-semibold text-[#15181C]">
                        Wavelength Score: {currentSession.wavelengthState.overallWavelengthScore}%
                      </h4>
                      <p className="text-xs text-[#535963]">
                        {currentSession.wavelengthState.debriefNote}
                      </p>
                      <div className="space-y-2">
                        {currentSession.wavelengthState.rounds.map((r) => (
                          <div
                            key={r.roundNumber}
                            className="rounded-xl border border-[#E4DDD2] bg-white p-3 text-xs"
                          >
                            <div className="flex justify-between font-semibold">
                              <span>Round {r.roundNumber}</span>
                              <span className="text-[#42614C]">{r.roundScore}% match</span>
                            </div>
                            <p className="mt-1 text-[#535963]">{r.insightRevealed}</p>
                          </div>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onStartGame(activeMatch.id, 'vibe_values_wavelength', true)}
                      >
                        Play Again
                      </Button>
                    </div>
                  ) : (
                    (() => {
                      const round =
                        currentSession.wavelengthState.rounds[
                          currentSession.wavelengthState.currentRound - 1
                        ];
                      return (
                        <div className="space-y-4 rounded-2xl border border-[#E4DDD2] bg-[#FAF7F2] p-5">
                          <p className="text-sm font-medium text-[#15181C]">{round.prompt}</p>
                          <div className="space-y-2">
                            <Slider
                              aria-label="Wavelength position guess"
                              value={[wavelengthGuess]}
                              onValueChange={(vals) => setWavelengthGuess(vals[0] ?? 50)}
                              min={0}
                              max={100}
                            />
                            <div className="flex justify-between text-[11px] text-[#535963]">
                              <span>{round.leftAnchor}</span>
                              <span className="font-mono-label font-semibold text-[#D96B4F]">
                                Your Guess: {wavelengthGuess}
                              </span>
                              <span>{round.rightAnchor}</span>
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
        </section>

        {/* Right: 100% Authentic Human Chat Drawer */}
        <aside
          data-testid="human-chat-drawer"
          className="editorial-card flex flex-col rounded-3xl p-5 sm:p-6 lg:col-span-5"
        >
          <div className="mb-3 border-b border-[#E4DDD2] pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageCircleHeart className="h-4 w-4 text-[#D96B4F]" />
                <h3 className="font-editorial text-lg font-semibold text-[#15181C]">
                  Human Chat Drawer
                </h3>
              </div>
              <Badge tone="sage">
                <ShieldCheck className="h-3 w-3" />
                Zero AI Ghostwriting
              </Badge>
            </div>
            <p className="mt-1 text-[11px] text-[#535963]">
              Every message you type is sent 100% verbatim in your own authentic human voice — zero auto-write suggestions.
            </p>
          </div>

          <div
            data-testid="human-chat-messages"
            className="flex-1 space-y-2.5 overflow-y-auto pr-1 min-h-[260px] max-h-[380px]"
          >
            {activeMatch.humanChatMessages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#DFD7CA] p-6 text-center text-xs text-[#535963]">
                React to a move in the co-op game to kick off a real conversation with {partner?.displayName ?? 'your match'}.
              </div>
            ) : (
              activeMatch.humanChatMessages.map((msg) => {
                const isMine = msg.senderUserId === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        isMine
                          ? 'bg-[#15181C] text-[#FAF7F2]'
                          : 'border border-[#E4DDD2] bg-white text-[#15181C]'
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] opacity-75">
                        <span className="font-semibold">
                          {msg.senderName}
                          {msg.authenticity === 'simulated_demo_partner' ? ' (Demo Partner)' : ''}
                        </span>
                        <span>{formatTimestamp(msg.timestamp)}</span>
                      </div>
                      <p>{msg.content}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleChatSubmit} className="mt-3 flex gap-2 border-t border-[#E4DDD2] pt-3">
            <input
              data-testid="human-chat-input"
              value={chatDraft}
              onChange={(e) => setChatDraft(e.target.value)}
              placeholder={`Write in your own voice to ${partner?.displayName ?? 'your match'}...`}
              className="flex-1 rounded-xl border border-[#DFD7CA] bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#D96B4F]/40"
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
        </aside>
      </div>
    </div>
  );
}
