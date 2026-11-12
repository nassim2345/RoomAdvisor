/**
 * Client minimale per Redis via REST (Upstash / Vercel KV), senza dipendenze.
 *
 * Se le variabili d'ambiente non sono configurate `getKv()` ritorna null e i
 * chiamanti ripiegano su uno store in memoria (va bene in locale, NON su
 * serverless con più istanze).
 */

type RedisValue = string | number | null;
export type RedisCommand = (string | number)[];

export interface KvClient {
  command<T = RedisValue>(cmd: RedisCommand): Promise<T>;
  pipeline<T extends unknown[] = RedisValue[]>(cmds: RedisCommand[]): Promise<T>;
}

const KV_TIMEOUT_MS = 3_000;

export class KvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KvError";
  }
}

function readConfig(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

async function post(url: string, token: string, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(KV_TIMEOUT_MS),
  });
  if (!res.ok) throw new KvError(`KV HTTP ${res.status}`);
  return res.json();
}

function unwrap<T>(entry: unknown): T {
  const e = entry as { result?: unknown; error?: string };
  if (e?.error) throw new KvError(e.error);
  return e?.result as T;
}

let cached: KvClient | null | undefined;

export function getKv(): KvClient | null {
  if (cached !== undefined) return cached;
  const cfg = readConfig();
  if (!cfg) return (cached = null);
  cached = {
    async command<T>(cmd: RedisCommand) {
      return unwrap<T>(await post(cfg.url, cfg.token, cmd));
    },
    async pipeline<T extends unknown[]>(cmds: RedisCommand[]) {
      const out = (await post(`${cfg.url}/pipeline`, cfg.token, cmds)) as unknown[];
      return out.map((e) => unwrap(e)) as T;
    },
  };
  return cached;
}

/** Solo per i test. */
export function __resetKvForTests() {
  cached = undefined;
}
