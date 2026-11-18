import { NextRequest, NextResponse } from 'next/server';
import { buildShareableAgentPacket } from '@/lib/ai/prompts';
import { generateFutureModuleWithAi } from '@/lib/ai/provider';
import { withMatchLock } from '@/lib/concurrency';
import {
  computeSandboxSufficiency,
  KindredRepoError,
  KindredRepository,
  redactSimulationForCaller,
  syncAgentPersonaForUser,
} from '@/lib/db/repository';
import {
  handleRouteError,
  parseSafeJsonBody,
  resolveRequestedUserId,
} from '@/lib/http';
import type { FutureSimulation } from '@/lib/types/schemas';
import { createId, getOwnSafe, isSafeIdentifier, setOwnSafe } from '@/lib/utils';

function getAuthorizedMatchForSandbox(
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
  const userA = getOwnSafe(store.users, match.userAId)!;
  const userB = getOwnSafe(store.users, match.userBId)!;
  return { caller, match, userA, userB };
}

export async function GET(req: NextRequest) {
  try {
    const requestedUserId = resolveRequestedUserId(req);
    const activeUser = await KindredRepository.resolveActiveUser(requestedUserId);
    const matchId = req.nextUrl.searchParams.get('matchId') ?? '';

    const store = await KindredRepository.readSnapshot();
    const { match, userA, userB } = getAuthorizedMatchForSandbox(store, activeUser.id, matchId);

    const sufficiency = computeSandboxSufficiency(match, userA, userB);
    const sandboxConsent = {
      ...match.sandboxConsent,
      aiSufficiencyMet: sufficiency.aiSufficiencyMet,
      sufficiencyReason: sufficiency.sufficiencyReason,
      mutuallyUnlocked: sufficiency.aiSufficiencyMet ? match.sandboxConsent.mutuallyUnlocked : false,
    };

    const existingSim = Object.values(store.futureSimulations).find((s) => s.matchId === match.id);
    const simulation = redactSimulationForCaller(existingSim, {
      ...match,
      sandboxConsent,
    });

    return NextResponse.json({
      ok: true,
      matchId: match.id,
      sandboxConsent,
      simulation,
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

    if (!isSafeIdentifier(matchId)) {
      throw new KindredRepoError(400, 'INVALID_MATCH_ID', 'Valid matchId is required.');
    }

    return await withMatchLock(matchId, async () => {
      const updated = await KindredRepository.mutateStore((store) => {
        const { caller, match, userA, userB } = getAuthorizedMatchForSandbox(
          store,
          activeUser.id,
          matchId,
        );
        const isUserA = caller.id === userA.id;
        const partner = isUserA ? userB : userA;

        const sufficiency = computeSandboxSufficiency(match, userA, userB);
        match.sandboxConsent.aiSufficiencyMet = sufficiency.aiSufficiencyMet;
        match.sandboxConsent.sufficiencyReason = sufficiency.sufficiencyReason;

        const wantsConsent =
          typeof body.consent === 'boolean' ? body.consent : undefined;
        const wantsFamilyOptIn =
          typeof body.familyVisualizerOptIn === 'boolean'
            ? body.familyVisualizerOptIn
            : undefined;
        const wantsRevoke = body.action === 'revoke' || wantsConsent === false;

        if (wantsRevoke) {
          if (isUserA) match.sandboxConsent.userAConsented = false;
          else match.sandboxConsent.userBConsented = false;
          match.sandboxConsent.mutuallyUnlocked = false;
        } else if (wantsConsent === true) {
          if (!sufficiency.aiSufficiencyMet) {
            throw new KindredRepoError(
              403,
              'AI_SUFFICIENCY_REQUIRED',
              sufficiency.sufficiencyReason,
            );
          }
          if (isUserA) match.sandboxConsent.userAConsented = true;
          else match.sandboxConsent.userBConsented = true;

          // Seeded demo partners consent automatically once the human consents
          if (partner.isSeededDemo) {
            if (isUserA) match.sandboxConsent.userBConsented = true;
            else match.sandboxConsent.userAConsented = true;
          }

          if (match.sandboxConsent.userAConsented && match.sandboxConsent.userBConsented) {
            match.sandboxConsent.mutuallyUnlocked = true;
            match.sandboxConsent.unlockedAt =
              match.sandboxConsent.unlockedAt ?? new Date().toISOString();
          }
        }

        if (wantsFamilyOptIn !== undefined) {
          match.sandboxConsent.familyVisualizerOptIn = wantsFamilyOptIn;
          if (!wantsFamilyOptIn) {
            const sim = Object.values(store.futureSimulations).find(
              (s) => s.matchId === match.id,
            );
            if (sim) {
              delete sim.futureFamily;
            }
          }
        }

        match.updatedAt = new Date().toISOString();
        const existingSim = Object.values(store.futureSimulations).find(
          (s) => s.matchId === match.id,
        );

        return {
          sandboxConsent: structuredClone(match.sandboxConsent),
          simulation: redactSimulationForCaller(existingSim, match),
        };
      });

      return NextResponse.json({ ok: true, ...updated });
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
    const moduleName =
      typeof body.module === 'string' ? body.module.trim() : 'all';

    if (!isSafeIdentifier(matchId)) {
      throw new KindredRepoError(400, 'INVALID_MATCH_ID', 'Valid matchId is required.');
    }
    if (!['date_nights', 'world_adventure', 'future_family', 'all'].includes(moduleName)) {
      throw new KindredRepoError(400, 'INVALID_MODULE', 'Invalid Future Simulation module.');
    }

    return await withMatchLock(matchId, async () => {
      const storeBefore = await KindredRepository.readSnapshot();
      const { match, userA, userB } = getAuthorizedMatchForSandbox(
        storeBefore,
        activeUser.id,
        matchId,
      );

      const sufficiency = computeSandboxSufficiency(match, userA, userB);
      if (!sufficiency.aiSufficiencyMet || !match.sandboxConsent.mutuallyUnlocked) {
        throw new KindredRepoError(
          403,
          'DUAL_CONSENT_REQUIRED',
          'Both humans must click "Unlock Future Sandbox" after 60% onboarding sufficiency.',
        );
      }

      if (moduleName === 'future_family' && !match.sandboxConsent.familyVisualizerOptIn) {
        throw new KindredRepoError(
          403,
          'FAMILY_OPT_IN_REQUIRED',
          'Enable the opt-in Future Family & Kids Visualizer toggle before generating it.',
        );
      }

      const personaA =
        Object.values(storeBefore.personas).find((p) => p.userId === userA.id) ??
        syncAgentPersonaForUser(storeBefore, userA.id)!;
      const personaB =
        Object.values(storeBefore.personas).find((p) => p.userId === userB.id) ??
        syncAgentPersonaForUser(storeBefore, userB.id)!;

      const packetA = buildShareableAgentPacket(userA, personaA);
      const packetB = buildShareableAgentPacket(userB, personaB);

      const generated = await generateFutureModuleWithAi({
        matchId: match.id,
        userA,
        userB,
        packetA,
        packetB,
        sharedInterests: match.sharedInterests,
        module: moduleName as 'date_nights' | 'world_adventure' | 'future_family' | 'all',
        includeFamily: match.sandboxConsent.familyVisualizerOptIn,
      });

      const savedSim = await KindredRepository.mutateStore((store) => {
        const freshMatch = getOwnSafe(store.matches, match.id);
        if (!freshMatch) {
          throw new KindredRepoError(404, 'MATCH_NOT_FOUND', 'Match not found.');
        }
        const freshUserA = getOwnSafe(store.users, freshMatch.userAId)!;
        const freshUserB = getOwnSafe(store.users, freshMatch.userBId)!;
        const freshSuff = computeSandboxSufficiency(freshMatch, freshUserA, freshUserB);

        // Re-verify dual consent inside write lock to prevent mid-flight revocation races
        if (!freshSuff.aiSufficiencyMet || !freshMatch.sandboxConsent.mutuallyUnlocked) {
          throw new KindredRepoError(
            403,
            'DUAL_CONSENT_REQUIRED',
            'Future Sandbox consent was revoked or sufficiency dropped below 60%.',
          );
        }

        const existing = Object.values(store.futureSimulations).find(
          (s) => s.matchId === freshMatch.id,
        );
        const now = new Date().toISOString();

        const merged: FutureSimulation = {
          id: existing?.id ?? createId('sim'),
          matchId: freshMatch.id,
          verifiedDualConsentAt:
            existing?.verifiedDualConsentAt ??
            freshMatch.sandboxConsent.unlockedAt ??
            now,
          executionMode: generated.executionMode,
          dateNightBlueprints:
            generated.dateNightBlueprints ?? existing?.dateNightBlueprints,
          worldAdventure: generated.worldAdventure ?? existing?.worldAdventure,
          futureFamily: freshMatch.sandboxConsent.familyVisualizerOptIn
            ? generated.futureFamily ?? existing?.futureFamily
            : undefined,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };

        setOwnSafe(store.futureSimulations, merged.id, merged);
        return redactSimulationForCaller(merged, freshMatch);
      });

      return NextResponse.json({
        ok: true,
        simulation: savedSim,
      });
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
