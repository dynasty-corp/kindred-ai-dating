import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { GET as healthGet } from '@/app/api/health/route';
import { GET as profilesGet, POST as profilesPost } from '@/app/api/profiles/route';
import { POST as onboardingPost, PATCH as onboardingPatch } from '@/app/api/onboarding/route';
import { GET as matchGet, POST as matchPost, PATCH as matchPatch } from '@/app/api/agent-match/route';
import { GET as coopGet, POST as coopPost } from '@/app/api/coop-game/route';
import { GET as futureGet, PATCH as futurePatch, POST as futurePost } from '@/app/api/simulate-future/route';
import {
  reloadRepositoryFromDiskForTests,
  resetRepositoryForTests,
} from '@/lib/db/repository';

function jsonReq(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('KindredAI 3-Tier Repository, Full 4-Stage APIs & Concurrency Guards', () => {
  let tmpStorePath: string;

  beforeEach(() => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kindred-test-'));
    tmpStorePath = path.join(tmpDir, 'store.json');
    resetRepositoryForTests({ storePath: tmpStorePath });
  });

  it('persists across disk cold-reloads, degrades gracefully with disk disabled, and handles prototype keys', async () => {
    const hRes = await healthGet();
    const hJson = await hRes.json();
    expect(hRes.status).toBe(200);
    expect(hJson.ok).toBe(true);
    expect(hJson.seededCount).toBe(6);

    // Block prototype pollution keys
    const protoRes = await profilesPost(
      jsonReq('http://test.local/api/profiles', 'POST', {
        action: 'switch',
        userId: '__proto__',
      }),
    );
    expect(protoRes.status).toBe(400);

    // Create user & verify disk cold-reload persistence
    const createRes = await profilesPost(
      jsonReq('http://test.local/api/profiles', 'POST', {
        action: 'create',
        displayName: 'Alice Chen',
        age: 28,
        email: 'alice@kindred.test',
        interests: ['ceramics', 'tea'],
      }),
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    const aliceId = created.user.id;

    // Duplicate email rejected with 409
    const dupRes = await profilesPost(
      jsonReq('http://test.local/api/profiles', 'POST', {
        action: 'create',
        displayName: 'Alice Clone',
        age: 29,
        email: 'alice@kindred.test',
      }),
    );
    expect(dupRes.status).toBe(409);

    // Cold reload from disk
    const reloaded = reloadRepositoryFromDiskForTests();
    expect(reloaded.users[aliceId]?.displayName).toBe('Alice Chen');

    // Memory-only fallback when disk disabled
    resetRepositoryForTests({ disableDisk: true });
    const memHealth = await (await healthGet()).json();
    expect(memHealth.storageMode).toBe('memory_only');
  });

  it('drives Stage 1 onboarding 0% -> >=60% -> 100% and syncs Blueprint redactions', async () => {
    const cRes = await profilesPost(
      jsonReq('http://test.local/api/profiles', 'POST', {
        action: 'create',
        displayName: 'Noah Park',
        age: 30,
      }),
    );
    const { user: noah } = await cRes.json();

    const t1 = await (
      await onboardingPost(
        jsonReq('http://test.local/api/onboarding', 'POST', {
          userId: noah.id,
          message: 'I value same-night calm repair talks and warmth.',
        }),
      )
    ).json();
    expect(t1.user.onboardingProgress).toBeGreaterThanOrEqual(35);

    const t2 = await (
      await onboardingPost(
        jsonReq('http://test.local/api/onboarding', 'POST', {
          userId: noah.id,
          message: 'Keep this strictly private: SECRET_TURN_CANARY_8821.',
          isPrivateTurn: true,
        }),
      )
    ).json();
    expect(t2.user.onboardingProgress).toBeGreaterThanOrEqual(60);

    const t3 = await (
      await onboardingPost(
        jsonReq('http://test.local/api/onboarding', 'POST', {
          userId: noah.id,
          message: 'Long-term I want a warm family life and slow Sunday markets.',
        }),
      )
    ).json();
    expect(t3.user.onboardingProgress).toBe(100);
    expect(t3.user.onboardingCompleted).toBe(true);

    // Redact an insight and verify persona sync
    const insId = t3.user.blueprint[0].id;
    const pRes = await onboardingPatch(
      jsonReq('http://test.local/api/onboarding', 'PATCH', {
        userId: noah.id,
        action: 'redact',
        insightId: insId,
      }),
    );
    expect(pRes.status).toBe(200);
    const pJson = await pRes.json();
    expect(pJson.user.blueprint[0].visibility).toBe('redacted');

    // Verify private turn canary does not leak via candidate wire in profiles GET
    const profs = await (await profilesGet(new NextRequest('http://test.local/api/profiles?userId=user-default'))).json();
    expect(JSON.stringify(profs.candidates)).not.toContain('SECRET_TURN_CANARY_8821');
  });

  it('enforces Stage 2 complementary scoring, 3/3 cohort cap, canonical pair lock, and irreversible pass', async () => {
    // Maya scores >=80 on seed-1..4 and <80 on seed-5..6
    const m1 = await (
      await matchPost(
        jsonReq('http://test.local/api/agent-match', 'POST', {
          userId: 'user-default',
          candidateUserId: 'seed-1',
        }),
      )
    ).json();
    expect(m1.dossier.overallScore).toBeGreaterThanOrEqual(80);

    const m5 = await (
      await matchPost(
        jsonReq('http://test.local/api/agent-match', 'POST', {
          userId: 'user-default',
          candidateUserId: 'seed-5',
        }),
      )
    ).json();
    expect(m5.dossier.overallScore).toBeLessThan(80);
    expect(m5.dossier.meetsGamingThreshold).toBe(false);

    // Attempting to accept <80% returns 422
    const belowRes = await matchPatch(
      jsonReq('http://test.local/api/agent-match', 'PATCH', {
        userId: 'user-default',
        matchId: m5.dossier.id,
        action: 'accept',
      }),
    );
    expect(belowRes.status).toBe(422);

    // Passing is irreversible
    const passRes = await matchPatch(
      jsonReq('http://test.local/api/agent-match', 'PATCH', {
        userId: 'user-default',
        matchId: m5.dossier.id,
        action: 'pass',
      }),
    );
    expect(passRes.status).toBe(200);
    const archiveAfterPass = await matchPatch(
      jsonReq('http://test.local/api/agent-match', 'PATCH', {
        userId: 'user-default',
        matchId: m5.dossier.id,
        action: 'archive',
      }),
    );
    expect(archiveAfterPass.status).toBe(409);

    // Concurrent POST for same pair creates single canonical dossier
    const [cA, cB] = await Promise.all([
      matchPost(
        jsonReq('http://test.local/api/agent-match', 'POST', {
          userId: 'user-default',
          candidateUserId: 'seed-2',
        }),
      ),
      matchPost(
        jsonReq('http://test.local/api/agent-match', 'POST', {
          userId: 'user-default',
          candidateUserId: 'seed-2',
        }),
      ),
    ]);
    const jA = await cA.json();
    const jB = await cB.json();
    expect(jA.dossier.id).toBe(jB.dossier.id);

    // Fill 3/3 cohort cap (seed-1, seed-2, seed-3), then 4th (seed-4) returns 409 COHORT_FULL
    const m3 = await (
      await matchPost(
        jsonReq('http://test.local/api/agent-match', 'POST', {
          userId: 'user-default',
          candidateUserId: 'seed-3',
        }),
      )
    ).json();
    const m4 = await (
      await matchPost(
        jsonReq('http://test.local/api/agent-match', 'POST', {
          userId: 'user-default',
          candidateUserId: 'seed-4',
        }),
      )
    ).json();

    for (const id of [m1.dossier.id, jA.dossier.id, m3.dossier.id]) {
      const a = await matchPatch(
        jsonReq('http://test.local/api/agent-match', 'PATCH', {
          userId: 'user-default',
          matchId: id,
          action: 'accept',
        }),
      );
      expect(a.status).toBe(200);
    }

    const fourthAccept = await matchPatch(
      jsonReq('http://test.local/api/agent-match', 'PATCH', {
        userId: 'user-default',
        matchId: m4.dossier.id,
        action: 'accept',
      }),
    );
    expect(fourthAccept.status).toBe(409);
    const fourthJson = await fourthAccept.json();
    expect(fourthJson.error).toBe('COHORT_FULL');

    // Archive one slot and accept 4th cleanly
    await matchPatch(
      jsonReq('http://test.local/api/agent-match', 'PATCH', {
        userId: 'user-default',
        matchId: m3.dossier.id,
        action: 'archive',
      }),
    );
    const acceptAfterArchive = await matchPatch(
      jsonReq('http://test.local/api/agent-match', 'PATCH', {
        userId: 'user-default',
        matchId: m4.dossier.id,
        action: 'accept',
      }),
    );
    expect(acceptAfterArchive.status).toBe(200);

    // 404 before 403 ordering on GET /api/agent-match
    const unknownMatch = await matchGet(
      new NextRequest('http://test.local/api/agent-match?userId=user-default&matchId=match-nonexistent'),
    );
    expect(unknownMatch.status).toBe(404);
    const intruder = await matchGet(
      new NextRequest(`http://test.local/api/agent-match?userId=seed-6&matchId=${m1.dossier.id}`),
    );
    expect(intruder.status).toBe(403);
  });

  it('supports 2-real-human Co-Op games (wire redaction, concurrent turns, verbatim chat) and Stage 4 dual-consent + module merge', async () => {
    const aRes = await (
      await profilesPost(
        jsonReq('http://test.local/api/profiles', 'POST', {
          action: 'create',
          displayName: 'Alice',
          age: 29,
          interests: ['ceramics', 'espresso'],
        }),
      )
    ).json();
    const bRes = await (
      await profilesPost(
        jsonReq('http://test.local/api/profiles', 'POST', {
          action: 'create',
          displayName: 'Bob',
          age: 31,
          interests: ['architecture', 'jazz'],
        }),
      )
    ).json();
    const aliceId = aRes.user.id;
    const bobId = bRes.user.id;

    // Onboard both >= 60%
    for (const uid of [aliceId, bobId]) {
      await onboardingPost(
        jsonReq('http://test.local/api/onboarding', 'POST', {
          userId: uid,
          message: 'I value same-night calm repair, warm integrity, and slow Sunday coffee.',
        }),
      );
      await onboardingPost(
        jsonReq('http://test.local/api/onboarding', 'POST', {
          userId: uid,
          message: 'Looking for an intentional long-term partnership open to family.',
        }),
      );
    }

    const { dossier } = await (
      await matchPost(
        jsonReq('http://test.local/api/agent-match', 'POST', {
          userId: aliceId,
          candidateUserId: bobId,
        }),
      )
    ).json();
    expect(dossier.overallScore).toBeGreaterThanOrEqual(80);

    // Before mutual accept, Stage 3 returns 403 MATCH_NOT_ACTIVE
    const preGame = await coopGet(
      new NextRequest(`http://test.local/api/coop-game?userId=${aliceId}&matchId=${dossier.id}`),
    );
    expect(preGame.status).toBe(403);

    // Mutual accept: Alice -> awaiting_partner, Bob -> active_cohort
    const aAcc = await (
      await matchPatch(
        jsonReq('http://test.local/api/agent-match', 'PATCH', {
          userId: aliceId,
          matchId: dossier.id,
          action: 'accept',
        }),
      )
    ).json();
    expect(aAcc.dossier.status).toBe('awaiting_partner');
    const bAcc = await (
      await matchPatch(
        jsonReq('http://test.local/api/agent-match', 'PATCH', {
          userId: bobId,
          matchId: dossier.id,
          action: 'accept',
        }),
      )
    ).json();
    expect(bAcc.dossier.status).toBe('active_cohort');

    // Blind Trip Draft: Alice submits -> Bob's GET does NOT see Alice's pick until revealed
    await coopPost(
      jsonReq('http://test.local/api/coop-game', 'POST', {
        userId: aliceId,
        matchId: dossier.id,
        action: 'submit_blind_trip',
        pick: {
          budget: 'balanced_local',
          pace: 'slow_mornings',
          vibe: 'culinary_markets',
          wildcard: 'Midnight ceramic market',
        },
      }),
    );
    const bobViewBefore = await (
      await coopGet(new NextRequest(`http://test.local/api/coop-game?userId=${bobId}&matchId=${dossier.id}`))
    ).json();
    expect(bobViewBefore.sessions[0].blindTripState.revealed).toBe(false);
    expect(bobViewBefore.sessions[0].blindTripState.userAPick).toBeUndefined();

    // Bob submits -> reveals + synthesizes dreamItinerary
    const revealRes = await (
      await coopPost(
        jsonReq('http://test.local/api/coop-game', 'POST', {
          userId: bobId,
          matchId: dossier.id,
          action: 'submit_blind_trip',
          pick: {
            budget: 'boutique_splurge',
            pace: 'balanced_flow',
            vibe: 'coastal_architecture',
            wildcard: 'Sunset jazz bar',
          },
        }),
      )
    ).json();
    expect(revealRes.session.blindTripState.revealed).toBe(true);
    expect(revealRes.session.blindTripState.dreamItinerary.stops.length).toBeGreaterThan(0);

    // Authentic human chat: zero auto-reply for 2 real humans, 100% verbatim
    const chatRes = await (
      await coopPost(
        jsonReq('http://test.local/api/coop-game', 'POST', {
          userId: aliceId,
          matchId: dossier.id,
          action: 'send_human_chat',
          message: 'Hey Bob! Loved your sunset jazz wildcard.',
        }),
      )
    ).json();
    expect(chatRes.humanChatMessages).toHaveLength(1);
    expect(chatRes.humanChatMessages[0].authenticity).toBe('authentic_human');
    expect(chatRes.simulatedReply).toBeUndefined();

    // Wavelength rejects NaN/null and clamps 0..100
    const badWave = await coopPost(
      jsonReq('http://test.local/api/coop-game', 'POST', {
        userId: aliceId,
        matchId: dossier.id,
        action: 'submit_wavelength_guess',
        guess: null,
      }),
    );
    expect(badWave.status).toBe(400);

    // Stage 4 Dual Consent + Concurrent Module Generation Merge
    const preSim = await futurePost(
      jsonReq('http://test.local/api/simulate-future', 'POST', {
        userId: aliceId,
        matchId: dossier.id,
        module: 'date_nights',
      }),
    );
    expect(preSim.status).toBe(403);

    await futurePatch(
      jsonReq('http://test.local/api/simulate-future', 'PATCH', {
        userId: aliceId,
        matchId: dossier.id,
        consent: true,
      }),
    );
    const afterB = await (
      await futurePatch(
        jsonReq('http://test.local/api/simulate-future', 'PATCH', {
          userId: bobId,
          matchId: dossier.id,
          consent: true,
          familyVisualizerOptIn: true,
        }),
      )
    ).json();
    expect(afterB.sandboxConsent.mutuallyUnlocked).toBe(true);

    // Concurrent module generation preserves ALL 3 modules without clobbering
    await Promise.all([
      futurePost(
        jsonReq('http://test.local/api/simulate-future', 'POST', {
          userId: aliceId,
          matchId: dossier.id,
          module: 'date_nights',
        }),
      ),
      futurePost(
        jsonReq('http://test.local/api/simulate-future', 'POST', {
          userId: bobId,
          matchId: dossier.id,
          module: 'world_adventure',
        }),
      ),
      futurePost(
        jsonReq('http://test.local/api/simulate-future', 'POST', {
          userId: aliceId,
          matchId: dossier.id,
          module: 'future_family',
        }),
      ),
    ]);

    const finalFuture = await (
      await futureGet(new NextRequest(`http://test.local/api/simulate-future?userId=${aliceId}&matchId=${dossier.id}`))
    ).json();
    expect(finalFuture.simulation.dateNightBlueprints).toHaveLength(3);
    expect(finalFuture.simulation.worldAdventure.tripTitle).toBeTruthy();
    expect(finalFuture.simulation.futureFamily.portraitConcept.renderMode).toBe('svg_canvas_composer');

    // Revoking consent hides simulation immediately
    await futurePatch(
      jsonReq('http://test.local/api/simulate-future', 'PATCH', {
        userId: aliceId,
        matchId: dossier.id,
        consent: false,
      }),
    );
    const revokedView = await (
      await futureGet(new NextRequest(`http://test.local/api/simulate-future?userId=${bobId}&matchId=${dossier.id}`))
    ).json();
    expect(revokedView.simulation).toBeNull();
  });
});
