import { NextRequest, NextResponse } from 'next/server';
import { generateOnboardingTurnWithAi } from '@/lib/ai/provider';
import {
  KindredRepoError,
  KindredRepository,
  syncAgentPersonaForUser,
} from '@/lib/db/repository';
import {
  handleRouteError,
  parseSafeJsonBody,
  resolveRequestedUserId,
} from '@/lib/http';
import {
  BlueprintDimensionSchema,
  BlueprintVisibilitySchema,
  type BlueprintInsight,
} from '@/lib/types/schemas';
import { createId, getOwnSafe, isSafeIdentifier } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const requestedUserId = resolveRequestedUserId(req);
    const user = await KindredRepository.resolveActiveUser(requestedUserId);
    const store = await KindredRepository.readSnapshot();
    const persona = Object.values(store.personas).find((p) => p.userId === user.id);

    return NextResponse.json({
      ok: true,
      user,
      persona,
      blueprint: user.blueprint,
      onboardingMessages: user.onboardingMessages,
      onboardingProgress: user.onboardingProgress,
      onboardingCompleted: user.onboardingCompleted,
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

    const rawMessage = typeof body.message === 'string' ? body.message.trim() : '';
    if (!rawMessage || rawMessage.length > 8000) {
      throw new KindredRepoError(
        400,
        'INVALID_MESSAGE',
        'Message is required and must be 1 to 8000 characters.',
      );
    }

    const isPrivateTurn = Boolean(body.isPrivateTurn);
    const snapshot = await KindredRepository.readSnapshot();
    const persona = Object.values(snapshot.personas).find((p) => p.userId === activeUser.id);
    const wingmanName = persona?.wingmanName ?? 'Sage';

    const aiTurn = await generateOnboardingTurnWithAi({
      user: activeUser,
      wingmanName,
      message: rawMessage,
      isPrivateTurn,
    });

    const updated = await KindredRepository.mutateStore((store) => {
      const user = getOwnSafe(store.users, activeUser.id);
      if (!user) {
        throw new KindredRepoError(404, 'USER_NOT_FOUND', 'User not found.');
      }

      const now = new Date().toISOString();
      user.onboardingMessages.push({
        id: createId('msg'),
        role: 'user',
        content: rawMessage,
        timestamp: now,
        isPrivateTurn: isPrivateTurn || aiTurn.guardrailTriggered,
      });

      user.onboardingMessages.push({
        id: createId('msg'),
        role: 'wingman',
        content: aiTurn.wingmanReply,
        timestamp: new Date().toISOString(),
        isPrivateTurn: false,
        guardrailNote: aiTurn.guardrailNote,
      });

      for (const ins of aiTurn.extractedInsights) {
        user.blueprint.push({
          id: createId('ins'),
          dimension: ins.dimension,
          title: ins.title,
          summary: ins.summary,
          visibility: ins.visibility,
          confidence: ins.confidence,
          source: 'wingman_extracted',
          updatedAt: now,
        });
      }

      if (!aiTurn.guardrailTriggered) {
        user.onboardingProgress = Math.min(100, user.onboardingProgress + aiTurn.progressDelta);
        if (user.onboardingProgress >= 100) {
          user.onboardingProgress = 100;
          user.onboardingCompleted = true;
        }
      }
      user.updatedAt = now;

      const syncedPersona = syncAgentPersonaForUser(store, user.id);
      return {
        user: structuredClone(user),
        persona: syncedPersona ? structuredClone(syncedPersona) : undefined,
      };
    });

    return NextResponse.json({
      ok: true,
      executionMode: aiTurn.executionMode,
      guardrailTriggered: aiTurn.guardrailTriggered,
      guardrailNote: aiTurn.guardrailNote,
      followUpQuestion: aiTurn.followUpQuestion,
      ...updated,
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
    const action = typeof body.action === 'string' ? body.action : '';

    if (!['add', 'update', 'toggle_visibility', 'redact', 'remove'].includes(action)) {
      throw new KindredRepoError(400, 'INVALID_ACTION', 'Invalid blueprint mutation action.');
    }

    const updated = await KindredRepository.mutateStore((store) => {
      const user = getOwnSafe(store.users, activeUser.id);
      if (!user) {
        throw new KindredRepoError(404, 'USER_NOT_FOUND', 'User not found.');
      }
      const now = new Date().toISOString();

      if (action === 'add') {
        const dim = BlueprintDimensionSchema.safeParse(body.dimension);
        const vis = BlueprintVisibilitySchema.safeParse(body.visibility ?? 'shareable');
        const title = typeof body.title === 'string' ? body.title.trim() : '';
        const summary = typeof body.summary === 'string' ? body.summary.trim() : '';
        if (!dim.success || !vis.success || !title || !summary) {
          throw new KindredRepoError(400, 'INVALID_INSIGHT', 'Valid dimension, title, summary, and visibility are required.');
        }
        const item: BlueprintInsight = {
          id: createId('ins'),
          dimension: dim.data,
          title: title.slice(0, 120),
          summary: summary.slice(0, 600),
          visibility: vis.data,
          confidence: 95,
          source: 'user_added',
          updatedAt: now,
        };
        user.blueprint.push(item);
        user.onboardingProgress = Math.min(100, Math.max(user.onboardingProgress, user.blueprint.length * 15));
        if (user.onboardingProgress >= 100) user.onboardingCompleted = true;
      } else {
        const insightId = typeof body.insightId === 'string' ? body.insightId : '';
        if (!isSafeIdentifier(insightId)) {
          throw new KindredRepoError(400, 'INVALID_INSIGHT_ID', 'Valid insightId is required.');
        }
        const idx = user.blueprint.findIndex((b) => b.id === insightId);
        if (idx === -1) {
          throw new KindredRepoError(404, 'INSIGHT_NOT_FOUND', 'Blueprint insight not found.');
        }

        if (action === 'remove') {
          user.blueprint.splice(idx, 1);
          const shareableAndPrivateCount = user.blueprint.filter((b) => b.visibility !== 'redacted').length;
          if (!user.onboardingCompleted) {
            user.onboardingProgress = Math.min(user.onboardingProgress, shareableAndPrivateCount * 20);
          } else if (shareableAndPrivateCount < 3) {
            user.onboardingProgress = Math.min(55, shareableAndPrivateCount * 20);
          }
        } else if (action === 'redact') {
          user.blueprint[idx] = {
            ...user.blueprint[idx],
            visibility: 'redacted',
            source: 'user_edited',
            updatedAt: now,
          };
          const activeInsights = user.blueprint.filter((b) => b.visibility !== 'redacted').length;
          if (activeInsights < 3) {
            user.onboardingProgress = Math.min(user.onboardingProgress, activeInsights * 20);
          }
        } else if (action === 'toggle_visibility') {
          const vis = BlueprintVisibilitySchema.safeParse(body.visibility);
          const nextVis = vis.success
            ? vis.data
            : user.blueprint[idx].visibility === 'shareable'
              ? 'private'
              : 'shareable';
          user.blueprint[idx] = {
            ...user.blueprint[idx],
            visibility: nextVis,
            source: 'user_edited',
            updatedAt: now,
          };
        } else if (action === 'update') {
          const title = typeof body.title === 'string' ? body.title.trim() : user.blueprint[idx].title;
          const summary =
            typeof body.summary === 'string' ? body.summary.trim() : user.blueprint[idx].summary;
          if (!title || !summary) {
            throw new KindredRepoError(400, 'INVALID_INSIGHT', 'Title and summary cannot be empty.');
          }
          const vis = body.visibility
            ? BlueprintVisibilitySchema.safeParse(body.visibility)
            : { success: true as const, data: user.blueprint[idx].visibility };
          if (!vis.success) {
            throw new KindredRepoError(400, 'INVALID_VISIBILITY', 'Invalid visibility value.');
          }
          user.blueprint[idx] = {
            ...user.blueprint[idx],
            title: title.slice(0, 120),
            summary: summary.slice(0, 600),
            visibility: vis.data,
            source: 'user_edited',
            updatedAt: now,
          };
        }
      }

      user.updatedAt = now;
      const persona = syncAgentPersonaForUser(store, user.id);
      return {
        user: structuredClone(user),
        persona: persona ? structuredClone(persona) : undefined,
      };
    });

    return NextResponse.json({ ok: true, ...updated });
  } catch (err) {
    return handleRouteError(err);
  }
}
