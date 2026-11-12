import { afterEach, describe, expect, it, vi } from "vitest";
import { __resetKvForTests } from "@/lib/kv";
import { getShared, isShareId, setShared } from "@/lib/share-store";
import type { SharedResult } from "@/lib/types";

const data: SharedResult = {
  analysis: {
    colors: ["#FFFFFF"],
    style: "Minimal",
    dimensions: "10 m²",
    confidence: "high",
    observations: [],
    issues: [],
  },
  products: [],
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  __resetKvForTests();
});

describe("share store (memory fallback)", () => {
  it("stores and retrieves by UUID", async () => {
    const id = await setShared(data);
    expect(isShareId(id)).toBe(true);
    expect(await getShared(id)).toEqual(data);
  });

  it("rejects malformed ids without touching the store", async () => {
    expect(await getShared("../../etc/passwd")).toBeNull();
    expect(await getShared("00000000-0000-0000-0000-000000000000")).toBeNull();
  });
});

describe("share store (Redis REST)", () => {
  it("uses SET with EX and GET via the REST API", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://kv.example/");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    __resetKvForTests();
    const kv = new Map<string, string>();
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const cmd = JSON.parse(init.body as string) as string[];
      expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
      if (cmd[0] === "SET") {
        expect(cmd[3]).toBe("EX");
        kv.set(cmd[1], cmd[2]);
        return Response.json({ result: "OK" });
      }
      return Response.json({ result: kv.get(cmd[1]) ?? null });
    });
    vi.stubGlobal("fetch", fetchMock);

    const id = await setShared(data);
    expect(fetchMock.mock.calls[0][0]).toBe("https://kv.example");
    expect(await getShared(id)).toEqual(data);
  });
});
