const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 10;
const memoryStore = new Map();

function inMemoryCheck(ip) {
  const now = Date.now();
  const entry = memoryStore.get(ip);
  if (!entry || now > entry.resetAt) {
    memoryStore.set(ip, { count: 1, resetAt: now + WINDOW_SECONDS * 1000 });
    return { allowed: true, remaining: MAX_REQUESTS - 1, retryAfter: 0 };
  }
  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { allowed: true, remaining: MAX_REQUESTS - entry.count, retryAfter: 0 };
}

export async function checkRateLimit(env, ip) {
  if (env.RATE_LIMITER && typeof env.RATE_LIMITER.limit === "function") {
    try {
      const result = await env.RATE_LIMITER.limit({ key: ip || "unknown" });
      return { allowed: result.success, remaining: 0, retryAfter: WINDOW_SECONDS };
    } catch {
      // fall through
    }
  }
  return inMemoryCheck(ip || "unknown");
}
