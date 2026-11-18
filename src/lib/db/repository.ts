import fs from 'node:fs';
import path from 'node:path';
import { withMatchLock, withStoreLock } from '@/lib/concurrency';
import {
  buildShareableAgentPacket,
  sanitizeTextAgainstPrivateInsights,
} from '@/lib/ai/prompts';
import {
  buildDefaultMayaProfile,
  buildInitialSeedSnapshot,
  buildSeededUsers,
  deriveAgentPersonaFromUser,
} from '@/lib/db/seed-data';
import {
  AvatarConfigSchema,
  KindredStoreSnapshotSchema,
  MatchDossierSchema,
  UserProfileSchema,
  type AgentConversation,
  type AgentPersona,
  type AvatarConfig,
  type CoopGameSession,
  type FutureSimulation,
  type KindredStoreSnapshot,
  type MatchDossier,
  type SanitizedCandidate,
  type UserProfile,
} from '@/lib/types/schemas';
import {
  canonicalPairKey,
  createId,
  getOwnSafe,
  hasForbiddenKeysDeep,
  isSafeIdentifier,
  setOwnSafe,
} from '@/lib/utils';

export const MAX_COHORT_SIZE = 3;

export type StorageMode = 'postgres' | 'file_json' | 'tmp_json' | 'memory_only';

export class KindredRepoError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const globalForStore = globalThis as unknown as {
  __kindredStore?: KindredStoreSnapshot;
  __kindredStorageMode?: StorageMode;
  __kindredStoreFilePath?: string;
  __kindredTestOverridePath?: string;
  __kindredDisableDisk?: boolean;
};

function resolveStoreFilePath(): { filePath: string; mode: StorageMode } {
  if (globalForStore.__kindredTestOverridePath) {
    return {
      filePath: globalForStore.__kindredTestOverridePath,
      mode: 'file_json',
    };
  }
  if (process.env.VERCEL === '1') {
    return {
      filePath: '/tmp/kindred-store.json',
      mode: 'tmp_json',
    };
  }
  const localPath = path.join(process.cwd(), '.data', 'kindred-store.json');
  return {
    filePath: localPath,
    mode: 'file_json',
  };
}

function tryAtomicWriteJson(filePath: string, data: KindredStoreSnapshot): boolean {
  if (globalForStore.__kindredDisableDisk) return false;
  const dir = path.dirname(filePath);
  const tmpPath = `${filePath}.${createId('tmp')}`;
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpPath, filePath);
    return true;
  } catch {
    try {
      if (fs.existsSync(/*turbopackIgnore: true*/ tmpPath)) {
        fs.unlinkSync(/*turbopackIgnore: true*/ tmpPath);
      }
    } catch {
      // ignore cleanup error
    }
    return false;
  }
}

function persistSnapshotToDisk(snapshot: KindredStoreSnapshot): StorageMode {
  if (globalForStore.__kindredDisableDisk) {
    globalForStore.__kindredStorageMode = 'memory_only';
    return 'memory_only';
  }
  const primary = resolveStoreFilePath();
  if (tryAtomicWriteJson(primary.filePath, snapshot)) {
    globalForStore.__kindredStoreFilePath = primary.filePath;
    globalForStore.__kindredStorageMode = primary.mode;
    return primary.mode;
  }

  // Fallback to /tmp if primary directory was read-only (EROFS / EACCES)
  const tmpFallback = '/tmp/kindred-store.json';
  if (primary.filePath !== tmpFallback && tryAtomicWriteJson(tmpFallback, snapshot)) {
    globalForStore.__kindredStoreFilePath = tmpFallback;
    globalForStore.__kindredStorageMode = 'tmp_json';
    return 'tmp_json';
  }

  globalForStore.__kindredStorageMode = 'memory_only';
  return 'memory_only';
}

async function tryPostgresPing(): Promise<boolean> {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl || !dbUrl.startsWith('postgres')) return false;
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient({ datasourceUrl: dbUrl });
    try {
      await Promise.race([
        prisma.$queryRawUnsafe('SELECT 1'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('PG_TIMEOUT')), 2500)),
      ]);
      return true;
    } finally {
      await prisma.$disconnect().catch(() => {});
    }
  } catch {
    return false;
  }
}

