import { describe, expect, it } from "vitest";

import {
  createFailureLimiter,
  createRateLimiter,
  retryAfterSeconds,
} from "@/lib/rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit inside one window, then blocks", () => {
    let now = 1_000_000;
    const limiter = createRateLimiter({
      limit: 2,
      windowMs: 60_000,
      now: () => now,
    });

    expect(limiter.consume("user").allowed).toBe(true);
    expect(limiter.consume("user").allowed).toBe(true);

    const blocked = limiter.consume("user");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(60_000);

    // A different key has its own window.
    expect(limiter.consume("other").allowed).toBe(true);
  });

  it("opens a fresh window after it expires", () => {
    let now = 1_000_000;
    const limiter = createRateLimiter({
      limit: 1,
      windowMs: 1_000,
      now: () => now,
    });

    expect(limiter.consume("user").allowed).toBe(true);
    expect(limiter.consume("user").allowed).toBe(false);

    now += 1_001;
    expect(limiter.consume("user").allowed).toBe(true);
  });

  it("resets a key on demand", () => {
    const limiter = createRateLimiter({
      limit: 1,
      windowMs: 60_000,
      now: () => 5_000,
    });

    limiter.consume("user");
    limiter.reset("user");

    expect(limiter.consume("user").allowed).toBe(true);
  });
});

describe("createFailureLimiter", () => {
  it("counts failures, blocks at the limit and resets on success", () => {
    let now = 2_000_000;
    const limiter = createFailureLimiter({
      limit: 2,
      windowMs: 15 * 60_000,
      now: () => now,
    });

    expect(limiter.check("alex").blocked).toBe(false);

    limiter.recordFailure("alex");
    expect(limiter.check("alex")).toMatchObject({
      blocked: false,
      remaining: 1,
    });

    limiter.recordFailure("alex");
    const blocked = limiter.check("alex");
    expect(blocked.blocked).toBe(true);
    expect(blocked.retryAfterMs).toBe(15 * 60_000);

    limiter.reset("alex");
    expect(limiter.check("alex").blocked).toBe(false);
  });

  it("expires the window automatically", () => {
    let now = 3_000_000;
    const limiter = createFailureLimiter({
      limit: 1,
      windowMs: 1_000,
      now: () => now,
    });

    limiter.recordFailure("alex");
    expect(limiter.check("alex").blocked).toBe(true);

    now += 1_001;
    expect(limiter.check("alex").blocked).toBe(false);
  });
});

describe("retryAfterSeconds", () => {
  it("rounds up and never returns zero", () => {
    expect(retryAfterSeconds(1)).toBe(1);
    expect(retryAfterSeconds(1_001)).toBe(2);
    expect(retryAfterSeconds(0)).toBe(1);
  });
});
