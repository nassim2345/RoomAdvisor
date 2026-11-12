import { describe, expect, it, vi } from "vitest";
import { isAbortError, withRetry, withTimeout } from "@/lib/async";

describe("withTimeout", () => {
  it("aborts after the timeout and reports timedOut", async () => {
    vi.useFakeTimers();
    const t = withTimeout(new AbortController().signal, 100);
    expect(t.signal.aborted).toBe(false);
    vi.advanceTimersByTime(100);
    expect(t.signal.aborted).toBe(true);
    expect(t.timedOut).toBe(true);
    vi.useRealTimers();
  });

  it("follows the parent signal", () => {
    const parent = new AbortController();
    const t = withTimeout(parent.signal, 10_000);
    parent.abort();
    expect(t.signal.aborted).toBe(true);
    expect(t.timedOut).toBe(false);
    t.dispose();
  });

  it("dispose cancels in-flight work", () => {
    const t = withTimeout(new AbortController().signal, 10_000);
    t.dispose();
    expect(t.signal.aborted).toBe(true);
  });
});

describe("withRetry", () => {
  it("retries retryable errors then succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValueOnce("ok");
    await expect(
      withRetry(fn, { retries: 2, baseDelayMs: 1, shouldRetry: () => true })
    ).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-retryable errors or aborts", async () => {
    const err = { status: 400 };
    const fn = vi.fn().mockRejectedValue(err);
    await expect(
      withRetry(fn, { retries: 3, baseDelayMs: 1, shouldRetry: (e) => (e as { status: number }).status === 503 })
    ).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);

    const abort = Object.assign(new Error("x"), { name: "AbortError" });
    const fn2 = vi.fn().mockRejectedValue(abort);
    await expect(
      withRetry(fn2, { retries: 3, baseDelayMs: 1, shouldRetry: () => true })
    ).rejects.toBe(abort);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it("gives up after the configured retries", async () => {
    const fn = vi.fn().mockRejectedValue({ status: 503 });
    await expect(
      withRetry(fn, { retries: 2, baseDelayMs: 1, shouldRetry: () => true })
    ).rejects.toEqual({ status: 503 });
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe("isAbortError", () => {
  it("recognises abort and timeout errors", () => {
    expect(isAbortError({ name: "AbortError" })).toBe(true);
    expect(isAbortError({ name: "TimeoutError" })).toBe(true);
    expect(isAbortError(new Error("x"))).toBe(false);
  });
});