function selfHealSnapshot(raw: unknown): KindredStoreSnapshot {
  const seed = buildInitialSeedSnapshot();
  if (!raw || typeof raw !== 'object' || hasForbiddenKeysDeep(raw)) {
    return seed;
  }

  const obj = raw as Record<string, unknown>;
  const healed: KindredStoreSnapshot = {
    version: 1,
    activeUserId: typeof obj.activeUserId === 'string' ? obj.activeUserId : seed.activeUserId,
    users: {},
    personas: {},
    conversations: {},
    matches: {},
    gameSessions: {},
    futureSimulations: {},
  };

  // Heal users
  const rawUsers =
    obj.users && typeof obj.users === 'object' ? (obj.users as Record<string, unknown>) : {};
  for (const [key, val] of Object.entries(rawUsers)) {
    if (!isSafeIdentifier(key)) continue;
    const parsed = UserProfileSchema.safeParse(val);
    if (parsed.success && parsed.data.id === key) {
      const user = { ...parsed.data };
      if (user.onboardingProgress >= 100) {
        user.onboardingProgress = 100;
        user.onboardingCompleted = true;
      }
      setOwnSafe(healed.users, key, user);
    }
  }

  // Ensure default user & all 6 seeded profiles exist
  if (!getOwnSafe(healed.users, 'user-default')) {
    setOwnSafe(healed.users, 'user-default', buildDefaultMayaProfile());
  }
  for (const seedUser of buildSeededUsers()) {
    if (!getOwnSafe(healed.users, seedUser.id)) {
      setOwnSafe(healed.users, seedUser.id, seedUser);
    }
  }

  if (!getOwnSafe(healed.users, healed.activeUserId)) {
    healed.activeUserId = 'user-default';
  }

  // Heal personas and ensure every user has a synced persona
  const rawPersonas =
    obj.personas && typeof obj.personas === 'object'
      ? (obj.personas as Record<string, unknown>)
      : {};
  const existingPersonaByUser: Record<string, AgentPersona> = {};
  for (const [key, val] of Object.entries(rawPersonas)) {
    if (!isSafeIdentifier(key) || !val || typeof val !== 'object') continue;
    const candidate = val as AgentPersona;
    if (
      isSafeIdentifier(candidate.userId) &&
      candidate.id === key &&
      getOwnSafe(healed.users, candidate.userId)
    ) {
      setOwnSafe(existingPersonaByUser, candidate.userId, candidate);
    }
  }
  for (const user of Object.values(healed.users)) {
    const existing = getOwnSafe(existingPersonaByUser, user.id);
    const synced = deriveAgentPersonaFromUser(user, existing);
    setOwnSafe(healed.personas, synced.id, synced);
  }

  // Heal conversations
  const rawConvs =
    obj.conversations && typeof obj.conversations === 'object'
      ? (obj.conversations as Record<string, unknown>)
      : {};
  for (const [key, val] of Object.entries(rawConvs)) {
    if (!isSafeIdentifier(key) || !val || typeof val !== 'object') continue;
    const c = val as AgentConversation;
    if (
      c.id === key &&
      getOwnSafe(healed.users, c.initiatorUserId) &&
      getOwnSafe(healed.users, c.candidateUserId)
    ) {
      setOwnSafe(healed.conversations, key, c);
    }
  }

  // Heal matches
  const rawMatches =
    obj.matches && typeof obj.matches === 'object'
      ? (obj.matches as Record<string, unknown>)
      : {};
  for (const [key, val] of Object.entries(rawMatches)) {
    if (!isSafeIdentifier(key)) continue;
    const parsed = MatchDossierSchema.safeParse(val);
    if (
      parsed.success &&
      parsed.data.id === key &&
      getOwnSafe(healed.users, parsed.data.userAId) &&
      getOwnSafe(healed.users, parsed.data.userBId)
    ) {
      setOwnSafe(healed.matches, key, parsed.data);
    }
  }

  // Reconcile activeMatchIds cleanly against active_cohort matches
  for (const user of Object.values(healed.users)) {
    const activeIds = Object.values(healed.matches)
      .filter(
        (m) =>
          m.status === 'active_cohort' &&
          (m.userAId === user.id || m.userBId === user.id),
      )
      .map((m) => m.id)
      .slice(0, MAX_COHORT_SIZE);
    user.activeMatchIds = activeIds;
  }

  // Heal game sessions
  const rawGames =
    obj.gameSessions && typeof obj.gameSessions === 'object'
      ? (obj.gameSessions as Record<string, unknown>)
      : {};
  for (const [key, val] of Object.entries(rawGames)) {
    if (!isSafeIdentifier(key) || !val || typeof val !== 'object') continue;
    const g = val as CoopGameSession;
    if (g.id === key && getOwnSafe(healed.matches, g.matchId)) {
      setOwnSafe(healed.gameSessions, key, g);
    }
  }

  // Heal future simulations
  const rawSims =
    obj.futureSimulations && typeof obj.futureSimulations === 'object'
      ? (obj.futureSimulations as Record<string, unknown>)
      : {};
  for (const [key, val] of Object.entries(rawSims)) {
    if (!isSafeIdentifier(key) || !val || typeof val !== 'object') continue;
    const s = val as FutureSimulation;
    if (s.id === key && getOwnSafe(healed.matches, s.matchId)) {
      setOwnSafe(healed.futureSimulations, key, s);
    }
  }

  // Validate final snapshot
  const finalCheck = KindredStoreSnapshotSchema.safeParse(healed);
  return finalCheck.success ? finalCheck.data : seed;
}

