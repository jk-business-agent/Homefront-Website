// Simple in-memory brute-force lockout for logins (per email).
// Counts FAILED attempts; a success resets the counter.
// NOTE: in-memory = per server instance. For multi-instance production, back this with Redis.
type Entry = { count: number; first: number };
const failures = new Map<string, Entry>();

const MAX_FAILURES = 8;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function key(email: string) { return email.trim().toLowerCase(); }

// Returns null if allowed, or minutes-to-wait if currently locked out.
export function loginLockout(email: string, now: number): number | null {
  const e = failures.get(key(email));
  if (!e) return null;
  if (now - e.first > WINDOW_MS) { failures.delete(key(email)); return null; }
  if (e.count >= MAX_FAILURES) return Math.ceil((WINDOW_MS - (now - e.first)) / 60000);
  return null;
}

export function recordLoginFailure(email: string, now: number) {
  const k = key(email);
  const e = failures.get(k);
  if (!e || now - e.first > WINDOW_MS) failures.set(k, { count: 1, first: now });
  else e.count++;
}

export function clearLoginFailures(email: string) {
  failures.delete(key(email));
}

// ---------------------------------------------------------------------------
// General-purpose sliding-window rate limiter (anti-spam / anti-abuse).
// Used to throttle signups, reviews, newsletter sign-ups, support messages, etc.
// In-memory = per server instance. Back with Redis for multi-instance production.
// ---------------------------------------------------------------------------
type Hits = { times: number[] };
const buckets = new Map<string, Hits>();

// Returns true if ALLOWED, false if the caller is over the limit.
// `bucket` namespaces the limit (e.g. "register"); `id` is the caller (usually IP).
export function rateLimit(bucket: string, id: string, max: number, windowMs: number): boolean {
  const k = `${bucket}:${id}`;
  const now = Date.now();
  const entry = buckets.get(k) ?? { times: [] };
  // Drop timestamps outside the window.
  entry.times = entry.times.filter((t) => now - t < windowMs);
  if (entry.times.length >= max) {
    buckets.set(k, entry);
    return false;
  }
  entry.times.push(now);
  buckets.set(k, entry);
  return true;
}

// Best-effort client IP from proxy headers (Cloudflare / hosting). Falls back to
// a constant so local/dev (no proxy headers) still works as a single bucket.
export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local"
  );
}

// Honeypot: bots fill hidden fields humans never see. If the named field has any
// value, treat the submission as spam. Returns true if the request looks like a bot.
export function isBot(body: unknown, field = "website"): boolean {
  if (!body || typeof body !== "object") return false;
  const v = (body as Record<string, unknown>)[field];
  return typeof v === "string" && v.trim().length > 0;
}
