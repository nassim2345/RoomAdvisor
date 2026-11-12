import { getKv } from "./kv";

export interface RateLimitResult {
  allowed: boolean;
  /** Secondi da attendere prima di riprovare (0 se consentito). */
  retryAfter: number;
}

export interface RateLimitConfig {
  max: number;
  windowMs: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = { max: 10, windowMs: 60_000 };

const KEY_PREFIX = "roomadvisor:rl:";

/**
 * Rate limiter a finestra fissa in memoria. Testabile in isolamento:
 * `now` è iniettabile.
 */
export function createMemoryRateLimiter(config: RateLimitConfig) {
  const store = new Map<string, { count: number; resetAt: number }>();
  return function check(key: string, now = Date.now()): RateLimitResult {
    // Cleanup lazy delle entry scadute (niente setInterval in serverless).
    store.forEach((entry, k) => {
      if (entry.resetAt <= now) store.delete(k);
    });
    const existing = store.get(key);
    if (!existing) {
      store.set(key, { count: 1, resetAt: now + config.windowMs });
      return { allowed: true, retryAfter: 0 };
    }
    if (existing.count >= config.max) {
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      };
    }
    existing.count++;
    return { allowed: true, retryAfter: 0 };
  };
}

const memoryLimiter = createMemoryRateLimiter(DEFAULT_RATE_LIMIT);

/**
 * Rate limit distribuito se è configurato Redis (Upstash/Vercel KV), altrimenti
 * in memoria per istanza. Se Redis non risponde si lascia passare la richiesta
 * (fail-open) ripiegando sul limite locale: meglio servire che bloccare tutti.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): Promise<RateLimitResult> {
  const kv = getKv();
  if (!kv) return memoryLimiter(key);
  const redisKey = KEY_PREFIX + key;
  try {
    const [count, , ttl] = await kv.pipeline<[number, number, number]>([
      ["INCR", redisKey],
      ["PEXPIRE", redisKey, config.windowMs, "NX"],
      ["PTTL", redisKey],
    ]);
    if (count > config.max) {
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil((ttl > 0 ? ttl : config.windowMs) / 1000)),
      };
    }
    return { allowed: true, retryAfter: 0 };
  } catch {
    return memoryLimiter(key);
  }
}

/**
 * IP del client. Su Vercel `x-real-ip` è impostato dalla piattaforma e non è
 * falsificabile; `x-forwarded-for` lo è (il primo valore lo sceglie il client),
 * quindi lo usiamo solo come ripiego.
 */
export function getClientIp(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const first = fwd.split(",")[0]?.trim();
  return first || "unknown";
}