function loadStoreFromDiskOrSeed(): KindredStoreSnapshot {
  if (globalForStore.__kindredStore) {
    return globalForStore.__kindredStore;
  }

  const primary = resolveStoreFilePath();
  const candidates = [primary.filePath, '/tmp/kindred-store.json'];

  if (!globalForStore.__kindredDisableDisk) {
    for (const candidatePath of candidates) {
      try {
        if (fs.existsSync(/*turbopackIgnore: true*/ candidatePath)) {
          const text = fs.readFileSync(/*turbopackIgnore: true*/ candidatePath, 'utf8');
          const parsedJson = JSON.parse(text);
          const healed = selfHealSnapshot(parsedJson);
          globalForStore.__kindredStore = healed;
          globalForStore.__kindredStoreFilePath = candidatePath;
          globalForStore.__kindredStorageMode =
            candidatePath === '/tmp/kindred-store.json' && primary.filePath !== '/tmp/kindred-store.json'
              ? 'tmp_json'
              : primary.mode;
          return healed;
        }
      } catch {
        // Corrupt JSON on disk — heal cleanly from seed below
      }
    }
  }

  const fresh = buildInitialSeedSnapshot();
  globalForStore.__kindredStore = fresh;
  persistSnapshotToDisk(fresh);
  return fresh;
}

function cloneSnapshot(s: KindredStoreSnapshot): KindredStoreSnapshot {
  return structuredClone(s);
}

export function getStorageDiagnostics(): {
  storageMode: StorageMode;
  seededCount: number;
  postgresConfigured: boolean;
} {
  const store = loadStoreFromDiskOrSeed();
  const seededCount = Object.values(store.users).filter((u) => u.isSeededDemo).length;
  return {
    storageMode: globalForStore.__kindredStorageMode ?? 'memory_only',
    seededCount,
    postgresConfigured: Boolean(process.env.DATABASE_URL?.trim().startsWith('postgres')),
  };
}

export async function resolveEffectiveStorageMode(): Promise<StorageMode> {
  const diag = getStorageDiagnostics();
  if (diag.postgresConfigured && (await tryPostgresPing())) {
    return 'postgres';
  }
  return diag.storageMode;
}

export function resetRepositoryForTests(options?: {
  storePath?: string;
  disableDisk?: boolean;
}): void {
  globalForStore.__kindredStore = undefined;
  globalForStore.__kindredStorageMode = undefined;
  globalForStore.__kindredStoreFilePath = undefined;
  globalForStore.__kindredTestOverridePath = options?.storePath;
  globalForStore.__kindredDisableDisk = Boolean(options?.disableDisk);
}

export function reloadRepositoryFromDiskForTests(): KindredStoreSnapshot {
  globalForStore.__kindredStore = undefined;
  return loadStoreFromDiskOrSeed();
}

