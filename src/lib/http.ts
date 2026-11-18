import { NextRequest, NextResponse } from 'next/server';
import { KindredRepoError } from '@/lib/db/repository';
import { hasForbiddenKeysDeep, isSafeIdentifier } from '@/lib/utils';

export const USER_COOKIE_NAME = 'kindred_user_id';

export async function parseSafeJsonBody<T = Record<string, unknown>>(
  req: NextRequest,
): Promise<T> {
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    throw new KindredRepoError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new KindredRepoError(400, 'INVALID_BODY', 'Request body must be a JSON object.');
  }

  if (hasForbiddenKeysDeep(parsed)) {
    throw new KindredRepoError(400, 'FORBIDDEN_KEY', 'Forbidden property name in request payload.');
  }

  return parsed as T;
}

export function resolveRequestedUserId(
  req: NextRequest,
  explicitUserId?: unknown,
): string | undefined {
  if (explicitUserId !== undefined && explicitUserId !== null && explicitUserId !== '') {
    if (typeof explicitUserId !== 'string' || !isSafeIdentifier(explicitUserId)) {
      throw new KindredRepoError(400, 'INVALID_USER_ID', 'Invalid userId.');
    }
    return explicitUserId.trim();
  }

  const queryUserId = req.nextUrl.searchParams.get('userId');
  if (queryUserId !== null && queryUserId !== '') {
    if (!isSafeIdentifier(queryUserId)) {
      throw new KindredRepoError(400, 'INVALID_USER_ID', 'Invalid userId query parameter.');
    }
    return queryUserId.trim();
  }

  const cookieUserId = req.cookies.get(USER_COOKIE_NAME)?.value;
  if (cookieUserId && isSafeIdentifier(cookieUserId)) {
    return cookieUserId;
  }

  return undefined;
}

export function attachUserCookie(res: NextResponse, userId: string): NextResponse {
  res.cookies.set(USER_COOKIE_NAME, userId, {
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export function handleRouteError(err: unknown): NextResponse {
  if (err instanceof KindredRepoError) {
    return NextResponse.json(
      { ok: false, error: err.code, message: err.message },
      { status: err.status },
    );
  }
  return NextResponse.json(
    { ok: false, error: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    { status: 500 },
  );
}
