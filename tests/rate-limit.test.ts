import { describe, expect, it } from "vitest";
import { createMemoryRateLimiter, getClientIp } from "@/lib/rate-limit";

describe("createMemoryRateLimiter", () => {
  it("allows up to max requests per window, then blocks with retryAfter", () => {
    const check = createMemoryRateLimiter({ max: 2, windowMs: 10_000 });
    expect(check("ip", 0).allowed).toBe(true);
    expect(check("ip", 1).allowed).toBe(true);
    const blocked = check("ip", 2_000);
    expect(blocked).toEqual({ allowed: false, retryAfter: 8 });
    expect(check("other", 2_000).allowed).toBe(true);
  });

  it("resets after the window", () => {
    const check = createMemoryRateLimiter({ max: 1, windowMs: 1_000 });
    expect(check("ip", 0).allowed).toBe(true);
    expect(check("ip", 500).allowed).toBe(false);
    expect(check("ip", 1_000).allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  const req = (headers: Record<string, string>) => new Request("http://x", { headers });
  it("prefers x-real-ip over spoofable x-forwarded-for", () => {
    expect(getClientIp(req({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "6.6.6.6" }))).toBe("1.1.1.1");
    expect(getClientIp(req({ "x-forwarded-for": "2.2.2.2, 3.3.3.3" }))).toBe("2.2.2.2");
    expect(getClientIp(req({}))).toBe("unknown");
  });
});