export function computeSandboxSufficiency(
  match: MatchDossier,
  userA: UserProfile,
  userB: UserProfile,
): { aiSufficiencyMet: boolean; sufficiencyReason: string } {
  if (match.status !== 'active_cohort') {
    return {
      aiSufficiencyMet: false,
      sufficiencyReason: 'Both humans must accept the match into their Focused Cohort first.',
    };
  }
  if (userA.onboardingProgress < 60 || userB.onboardingProgress < 60) {
    return {
      aiSufficiencyMet: false,
      sufficiencyReason: `Both Wingman blueprints need at least 60% onboarding depth (${userA.displayName}: ${userA.onboardingProgress}%, ${userB.displayName}: ${userB.onboardingProgress}%).`,
    };
  }
  return {
    aiSufficiencyMet: true,
    sufficiencyReason: `AI sufficiency verified (${userA.displayName}: ${userA.onboardingProgress}%, ${userB.displayName}: ${userB.onboardingProgress}%). Ready for mutual consent.`,
  };
}

export function syncSandboxSufficiencyForUser(
  store: KindredStoreSnapshot,
  userId: string,
): void {
  for (const match of Object.values(store.matches)) {
    if (match.userAId !== userId && match.userBId !== userId) continue;
    const userA = getOwnSafe(store.users, match.userAId);
    const userB = getOwnSafe(store.users, match.userBId);
    if (!userA || !userB) continue;

    const { aiSufficiencyMet, sufficiencyReason } = computeSandboxSufficiency(
      match,
      userA,
      userB,
    );
    match.sandboxConsent.aiSufficiencyMet = aiSufficiencyMet;
    match.sandboxConsent.sufficiencyReason = sufficiencyReason;
    if (!aiSufficiencyMet) {
      match.sandboxConsent.mutuallyUnlocked = false;
    }
  }
}

export function syncAgentPersonaForUser(
  store: KindredStoreSnapshot,
  userId: string,
): AgentPersona | undefined {
  const user = getOwnSafe(store.users, userId);
  if (!user) return undefined;
  const existing = Object.values(store.personas).find((p) => p.userId === userId);
  const synced = deriveAgentPersonaFromUser(user, existing);
  setOwnSafe(store.personas, synced.id, synced);
  syncSandboxSufficiencyForUser(store, userId);
  return synced;
}

export function sanitizeCandidateForWire(
  user: UserProfile,
  persona: AgentPersona,
): SanitizedCandidate {
  const packet = buildShareableAgentPacket(user, persona);
  return {
    id: user.id,
    displayName: packet.displayName,
    age: packet.age,
    pronouns: packet.pronouns,
    city: packet.city,
    occupation: packet.occupation,
    bioTagline: packet.bioTagline,
    interests: packet.interests,
    isSeededDemo: user.isSeededDemo,
    avatarConfig: user.avatarConfig,
    onboardingProgress: user.onboardingProgress,
    onboardingCompleted: user.onboardingCompleted,
    wingmanName: packet.wingmanName,
    coachingTone: packet.coachingTone,
    shareableInsightCount: packet.shareableSummaries.length,
    privateContextCount: packet.privateContextCount,
    shareableHighlights: packet.shareableSummaries.map((s) => ({
      dimension: s.dimension,
      title: s.title,
      summary: s.summary,
    })),
    complementaryStrengths: packet.complementaryStrengths,
  };
}

export function redactGameSessionForCaller(
  session: CoopGameSession,
  match: MatchDossier,
  callerUserId: string,
): CoopGameSession {
  const copy = structuredClone(session);
  if (copy.mode === 'blind_trip_draft' && copy.blindTripState && !copy.blindTripState.revealed) {
    if (callerUserId === match.userAId) {
      delete copy.blindTripState.userBPick;
    } else if (callerUserId === match.userBId) {
      delete copy.blindTripState.userAPick;
    } else {
      delete copy.blindTripState.userAPick;
      delete copy.blindTripState.userBPick;
    }
  }
  return copy;
}

export function redactSimulationForCaller(
  sim: FutureSimulation | undefined,
  match: MatchDossier,
): FutureSimulation | null {
  if (!sim || !match.sandboxConsent.mutuallyUnlocked) {
    return null;
  }
  const copy = structuredClone(sim);
  if (!match.sandboxConsent.familyVisualizerOptIn) {
    delete copy.futureFamily;
  }
  return copy;
}

export class KindredRepository {
  static async readSnapshot(): Promise<KindredStoreSnapshot> {
    return withStoreLock(async () => {
      return cloneSnapshot(loadStoreFromDiskOrSeed());
    });
  }

