/**
 * Best-effort, in-process rate limiting.
 *
 * This complements the durable daily quotas in src/lib/usage.ts: it stops
 * bursts and credential stuffing within one running instance, while the
 * database quotas remain the cross-instance cost control. On serverless hosts
 * each instance has its own window, which is acceptable for an MVP and noted in
 * the README.
 */

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

export type FailureLimitDecision = {
  blocked: boolean;
  remaining: number;
  retryAfterMs: number;
};

type Entry = { count: number; resetsAt: number };

type Options = {
  limit: number;
  windowMs: number;
  /** Injectable clock for tests. */
  now?: () => number;
};

const MAX_ENTRIES = 5_000;

function prune(map: Map<string, Entry>, currentTime: number) {
  if (map.size < MAX_ENTRIES) return;
  for (const [key, entry] of map) {
    if (entry.resetsAt <= currentTime) map.delete(key);
  }
}

function currentEntry(
  map: Map<string, Entry>,
  key: string,
  limit: number,
  windowMs: number,
  currentTime: number,
): Entry {
  const existing = map.get(key);
  if (existing && existing.resetsAt > currentTime) return existing;

  const fresh = { count: 0, resetsAt: currentTime + windowMs };
  map.set(key, fresh);
  return fresh;
}

export function createRateLimiter({
  limit,
  windowMs,
  now = () => Date.now(),
}: Options) {
  const windows = new Map<string, Entry>();

  return {
    consume(key: string): RateLimitDecision {
      const currentTime = now();
      prune(windows, currentTime);
      const entry = currentEntry(windows, key, limit, windowMs, currentTime);
      const retryAfterMs = Math.max(0, entry.resetsAt - currentTime);

      if (entry.count >= limit) {
        return { allowed: false, remaining: 0, retryAfterMs };
      }

      entry.count += 1;
      return {
        allowed: true,
        remaining: Math.max(0, limit - entry.count),
        retryAfterMs,
      };
    },
    reset(key: string) {
      windows.delete(key);
    },
    size() {
      return windows.size;
    },
  };
}

/**
 * Counts failures only. Login checks `check` before trying, resets on success
 * (or before a fresh attempt), and records a failure when authentication fails.
 */
export function createFailureLimiter({
  limit,
  windowMs,
  now = () => Date.now(),
}: Options) {
  const windows = new Map<string, Entry>();

  return {
    check(key: string): FailureLimitDecision {
      const currentTime = now();
      prune(windows, currentTime);
      const entry = windows.get(key);

      if (!entry || entry.resetsAt <= currentTime) {
        return { blocked: false, remaining: limit, retryAfterMs: 0 };
      }

      const remaining = Math.max(0, limit - entry.count);
      return {
        blocked: entry.count >= limit,
        remaining,
        retryAfterMs: Math.max(0, entry.resetsAt - currentTime),
      };
    },
    recordFailure(key: string) {
      const currentTime = now();
      const entry = currentEntry(windows, key, limit, windowMs, currentTime);
      entry.count += 1;
    },
    reset(key: string) {
      windows.delete(key);
    },
    size() {
      return windows.size;
    },
  };
}

/** Protects the sign-in form from password guessing. */
export const loginAttemptLimiter = createFailureLimiter({
  limit: 8,
  windowMs: 15 * 60 * 1000,
});

/** Stops rapid-fire material generation clicking, independent of daily quotas. */
export const materialBurstLimiter = createRateLimiter({
  limit: 6,
  windowMs: 60 * 1000,
});

export function retryAfterSeconds(retryAfterMs: number) {
  return Math.max(1, Math.ceil(retryAfterMs / 1000));
}
