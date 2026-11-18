import { NextRequest, NextResponse } from 'next/server';
import {
  buildDeterministicCoopSession,
  buildSimulatedDemoChatReply,
  evaluateBlindTripItinerary,
} from '@/lib/ai/deterministic-engine';
import { withMatchLock } from '@/lib/concurrency';
import { KindredRepoError, KindredRepository } from '@/lib/db/repository';
import {
  handleRouteError,
  parseSafeJsonBody,
  resolveRequestedUserId,
} from '@/lib/http';
import {
  BlindTripPickSchema,
  CoopGameModeSchema,
  type CoopGameSession,
  type HumanChatMessage,
} from '@/lib/types/schemas';
import { createId, getOwnSafe, isSafeIdentifier, setOwnSafe } from '@/lib/utils';

function getAuthorizedActiveMatch(
  store: Awaited<ReturnType<typeof KindredRepository.readSnapshot>>,
  callerId: string,
  matchId: string,
) {
  if (!isSafeIdentifier(matchId)) {
    throw new KindredRepoError(400, 'INVALID_MATCH_ID', 'Valid matchId is required.');
  }
  const caller = getOwnSafe(store.users, callerId);
  if (!caller) {
    throw new KindredRepoError(404, 'USER_NOT_FOUND', 'User not found.');
  }
  const match = getOwnSafe(store.matches, matchId);
  if (!match) {
    throw new KindredRepoError(404, 'MATCH_NOT_FOUND', 'Match dossier not found.');
  }
  if (match.userAId !== caller.id && match.userBId !== caller.id) {
    throw new KindredRepoError(403, 'NOT_MATCH_PARTICIPANT', 'You are not a participant in this match.');
  }
  if (match.status !== 'active_cohort') {
    throw new KindredRepoError(
      403,
      'MATCH_NOT_ACTIVE',
      'Both humans must accept this match into the Focused Cohort before playing Co-Op games or chatting.',
    );
  }
  const userA = getOwnSafe(store.users, match.userAId)!;
  const userB = getOwnSafe(store.users, match.userBId)!;
  return { caller, match, userA, userB };
}

function redactSessionForCaller(
  session: CoopGameSession,
  userAId: string,
  userBId: string,
  callerId: string,
): CoopGameSession {
  const copy = structuredClone(session);
  if (copy.mode === 'blind_trip_draft' && copy.blindTripState && !copy.blindTripState.revealed) {
    if (callerId === userAId) {
      delete copy.blindTripState.userBPick;
    } else if (callerId === userBId) {
      delete copy.blindTripState.userAPick;
    } else {
      delete copy.blindTripState.userAPick;
      delete copy.blindTripState.userBPick;
    }
  }
  return copy;
}

