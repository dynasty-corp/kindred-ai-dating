import { NextRequest, NextResponse } from 'next/server';
import { KindredRepoError, KindredRepository } from '@/lib/db/repository';
import {
  attachUserCookie,
  handleRouteError,
  parseSafeJsonBody,
  resolveRequestedUserId,
} from '@/lib/http';

export async function GET(req: NextRequest) {
  try {
    const requestedUserId = resolveRequestedUserId(req);
    const workspace = await KindredRepository.getWorkspaceState(requestedUserId);
    return NextResponse.json({ ok: true, ...workspace });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseSafeJsonBody<Record<string, unknown>>(req);
    const action = typeof body.action === 'string' ? body.action : 'create';

    if (action === 'create') {
      const { user, persona } = await KindredRepository.createUser({
        displayName: body.displayName as string,
        age: body.age as number,
        pronouns: body.pronouns as string | undefined,
        city: body.city as string | undefined,
        occupation: body.occupation as string | undefined,
        bioTagline: body.bioTagline as string | undefined,
        interests: body.interests as string[] | undefined,
        email: body.email as string | undefined,
        wingmanName: body.wingmanName as string | undefined,
        avatarConfig: body.avatarConfig as never,
      });
      const workspace = await KindredRepository.getWorkspaceState(user.id);
      const res = NextResponse.json(
        { ok: true, user, persona, ...workspace },
        { status: 201 },
      );
      return attachUserCookie(res, user.id);
    }

    if (action === 'switch') {
      if (typeof body.userId !== 'string') {
        throw new KindredRepoError(400, 'INVALID_USER_ID', 'userId is required to switch accounts.');
      }
      const user = await KindredRepository.switchUser(body.userId);
      const workspace = await KindredRepository.getWorkspaceState(user.id);
      const res = NextResponse.json({ ok: true, user, ...workspace });
      return attachUserCookie(res, user.id);
    }

    if (action === 'hydrate_backup') {
      const user = await KindredRepository.hydrateClientBackup(body.profile);
      const workspace = await KindredRepository.getWorkspaceState(user.id);
      const res = NextResponse.json({ ok: true, user, ...workspace });
      return attachUserCookie(res, user.id);
    }

    if (action === 'reset_demo') {
      await KindredRepository.resetDemo();
      const workspace = await KindredRepository.getWorkspaceState('user-default');
      const res = NextResponse.json({ ok: true, ...workspace });
      return attachUserCookie(res, 'user-default');
    }

    throw new KindredRepoError(400, 'INVALID_ACTION', `Unsupported action "${action}".`);
  } catch (err) {
    return handleRouteError(err);
  }
}