  static async mutateStore<T>(
    mutator: (store: KindredStoreSnapshot) => Promise<T> | T,
  ): Promise<T> {
    return withStoreLock(async () => {
      const liveStore = loadStoreFromDiskOrSeed();
      const draft = cloneSnapshot(liveStore);
      const result = await mutator(draft);
      globalForStore.__kindredStore = draft;
      persistSnapshotToDisk(draft);
      return result;
    });
  }

  static async resolveActiveUser(requestedUserId?: string | null): Promise<UserProfile> {
    return withStoreLock(async () => {
      const store = loadStoreFromDiskOrSeed();
      if (requestedUserId !== undefined && requestedUserId !== null && requestedUserId !== '') {
        if (!isSafeIdentifier(requestedUserId)) {
          throw new KindredRepoError(400, 'INVALID_USER_ID', 'Invalid user identifier.');
        }
        const found = getOwnSafe(store.users, requestedUserId);
        if (!found) {
          throw new KindredRepoError(404, 'USER_NOT_FOUND', `User "${requestedUserId}" not found.`);
        }
        return cloneSnapshot({ ...store, users: { [found.id]: found } }).users[found.id];
      }
      const active =
        getOwnSafe(store.users, store.activeUserId) ?? getOwnSafe(store.users, 'user-default')!;
      return structuredClone(active);
    });
  }

  static async getWorkspaceState(requestedUserId?: string | null) {
    return withStoreLock(async () => {
      const store = loadStoreFromDiskOrSeed();
      let currentUser: UserProfile | undefined;

      if (requestedUserId && requestedUserId.trim()) {
        if (!isSafeIdentifier(requestedUserId)) {
          throw new KindredRepoError(400, 'INVALID_USER_ID', 'Invalid userId.');
        }
        currentUser = getOwnSafe(store.users, requestedUserId);
        if (!currentUser) {
          throw new KindredRepoError(404, 'USER_NOT_FOUND', 'Requested user profile not found.');
        }
      } else {
        currentUser =
          getOwnSafe(store.users, store.activeUserId) ?? getOwnSafe(store.users, 'user-default')!;
      }

      const activePersona =
        Object.values(store.personas).find((p) => p.userId === currentUser!.id) ??
        syncAgentPersonaForUser(store, currentUser.id)!;

      const candidates: SanitizedCandidate[] = Object.values(store.users)
        .filter((u) => u.id !== currentUser!.id)
        .map((u) => {
          const persona =
            Object.values(store.personas).find((p) => p.userId === u.id) ??
            deriveAgentPersonaFromUser(u);
          return sanitizeCandidateForWire(u, persona);
        });

      const matches = Object.values(store.matches).filter(
        (m) => m.userAId === currentUser!.id || m.userBId === currentUser!.id,
      );

      const conversations = Object.values(store.conversations).filter(
        (c) => c.initiatorUserId === currentUser!.id || c.candidateUserId === currentUser!.id,
      );

      const userSummaries = Object.values(store.users).map((u) => ({
        id: u.id,
        displayName: u.displayName,
        isSeededDemo: u.isSeededDemo,
        onboardingProgress: u.onboardingProgress,
        activeCohortCount: u.activeMatchIds.length,
        occupation: u.occupation,
        city: u.city,
        avatarConfig: u.avatarConfig,
      }));

      const activeCohortCount = matches.filter((m) => m.status === 'active_cohort').length;

      return {
        currentUser: structuredClone(currentUser),
        activePersona: structuredClone(activePersona),
        users: userSummaries,
        candidates,
        matches: structuredClone(matches),
        conversations: structuredClone(conversations),
        activeCohortCount,
        maxCohortSize: MAX_COHORT_SIZE,
      };
    });
  }