export async function GET(req: NextRequest) {
  try {
    const requestedUserId = resolveRequestedUserId(req);
    const activeUser = await KindredRepository.resolveActiveUser(requestedUserId);
    const matchId = req.nextUrl.searchParams.get('matchId') ?? '';

    const store = await KindredRepository.readSnapshot();
    const { match } = getAuthorizedActiveMatch(store, activeUser.id, matchId);

    const sessions = Object.values(store.gameSessions)
      .filter((s) => s.matchId === match.id)
      .map((s) => redactSessionForCaller(s, match.userAId, match.userBId, activeUser.id));

    return NextResponse.json({
      ok: true,
      matchId: match.id,
      sessions,
      humanChatMessages: match.humanChatMessages,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseSafeJsonBody<Record<string, unknown>>(req);
    const requestedUserId = resolveRequestedUserId(req, body.userId);
    const activeUser = await KindredRepository.resolveActiveUser(requestedUserId);
    const matchId = typeof body.matchId === 'string' ? body.matchId.trim() : '';
    const action = typeof body.action === 'string' ? body.action.trim() : '';

    if (!isSafeIdentifier(matchId)) {
      throw new KindredRepoError(400, 'INVALID_MATCH_ID', 'Valid matchId is required.');
    }

    if (
      ![
        'start_game',
        'submit_blind_trip',
        'submit_mystery_choice',
        'submit_wavelength_guess',
        'send_human_chat',
      ].includes(action)
    ) {
      throw new KindredRepoError(400, 'INVALID_ACTION', 'Unsupported co-op action.');
    }

    return await withMatchLock(matchId, async () => {
      if (action === 'send_human_chat') {
        const rawText = typeof body.message === 'string' ? body.message : '';
        if (!rawText.trim() || rawText.length > 2000) {
          throw new KindredRepoError(
            400,
            'INVALID_CHAT_MESSAGE',
            'Chat message must be 1 to 2000 characters.',
          );
        }

        const result = await KindredRepository.mutateStore((store) => {
          const { caller, match, userA, userB } = getAuthorizedActiveMatch(
            store,
            activeUser.id,
            matchId,
          );
          const partner = caller.id === userA.id ? userB : userA;
          const now = new Date().toISOString();

          const humanMsg: HumanChatMessage = {
            id: createId('chat'),
            senderUserId: caller.id,
            senderName: caller.displayName,
            content: rawText,
            timestamp: now,
            authenticity: 'authentic_human',
          };
          match.humanChatMessages.push(humanMsg);

          let simulatedReply: HumanChatMessage | undefined;
          // ONLY seeded demo partners simulate a reply; real human pairs get ZERO AI ghostwriting or auto-replies
          if (partner.isSeededDemo) {
            simulatedReply = {
              id: createId('chat'),
              senderUserId: partner.id,
              senderName: partner.displayName,
              content: buildSimulatedDemoChatReply({
                partner,
                userMessage: rawText,
              }),
              timestamp: new Date().toISOString(),
              authenticity: 'simulated_demo_partner',
            };
            match.humanChatMessages.push(simulatedReply);
          }

          match.updatedAt = now;
          return {
            humanChatMessages: structuredClone(match.humanChatMessages),
            addedMessage: humanMsg,
            simulatedReply,
          };
        });

        return NextResponse.json({ ok: true, ...result });
      }

      if (action === 'start_game') {
        const parsedMode = CoopGameModeSchema.safeParse(body.mode);
        if (!parsedMode.success) {
          throw new KindredRepoError(400, 'INVALID_GAME_MODE', 'Invalid co-op game mode.');
        }

        const session = await KindredRepository.mutateStore((store) => {
          const { match, userA, userB } = getAuthorizedActiveMatch(store, activeUser.id, matchId);
          const existing = Object.values(store.gameSessions).find(
            (s) => s.matchId === match.id && s.mode === parsedMode.data,
          );
          if (existing && !body.restart) {
            return redactSessionForCaller(existing, match.userAId, match.userBId, activeUser.id);
          }

          const built = buildDeterministicCoopSession({
            mode: parsedMode.data,
            userA,
            userB,
            sharedInterests: match.sharedInterests,
          });
          const now = new Date().toISOString();
          const newSession: CoopGameSession = {
            id: existing?.id ?? createId('game'),
            matchId: match.id,
            mode: parsedMode.data,
            status: 'in_progress',
            tailoredInterestsUsed: built.tailoredInterestsUsed,
            executionMode: 'deterministic_simulation',
            blindTripState: built.blindTripState,
            mysteryEscapeState: built.mysteryEscapeState,
            wavelengthState: built.wavelengthState,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
          };
          setOwnSafe(store.gameSessions, newSession.id, newSession);
          return redactSessionForCaller(newSession, match.userAId, match.userBId, activeUser.id);
        });

        return NextResponse.json({ ok: true, session });
      }

      if (action === 'submit_blind_trip') {
        const parsedPick = BlindTripPickSchema.safeParse(body.pick);
        if (!parsedPick.success) {
          throw new KindredRepoError(400, 'INVALID_TRIP_PICK', 'Complete budget, pace, vibe, and wildcard are required.');
        }

        const session = await KindredRepository.mutateStore((store) => {
          const { caller, match, userA, userB } = getAuthorizedActiveMatch(
            store,
            activeUser.id,
            matchId,
          );
          let sess = Object.values(store.gameSessions).find(
            (s) => s.matchId === match.id && s.mode === 'blind_trip_draft',
          );
          const now = new Date().toISOString();
          if (!sess) {
            const built = buildDeterministicCoopSession({
              mode: 'blind_trip_draft',
              userA,
              userB,
              sharedInterests: match.sharedInterests,
            });
            sess = {
              id: createId('game'),
              matchId: match.id,
              mode: 'blind_trip_draft',
              status: 'in_progress',
              tailoredInterestsUsed: built.tailoredInterestsUsed,
              executionMode: 'deterministic_simulation',
              blindTripState: built.blindTripState,
              createdAt: now,
              updatedAt: now,
            };
            setOwnSafe(store.gameSessions, sess.id, sess);
          }

          if (!sess.blindTripState) {
            sess.blindTripState = { revealed: false };
          }

          const isUserA = caller.id === userA.id;
          const partner = isUserA ? userB : userA;

          if (isUserA) {
            sess.blindTripState.userAPick = parsedPick.data;
          } else {
            sess.blindTripState.userBPick = parsedPick.data;
          }

          // Seeded demo partner submits its complementary pick automatically
          if (partner.isSeededDemo) {
            const demoPick = {
              budget: 'balanced_local' as const,
              pace: 'slow_mornings' as const,
              vibe: 'coastal_architecture' as const,
              wildcard: `Hidden ${partner.interests[0] ?? 'espresso'} tasting stop at sunset`,
            };
            if (isUserA && !sess.blindTripState.userBPick) {
              sess.blindTripState.userBPick = demoPick;
            } else if (!isUserA && !sess.blindTripState.userAPick) {
              sess.blindTripState.userAPick = demoPick;
            }
          }

          if (sess.blindTripState.userAPick && sess.blindTripState.userBPick) {
            sess.blindTripState.revealed = true;
            sess.blindTripState.dreamItinerary = evaluateBlindTripItinerary({
              userA,
              userB,
              pickA: sess.blindTripState.userAPick,
              pickB: sess.blindTripState.userBPick,
              sharedInterests: match.sharedInterests,
            });
            sess.status = 'completed';
          }
          sess.updatedAt = now;
          return redactSessionForCaller(sess, match.userAId, match.userBId, caller.id);
        });

        return NextResponse.json({ ok: true, session });
      }

      if (action === 'submit_mystery_choice') {
        const choiceId = typeof body.choiceId === 'string' ? body.choiceId.trim() : '';
        if (!choiceId) {
          throw new KindredRepoError(400, 'INVALID_CHOICE', 'choiceId is required.');
        }

        const session = await KindredRepository.mutateStore((store) => {
          const { caller, match, userA, userB } = getAuthorizedActiveMatch(
            store,
            activeUser.id,
            matchId,
          );
          let sess = Object.values(store.gameSessions).find(
            (s) => s.matchId === match.id && s.mode === 'coop_mystery_escape',
          );
          const now = new Date().toISOString();
          if (!sess) {
            const built = buildDeterministicCoopSession({
              mode: 'coop_mystery_escape',
              userA,
              userB,
              sharedInterests: match.sharedInterests,
            });
            sess = {
              id: createId('game'),
              matchId: match.id,
              mode: 'coop_mystery_escape',
              status: 'in_progress',
              tailoredInterestsUsed: built.tailoredInterestsUsed,
              executionMode: 'deterministic_simulation',
              mysteryEscapeState: built.mysteryEscapeState,
              createdAt: now,
              updatedAt: now,
            };
            setOwnSafe(store.gameSessions, sess.id, sess);
          }

          const state = sess.mysteryEscapeState!;
          if (state.escaped || sess.status === 'completed') {
            throw new KindredRepoError(400, 'GAME_ALREADY_COMPLETED', 'Mystery Escape is already completed.');
          }

          const turnIdx = state.currentTurn - 1;
          const turn = state.turns[turnIdx];
          if (!turn || !turn.options.some((opt) => opt.id === choiceId)) {
            throw new KindredRepoError(400, 'INVALID_CHOICE', 'Selected choice does not belong to current turn.');
          }

          const isUserA = caller.id === userA.id;
          const partner = isUserA ? userB : userA;

          if (isUserA) turn.userAChoiceId = choiceId;
          else turn.userBChoiceId = choiceId;

          // Seeded demo partner behavior: on Turn 1, if demo hasn't picked yet and caller picked opt-2,
          // demo picks opt-1 once to show real split-choice consensus; once caller aligns or on later turns, demo aligns!
          if (partner.isSeededDemo) {
            const partnerExisting = isUserA ? turn.userBChoiceId : turn.userAChoiceId;
            let demoChoice = choiceId;
            if (state.currentTurn === 1 && !partnerExisting && choiceId !== turn.options[0].id) {
              demoChoice = turn.options[0].id;
            }
            if (isUserA) turn.userBChoiceId = demoChoice;
            else turn.userAChoiceId = demoChoice;
          }

          if (turn.userAChoiceId && turn.userBChoiceId) {
            if (turn.userAChoiceId === turn.userBChoiceId) {
              turn.consensusReached = true;
              turn.outcomeNote = `Consensus reached on "${turn.options.find((o) => o.id === choiceId)?.label}".`;
              if (state.currentTurn < 4) {
                state.currentTurn = (state.currentTurn + 1) as 1 | 2 | 3 | 4;
              } else {
                state.escaped = true;
                state.teamworkDebrief = `${userA.displayName} and ${userB.displayName} reached consensus across all 4 mystery turns around ${state.hobbyTheme}, balancing observation and adaptability without rushing.`;
                sess.status = 'completed';
              }
            } else {
              turn.consensusReached = false;
              turn.outcomeNote = 'Split picks! Agree on the same option to unlock this door together.';
            }
          }

          sess.updatedAt = now;
          return redactSessionForCaller(sess, match.userAId, match.userBId, caller.id);
        });

        return NextResponse.json({ ok: true, session });
      }

      // action === 'submit_wavelength_guess'
      if (typeof body.guess !== 'number' || !Number.isFinite(body.guess)) {
        throw new KindredRepoError(400, 'INVALID_GUESS', 'Numeric wavelength guess (0..100) is required.');
      }
      const clampedGuess = Math.max(0, Math.min(100, Math.round(body.guess)));

      const session = await KindredRepository.mutateStore((store) => {
        const { caller, match, userA, userB } = getAuthorizedActiveMatch(
          store,
          activeUser.id,
          matchId,
        );
        let sess = Object.values(store.gameSessions).find(
          (s) => s.matchId === match.id && s.mode === 'vibe_values_wavelength',
        );
        const now = new Date().toISOString();
        if (!sess) {
          const built = buildDeterministicCoopSession({
            mode: 'vibe_values_wavelength',
            userA,
            userB,
            sharedInterests: match.sharedInterests,
          });
          sess = {
            id: createId('game'),
            matchId: match.id,
            mode: 'vibe_values_wavelength',
            status: 'in_progress',
            tailoredInterestsUsed: built.tailoredInterestsUsed,
            executionMode: 'deterministic_simulation',
            wavelengthState: built.wavelengthState,
            createdAt: now,
            updatedAt: now,
          };
          setOwnSafe(store.gameSessions, sess.id, sess);
        }

        const state = sess.wavelengthState!;
        if (state.completed || sess.status === 'completed') {
          throw new KindredRepoError(400, 'GAME_ALREADY_COMPLETED', 'Wavelength game is already completed.');
        }

        const idx = state.currentRound - 1;
        const round = state.rounds[idx];
        const isUserA = caller.id === userA.id;
        if (isUserA) round.userAGuess = clampedGuess;
        else round.userBGuess = clampedGuess;

        const distance = Math.abs(clampedGuess - round.partnerActualPosition);
        round.roundScore = Math.max(0, Math.min(100, 100 - distance));

        if (state.currentRound < 3) {
          state.currentRound = (state.currentRound + 1) as 1 | 2 | 3;
        } else {
          state.completed = true;
          const scores = state.rounds.map((r) => r.roundScore ?? 70);
          state.overallWavelengthScore = Math.round(
            scores.reduce((a, b) => a + b, 0) / scores.length,
          );
          state.debriefNote = `You scored ${state.overallWavelengthScore}% attunement across 3 onboarding-grounded wavelength prompts.`;
          sess.status = 'completed';
        }
        sess.updatedAt = now;
        return redactSessionForCaller(sess, match.userAId, match.userBId, caller.id);
      });

      return NextResponse.json({ ok: true, session });
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
