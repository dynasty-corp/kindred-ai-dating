import { NextRequest, NextResponse } from 'next/server';
import {
  buildShareableAgentPacket,
  verifyZeroPrivacyLeak,
} from '@/lib/ai/prompts';
import { generateAgentMatchWithAi } from '@/lib/ai/provider';
import {
  computeSandboxSufficiency,
  KindredRepoError,
  KindredRepository,
  MAX_COHORT_SIZE,
  syncAgentPersonaForUser,
} from '@/lib/db/repository';
import {
  handleRouteError,
  parseSafeJsonBody,
  resolveRequestedUserId,
} from '@/lib/http';
import type {
  AgentConversation,
  MatchDossier,
} from '@/lib/types/schemas';
import {
  canonicalPairKey,
  createId,
  getOwnSafe,
  isSafeIdentifier,
  setOwnSafe,
} from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const requestedUserId = resolveRequestedUserId(req);
    const activeUser = await KindredRepository.resolveActiveUser(requestedUserId);
    const matchId = req.nextUrl.searchParams.get('matchId');

    const store = await KindredRepository.readSnapshot();

    if (matchId !== null && matchId !== '') {
      if (!isSafeIdentifier(matchId)) {
        throw new KindredRepoError(400, 'INVALID_MATCH_ID', 'Invalid matchId.');
      }
      const match = getOwnSafe(store.matches, matchId);
      if (!match) {
        throw new KindredRepoError(404, 'MATCH_NOT_FOUND', 'Match dossier not found.');
      }
      if (match.userAId !== activeUser.id && match.userBId !== activeUser.id) {
        throw new KindredRepoError(403, 'NOT_MATCH_PARTICIPANT', 'You are not a participant in this match.');
      }
      const conversation = getOwnSafe(store.conversations, match.conversationId) ?? null;
      return NextResponse.json({ ok: true, match, conversation });
    }

    const matches = Object.values(store.matches).filter(
      (m) => m.userAId === activeUser.id || m.userBId === activeUser.id,
    );
    const conversations = Object.values(store.conversations).filter(
      (c) => c.initiatorUserId === activeUser.id || c.candidateUserId === activeUser.id,
    );

    return NextResponse.json({
      ok: true,
      matches,
      conversations,
      activeCohortCount: matches.filter((m) => m.status === 'active_cohort').length,
      maxCohortSize: MAX_COHORT_SIZE,
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

    const candidateUserId =
      typeof body.candidateUserId === 'string' ? body.candidateUserId.trim() : '';
    if (!isSafeIdentifier(candidateUserId)) {
      throw new KindredRepoError(400, 'INVALID_CANDIDATE_ID', 'Valid candidateUserId is required.');
    }
    if (candidateUserId === activeUser.id) {
      throw new KindredRepoError(400, 'SELF_MATCH_FORBIDDEN', 'Cannot run an agent match with yourself.');
    }

    const initialStore = await KindredRepository.readSnapshot();
    const candidateUser = getOwnSafe(initialStore.users, candidateUserId);
    if (!candidateUser) {
      throw new KindredRepoError(404, 'CANDIDATE_NOT_FOUND', 'Candidate user not found.');
    }

    const result = await KindredRepository.runInPairLock(activeUser.id, candidateUserId, async () => {
      const storeBefore = await KindredRepository.readSnapshot();
      const userA = getOwnSafe(storeBefore.users, activeUser.id);
      const userB = getOwnSafe(storeBefore.users, candidateUserId);
      if (!userA || !userB) {
        throw new KindredRepoError(404, 'USER_NOT_FOUND', 'Match participant not found.');
      }

      const pairKey = canonicalPairKey(userA.id, userB.id);
      const existingMatch = Object.values(storeBefore.matches).find(
        (m) => canonicalPairKey(m.userAId, m.userBId) === pairKey,
      );

      // Irreversible pass invariant: never resurrect a passed match
      if (existingMatch?.status === 'passed') {
        const existingConv = getOwnSafe(storeBefore.conversations, existingMatch.conversationId);
        return {
          conversation: existingConv,
          dossier: existingMatch,
          alreadyPassed: true,
        };
      }

      const personaA =
        Object.values(storeBefore.personas).find((p) => p.userId === userA.id) ??
        syncAgentPersonaForUser(storeBefore, userA.id)!;
      const personaB =
        Object.values(storeBefore.personas).find((p) => p.userId === userB.id) ??
        syncAgentPersonaForUser(storeBefore, userB.id)!;

      const packetA = buildShareableAgentPacket(userA, personaA);
      const packetB = buildShareableAgentPacket(userB, personaB);

      const generated = await generateAgentMatchWithAi({
        userA,
        userB,
        packetA,
        packetB,
      });

      const now = new Date().toISOString();
      const conversationId = createId('conv');
      const conversation: AgentConversation = {
        id: conversationId,
        initiatorUserId: userA.id,
        candidateUserId: userB.id,
        initiatorAgentId: personaA.id,
        candidateAgentId: personaB.id,
        isAiSimulationLabeled: true,
        privacyAuditPassed: verifyZeroPrivacyLeak(generated, [userA, userB]).clean,
        executionMode: generated.executionMode,
        status: 'completed',
        turns: generated.turns,
        startedAt: now,
        completedAt: now,
      };

      const saved = await KindredRepository.mutateStore((store) => {
        const freshA = getOwnSafe(store.users, userA.id)!;
        const freshB = getOwnSafe(store.users, userB.id)!;
        const freshExisting = Object.values(store.matches).find(
          (m) => canonicalPairKey(m.userAId, m.userBId) === pairKey,
        );
        if (freshExisting?.status === 'passed') {
          return {
            conversation: getOwnSafe(store.conversations, freshExisting.conversationId),
            dossier: structuredClone(freshExisting),
            alreadyPassed: true,
          };
        }

        setOwnSafe(store.conversations, conversation.id, conversation);

        const dossierId = freshExisting?.id ?? createId('match');
        const dossier: MatchDossier = freshExisting
          ? {
              ...freshExisting,
              conversationId: conversation.id,
              overallScore: generated.overallScore,
              meetsGamingThreshold: generated.overallScore >= 80,
              subScores: generated.subScores,
              headline: generated.headline,
              whyYoudClick: generated.whyYoudClick,
              potentialFrictionPoints: generated.potentialFrictionPoints,
              sharedInterests: generated.sharedInterests,
              complementaryPairingNote: generated.complementaryPairingNote,
              updatedAt: now,
            }
          : {
              id: dossierId,
              conversationId: conversation.id,
              userAId: freshA.id,
              userBId: freshB.id,
              overallScore: generated.overallScore,
              meetsGamingThreshold: generated.overallScore >= 80,
              subScores: generated.subScores,
              headline: generated.headline,
              whyYoudClick: generated.whyYoudClick,
              potentialFrictionPoints: generated.potentialFrictionPoints,
              sharedInterests: generated.sharedInterests,
              complementaryPairingNote: generated.complementaryPairingNote,
              userADecision: 'pending',
              userBDecision: 'pending',
              status: 'dossier_ready',
              humanChatMessages: [],
              sandboxConsent: {
                aiSufficiencyMet: false,
                sufficiencyReason: 'Both humans must accept into their Focused Cohort first.',
                userAConsented: false,
                userBConsented: false,
                mutuallyUnlocked: false,
                familyVisualizerOptIn: false,
              },
              createdAt: now,
              updatedAt: now,
            };

        const sufficiency = computeSandboxSufficiency(dossier, freshA, freshB);
        dossier.sandboxConsent.aiSufficiencyMet = sufficiency.aiSufficiencyMet;
        dossier.sandboxConsent.sufficiencyReason = sufficiency.sufficiencyReason;

        setOwnSafe(store.matches, dossier.id, dossier);

        return {
          conversation: structuredClone(conversation),
          dossier: structuredClone(dossier),
          alreadyPassed: false,
        };
      });

      return saved;
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await parseSafeJsonBody<Record<string, unknown>>(req);
    const requestedUserId = resolveRequestedUserId(req, body.userId);
    const activeUser = await KindredRepository.resolveActiveUser(requestedUserId);

    const matchId = typeof body.matchId === 'string' ? body.matchId.trim() : '';
    const action = typeof body.action === 'string' ? body.action.trim() : '';

    if (!isSafeIdentifier(matchId)) {
      throw new KindredRepoError(400, 'INVALID_MATCH_ID', 'Valid matchId is required.');
    }
    if (!['accept', 'pass', 'archive'].includes(action)) {
      throw new KindredRepoError(400, 'INVALID_ACTION', 'Action must be accept, pass, or archive.');
    }

    const updated = await KindredRepository.mutateStore((store) => {
      const caller = getOwnSafe(store.users, activeUser.id);
      if (!caller) {
        throw new KindredRepoError(404, 'USER_NOT_FOUND', 'User not found.');
      }

      // 404 before 403 ordering
      const match = getOwnSafe(store.matches, matchId);
      if (!match) {
        throw new KindredRepoError(404, 'MATCH_NOT_FOUND', 'Match dossier not found.');
      }
      if (match.userAId !== caller.id && match.userBId !== caller.id) {
        throw new KindredRepoError(403, 'NOT_MATCH_PARTICIPANT', 'You are not a participant in this match.');
      }

      const userA = getOwnSafe(store.users, match.userAId);
      const userB = getOwnSafe(store.users, match.userBId);
      if (!userA || !userB) {
        throw new KindredRepoError(404, 'USER_NOT_FOUND', 'Match participant not found.');
      }

      const isUserA = caller.id === userA.id;
      const partner = isUserA ? userB : userA;
      const now = new Date().toISOString();

      if (match.status === 'passed' && (action === 'accept' || action === 'archive')) {
        throw new KindredRepoError(
          409,
          'MATCH_ALREADY_PASSED',
          'Passed matches are final and cannot be archived or re-accepted.',
        );
      }

      if (action === 'pass') {
        if (isUserA) match.userADecision = 'passed';
        else match.userBDecision = 'passed';
        match.status = 'passed';
        match.sandboxConsent.mutuallyUnlocked = false;
        match.sandboxConsent.aiSufficiencyMet = false;
        match.updatedAt = now;
        userA.activeMatchIds = userA.activeMatchIds.filter((id) => id !== match.id);
        userB.activeMatchIds = userB.activeMatchIds.filter((id) => id !== match.id);
        return {
          dossier: structuredClone(match),
          activeCohortCount: caller.activeMatchIds.length,
        };
      }

      if (action === 'archive') {
        match.status = 'archived';
        match.sandboxConsent.mutuallyUnlocked = false;
        match.sandboxConsent.userAConsented = false;
        match.sandboxConsent.userBConsented = false;
        match.sandboxConsent.aiSufficiencyMet = false;
        match.updatedAt = now;
        userA.activeMatchIds = userA.activeMatchIds.filter((id) => id !== match.id);
        userB.activeMatchIds = userB.activeMatchIds.filter((id) => id !== match.id);
        return {
          dossier: structuredClone(match),
          activeCohortCount: caller.activeMatchIds.length,
        };
      }

      // action === 'accept'
      if (!match.meetsGamingThreshold || match.overallScore < 80) {
        throw new KindredRepoError(
          422,
          'BELOW_ALIGNMENT_THRESHOLD',
          `Alignment score (${match.overallScore}%) is below the 80% Focused Cohort threshold.`,
        );
      }

      const callerActiveOther = caller.activeMatchIds.filter((id) => id !== match.id);
      if (callerActiveOther.length >= MAX_COHORT_SIZE) {
        throw new KindredRepoError(
          409,
          'COHORT_FULL',
          `Focused Cohort cap reached (${MAX_COHORT_SIZE}/${MAX_COHORT_SIZE}). Archive an existing match to accept a new connection.`,
        );
      }

      const partnerActiveOther = partner.activeMatchIds.filter((id) => id !== match.id);
      if (partnerActiveOther.length >= MAX_COHORT_SIZE) {
        throw new KindredRepoError(
          409,
          'COHORT_FULL',
          `${partner.displayName}'s Focused Cohort is currently full (${MAX_COHORT_SIZE}/${MAX_COHORT_SIZE}).`,
        );
      }

      if (isUserA) match.userADecision = 'accepted';
      else match.userBDecision = 'accepted';

      // Seeded demo partner auto-accepts when compatible so solo tester reaches Stage 3
      if (partner.isSeededDemo) {
        if (isUserA) match.userBDecision = 'accepted';
        else match.userADecision = 'accepted';
      }

      if (match.userADecision === 'accepted' && match.userBDecision === 'accepted') {
        match.status = 'active_cohort';
        if (!userA.activeMatchIds.includes(match.id)) {
          userA.activeMatchIds = [...userA.activeMatchIds, match.id];
        }
        if (!userB.activeMatchIds.includes(match.id)) {
          userB.activeMatchIds = [...userB.activeMatchIds, match.id];
        }
      } else {
        match.status = 'awaiting_partner';
      }

      const sufficiency = computeSandboxSufficiency(match, userA, userB);
      match.sandboxConsent.aiSufficiencyMet = sufficiency.aiSufficiencyMet;
      match.sandboxConsent.sufficiencyReason = sufficiency.sufficiencyReason;
      match.updatedAt = now;

      return {
        dossier: structuredClone(match),
        activeCohortCount: caller.activeMatchIds.length,
      };
    });

    return NextResponse.json({
      ok: true,
      ...updated,
      maxCohortSize: MAX_COHORT_SIZE,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
