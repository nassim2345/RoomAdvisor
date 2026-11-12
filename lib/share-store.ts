import { randomUUID } from "node:crypto";
import { getKv } from "./kv";
import type { SharedResult } from "./types";

export const SHARE_TTL_SECONDS = 24 * 60 * 60; // 24 ore
const KEY_PREFIX = "roomadvisor:share:";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Entry {
  data: SharedResult;
  expiresAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __roomadvisorShareStore: Map<string, Entry> | undefined;
}

// Fallback in memoria: persiste tra gli hot-reload di Next in dev. Su
// serverless non è condiviso tra istanze → configura Upstash/Vercel KV.
const memory: Map<string, Entry> =
  globalThis.__roomadvisorShareStore ??
  (globalThis.__roomadvisorShareStore = new Map());

export function isShareId(id: string): boolean {
  return UUID_RE.test(id);
}

export async function setShared(data: SharedResult): Promise<string> {
  const id = randomUUID();
  const kv = getKv();
  if (kv) {
    await kv.command([
      "SET",
      KEY_PREFIX + id,
      JSON.stringify(data),
      "EX",
      SHARE_TTL_SECONDS,
    ]);
    return id;
  }
  const now = Date.now();
  memory.forEach((entry, key) => {
    if (entry.expiresAt < now) memory.delete(key);
  });
  memory.set(id, { data, expiresAt: now + SHARE_TTL_SECONDS * 1000 });
  return id;
}

export async function getShared(id: string): Promise<SharedResult | null> {
  if (!isShareId(id)) return null;
  const kv = getKv();
  if (kv) {
    const raw = await kv.command<string | null>(["GET", KEY_PREFIX + id]);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SharedResult;
    } catch {
      return null;
    }
  }
  const entry = memory.get(id);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memory.delete(id);
    return null;
  }
  return entry.data;
}
