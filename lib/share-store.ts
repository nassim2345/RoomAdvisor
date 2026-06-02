import { randomUUID } from "node:crypto";
import type { SharedResult } from "./types";

const TTL_MS = 24 * 60 * 60 * 1000; // 24 ore

interface Entry {
  data: SharedResult;
  expiresAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __roomadvisorShareStore: Map<string, Entry> | undefined;
}

// Persiste tra gli hot-reload di Next in dev (altrimenti la Map verrebbe
// ricreata a ogni HMR). In produzione singolo processo è una Map normale.
const store: Map<string, Entry> =
  globalThis.__roomadvisorShareStore ??
  (globalThis.__roomadvisorShareStore = new Map());

export function setShared(data: SharedResult): string {
  const id = randomUUID();
  store.set(id, { data, expiresAt: Date.now() + TTL_MS });
  return id;
}

export function getShared(id: string): SharedResult | null {
  const entry = store.get(id);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(id);
    return null;
  }
  return entry.data;
}
