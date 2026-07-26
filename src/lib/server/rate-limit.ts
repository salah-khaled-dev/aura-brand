/**
 * Basic in-memory fixed-window rate limiter for guest-facing API routes
 * (review submission/editing). Keyed by caller IP. This is intentionally
 * simple — it resets on every deploy/restart and doesn't coordinate across
 * multiple server instances — but it's enough to blunt naive spam/abuse
 * against a single-instance Next.js deployment, which is what's being asked
 * for here. Reach for a shared store (Redis/Upstash) only if this app ever
 * runs multi-instance.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 8;

const hits = new Map<string, { count: number; resetAt: number }>();

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/** Returns true if the request should be allowed, false if the caller is rate-limited. */
export function checkRateLimit(key: string, windowMs = WINDOW_MS, maxRequests = MAX_REQUESTS): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) return false;

  entry.count += 1;
  return true;
}
