/**
 * Simple in-memory rate limiter.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const MAX_REQUESTS = 10;
const WINDOW_MS = 60 * 1000; // 1 minute

export function checkRateLimit(ip: string): {
  blocked: boolean;
  remaining: number;
  resetIn: number;
} {
  const now = Date.now();
  const entry = store.get(ip);

  if (store.size > 1000) {
    for (const [key, val] of store) {
      if (val.resetAt < now) store.delete(key);
    }
  }

  if (!entry || entry.resetAt < now) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { blocked: false, remaining: MAX_REQUESTS - 1, resetIn: WINDOW_MS };
  }

  if (entry.count >= MAX_REQUESTS) {
    return {
      blocked: true,
      remaining: 0,
      resetIn: entry.resetAt - now,
    };
  }

  entry.count++;
  return {
    blocked: false,
    remaining: MAX_REQUESTS - entry.count,
    resetIn: entry.resetAt - now,
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  const real = request.headers.get("x-real-ip");
  if (real) return real;

  return "127.0.0.1";
}
