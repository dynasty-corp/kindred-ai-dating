import { AsyncLocalStorage } from 'node:async_hooks';

interface MutexState {
  locked: boolean;
  waiters: Array<() => void>;
}

class ReentrantFifoMutex {
  private readonly als = new AsyncLocalStorage<symbol>();
  private ownerToken: symbol | null = null;
  private depth = 0;
  private readonly waiters: Array<() => void> = [];

  async run<T>(fn: () => Promise<T> | T): Promise<T> {
    const currentToken = this.als.getStore();
    if (currentToken && currentToken === this.ownerToken) {
      this.depth += 1;
      try {
        return await fn();
      } finally {
        this.depth -= 1;
      }
    }

    const token = Symbol('store-lock');
    if (this.ownerToken !== null) {
      await new Promise<void>((resolve) => {
        this.waiters.push(resolve);
      });
    }

    this.ownerToken = token;
    this.depth = 1;
    try {
      return await this.als.run(token, fn);
    } finally {
      this.depth -= 1;
      if (this.depth <= 0) {
        this.ownerToken = null;
        this.depth = 0;
        const next = this.waiters.shift();
        if (next) next();
      }
    }
  }
}

const globalForLocks = globalThis as unknown as {
  __kindredStoreMutex?: ReentrantFifoMutex;
  __kindredKeyLocks?: Map<string, MutexState>;
};

const storeMutex = globalForLocks.__kindredStoreMutex ?? new ReentrantFifoMutex();
globalForLocks.__kindredStoreMutex = storeMutex;

const keyLocks = globalForLocks.__kindredKeyLocks ?? new Map<string, MutexState>();
globalForLocks.__kindredKeyLocks = keyLocks;

export async function withStoreLock<T>(fn: () => Promise<T> | T): Promise<T> {
  return storeMutex.run(fn);
}

export async function withKeyLock<T>(key: string, fn: () => Promise<T> | T): Promise<T> {
  let state = keyLocks.get(key);
  if (!state) {
    state = { locked: false, waiters: [] };
    keyLocks.set(key, state);
  }
  if (state.locked) {
    await new Promise<void>((resolve) => state!.waiters.push(resolve));
  }
  state.locked = true;
  try {
    return await fn();
  } finally {
    const next = state.waiters.shift();
    if (next) {
      next();
    } else {
      state.locked = false;
      keyLocks.delete(key);
    }
  }
}

export async function withMatchLock<T>(matchId: string, fn: () => Promise<T> | T): Promise<T> {
  return withKeyLock(`match:${matchId}`, fn);
}