  static async createUser(input: {
    displayName: string;
    age: number;
    pronouns?: string;
    city?: string;
    occupation?: string;
    bioTagline?: string;
    interests?: string[];
    email?: string;
    wingmanName?: string;
    avatarConfig?: AvatarConfig;
  }): Promise<{ user: UserProfile; persona: AgentPersona }> {
    if (hasForbiddenKeysDeep(input)) {
      throw new KindredRepoError(400, 'FORBIDDEN_KEY', 'Forbidden property name in payload.');
    }

    const displayName = typeof input.displayName === 'string' ? input.displayName.trim() : '';
    if (!displayName || displayName.length > 80) {
      throw new KindredRepoError(400, 'INVALID_DISPLAY_NAME', 'Display name is required (1-80 chars).');
    }

    if (typeof input.age !== 'number' || !Number.isInteger(input.age) || input.age < 18 || input.age > 120) {
      throw new KindredRepoError(400, 'INVALID_AGE', 'Age must be an integer >= 18.');
    }

    let email: string | undefined;
    if (input.email !== undefined && input.email !== '') {
      if (typeof input.email !== 'string') {
        throw new KindredRepoError(400, 'INVALID_EMAIL', 'Invalid email address.');
      }
      const trimmedEmail = input.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        throw new KindredRepoError(400, 'INVALID_EMAIL', 'Invalid email address format.');
      }
      email = trimmedEmail;
    }

    const defaultAvatar: AvatarConfig = {
      skinTone: '#D9A684',
      hairStyle: 'wavy_bob',
      hairColor: '#2B221E',
      accentColor: '#D96B4F',
      expression: 'warm_smile',
      accessory: 'none',
    };
    let avatarConfig = defaultAvatar;
    if (input.avatarConfig !== undefined) {
      const parsedAvatar = AvatarConfigSchema.safeParse(input.avatarConfig);
      if (!parsedAvatar.success) {
        throw new KindredRepoError(400, 'INVALID_AVATAR_CONFIG', 'Malformed avatarConfig provided.');
      }
      avatarConfig = parsedAvatar.data;
    }

    const interests = Array.isArray(input.interests)
      ? input.interests
          .filter((i): i is string => typeof i === 'string' && i.trim().length > 0)
          .map((i) => i.trim().slice(0, 60))
          .slice(0, 12)
      : ['coffee', 'music', 'local food'];

    const pronouns =
      typeof input.pronouns === 'string' && input.pronouns.trim()
        ? input.pronouns.trim().slice(0, 40)
        : 'they/them';
    const city =
      typeof input.city === 'string' && input.city.trim()
        ? input.city.trim().slice(0, 80)
        : 'San Francisco, CA';
    const occupation =
      typeof input.occupation === 'string' && input.occupation.trim()
        ? input.occupation.trim().slice(0, 100)
        : 'Creative Explorer';
    const bioTagline =
      typeof input.bioTagline === 'string' && input.bioTagline.trim()
        ? input.bioTagline.trim().slice(0, 280)
        : 'Exploring intentional connection with curiosity and honesty.';
    const wingmanName =
      typeof input.wingmanName === 'string' && input.wingmanName.trim()
        ? input.wingmanName.trim().slice(0, 40)
        : 'Sage';

