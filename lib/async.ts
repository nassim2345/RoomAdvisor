export function isAbortError(err: unknown): boolean {
  const name = (err as { name?: string })?.name;
  return name === "AbortError" || name === "TimeoutError";
}

/**
 * Crea un segnale che si attiva quando il `parent` viene abortito OPPURE dopo
 * `timeoutMs`. `dispose()` ferma il timer e aborta il segnale derivato, così le
 * chiamate ancora in volo (es. il planner quando la vision fallisce) vengono
 * cancellate e non consumano token inutilmente.
 */
export function withTimeout(parent: AbortSignal, timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;
  const onAbort = () => controller.abort(parent.reason);
  if (parent.aborted) controller.abort(parent.reason);
  else parent.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  return {
    signal: controller.signal,
    get timedOut() {
      return timedOut;
    },
    dispose() {
      clearTimeout(timer);
      parent.removeEventListener("abort", onAbort);
      if (!controller.signal.aborted) controller.abort();
    },
  };
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? abortError());
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(signal?.reason ?? abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function abortError(): Error {
  const e = new Error("Aborted");
  e.name = "AbortError";
  return e;
}

export interface RetryOptions {
  retries: number;
  baseDelayMs: number;
  shouldRetry: (err: unknown) => boolean;
  signal?: AbortSignal;
}

/** Retry con backoff esponenziale + jitter. Non ritenta mai gli abort. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { retries, baseDelayMs, shouldRetry, signal }: RetryOptions
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || isAbortError(err) || signal?.aborted || !shouldRetry(err)) {
        throw err;
      }
      const delay = baseDelayMs * 2 ** attempt * (0.75 + Math.random() * 0.5);
      attempt++;
      await sleep(delay, signal);
    }
  }
}