    return this.mutateStore((store) => {
      if (email) {
        const duplicate = Object.values(store.users).some(
          (u) => u.email?.toLowerCase() === email,
        );
        if (duplicate) {
          throw new KindredRepoError(409, 'DUPLICATE_EMAIL', 'An account with that email already exists.');
        }
      }

      const now = new Date().toISOString();
      const userId = createId('user');
      const user: UserProfile = {
        id: userId,
        email,
        displayName,
        age: input.age,
        pronouns,
        city,
        occupation,
        bioTagline,
        interests,
        isSeededDemo: false,
        avatarConfig,
        onboardingMessages: [
          {
            id: createId('msg'),
            role: 'wingman',
            content: `Welcome, ${displayName}. I'm ${wingmanName}, your AI Wingman. Think of me as your thoughtful dating advocate — never a romantic substitute. To start building your Relationship Blueprint, what values or everyday habits help you feel genuinely at ease with a partner?`,
            timestamp: now,
            isPrivateTurn: false,
          },
        ],
        blueprint: [],
        onboardingProgress: 0,
        onboardingCompleted: false,
        activeMatchIds: [],
        createdAt: now,
        updatedAt: now,
      };

      setOwnSafe(store.users, userId, user);
      store.activeUserId = userId;
      const persona = deriveAgentPersonaFromUser(user);
      persona.wingmanName = wingmanName;
      setOwnSafe(store.personas, persona.id, persona);

      return {
        user: structuredClone(user),
        persona: structuredClone(persona),
      };
    });
  }

  static async switchUser(userId: string): Promise<UserProfile> {
    if (!isSafeIdentifier(userId)) {
      throw new KindredRepoError(400, 'INVALID_USER_ID', 'Invalid userId.');
    }
    return this.mutateStore((store) => {
      const user = getOwnSafe(store.users, userId);
      if (!user) {
        throw new KindredRepoError(404, 'USER_NOT_FOUND', `User "${userId}" not found.`);
      }
      store.activeUserId = user.id;
      return structuredClone(user);
    });
  }

  static async hydrateClientBackup(backupUser: unknown): Promise<UserProfile> {
    if (!backupUser || typeof backupUser !== 'object' || hasForbiddenKeysDeep(backupUser)) {
      throw new KindredRepoError(400, 'INVALID_BACKUP', 'Invalid backup profile payload.');
    }
    const parsed = UserProfileSchema.safeParse(backupUser);
    if (!parsed.success) {
      throw new KindredRepoError(400, 'INVALID_BACKUP', 'Backup profile failed schema validation.');
    }
    const incoming = parsed.data;
    if (incoming.isSeededDemo || incoming.id.startsWith('seed-')) {
      throw new KindredRepoError(400, 'CANNOT_OVERWRITE_SEED', 'Seeded demo profiles cannot be overwritten via backup.');
    }
    if (!isSafeIdentifier(incoming.id) || !incoming.displayName.trim()) {
      throw new KindredRepoError(400, 'INVALID_BACKUP', 'Invalid profile ID or displayName.');
    }

    return this.mutateStore((store) => {
      if (incoming.email) {
        const dup = Object.values(store.users).find(
          (u) => u.email?.toLowerCase() === incoming.email!.toLowerCase() && u.id !== incoming.id,
        );
        if (dup) {
          throw new KindredRepoError(409, 'DUPLICATE_EMAIL', 'Backup email conflicts with an existing account.');
        }
      }

      const existing = getOwnSafe(store.users, incoming.id);
      if (existing?.isSeededDemo) {
        throw new KindredRepoError(400, 'CANNOT_OVERWRITE_SEED', 'Cannot overwrite seeded profile.');
      }

      // Only preserve activeMatchIds that actually exist in store & belong to this user
      const validMatchIds = Object.values(store.matches)
        .filter(
          (m) =>
            m.status === 'active_cohort' &&
            (m.userAId === incoming.id || m.userBId === incoming.id),
        )
        .map((m) => m.id)
        .slice(0, MAX_COHORT_SIZE);

      const safeUser: UserProfile = {
        ...incoming,
        displayName: incoming.displayName.trim(),
        isSeededDemo: false,
        onboardingCompleted: incoming.onboardingProgress >= 100 || incoming.onboardingCompleted,
        onboardingProgress: Math.min(100, Math.max(0, incoming.onboardingProgress)),
        activeMatchIds: validMatchIds,
        updatedAt: new Date().toISOString(),
      };

      setOwnSafe(store.users, safeUser.id, safeUser);
      store.activeUserId = safeUser.id;
      syncAgentPersonaForUser(store, safeUser.id);
      return structuredClone(safeUser);
    });
  }

  static async resetDemo(): Promise<KindredStoreSnapshot> {
    return this.mutateStore((store) => {
      const fresh = buildInitialSeedSnapshot();
      store.version = fresh.version;
      store.activeUserId = fresh.activeUserId;
      store.users = fresh.users;
      store.personas = fresh.personas;
      store.conversations = fresh.conversations;
      store.matches = fresh.matches;
      store.gameSessions = fresh.gameSessions;
      store.futureSimulations = fresh.futureSimulations;
      return cloneSnapshot(store);
    });
  }

  static async findCanonicalMatchForPair(
    userAId: string,
    userBId: string,
  ): Promise<MatchDossier | undefined> {
    const store = await this.readSnapshot();
    const targetKey = canonicalPairKey(userAId, userBId);
    const found = Object.values(store.matches).find(
      (m) => canonicalPairKey(m.userAId, m.userBId) === targetKey,
    );
    return found ? structuredClone(found) : undefined;
  }

  static async runInPairLock<T>(
    userAId: string,
    userBId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    return withMatchLock(canonicalPairKey(userAId, userBId), fn);
  }
}

export function scrubTextForCandidateWire(text: string, user: UserProfile): string {
  return sanitizeTextAgainstPrivateInsights(text, user);
}
