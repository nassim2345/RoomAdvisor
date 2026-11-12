import { NextResponse } from "next/server";
import { isAbortError, withRetry, withTimeout } from "@/lib/async";
import {
  getImagePlanningModel,
  getVisionModel,
  isRetryableGeminiError,
} from "@/lib/gemini";
import { buildImagePlanPrompt, buildUserPrompt } from "@/lib/prompts";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isConfigError, searchShopping } from "@/lib/serpapi";
import { setShared } from "@/lib/share-store";
import { formatSseEvent } from "@/lib/sse";
import type {
  AnalyzeError,
  AnalyzeErrorCode,
  FurnitureQuery,
  Product,
  RoomAnalysis,
} from "@/lib/types";
import {
  isNotARoom,
  isRoomAnalysis,
  parseRecommendRequest,
  type ImagePart,
  type ValidRecommendRequest,
} from "@/lib/validation";
import type { GenerativeModel } from "@google/generative-ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_ITEMS = 5;
const STAGE1_TIMEOUT_MS = 30_000;
const STAGE3_TIMEOUT_MS = 20_000;
const GEMINI_RETRIES = 2;
const GEMINI_RETRY_BASE_MS = 600;

interface StreamErrorPayload {
  code: AnalyzeErrorCode;
  message: string;
}

/** Segnala un errore all'utente e termina la pipeline. */
class PipelineStop extends Error {
  constructor(readonly payload: StreamErrorPayload) {
    super(payload.message);
  }
}

function jsonError(code: AnalyzeErrorCode, message: string, status: number) {
  const body: AnalyzeError = { error: message, code };
  return NextResponse.json(body, { status });
}

const KEY_HINT =
  process.env.ROOMADVISOR_DESKTOP === "1"
    ? "Correggila dal menu «Chiavi API…»."
    : "Controlla GEMINI_API_KEY nella configurazione.";

function mapGeminiError(err: unknown, timedOut: boolean): StreamErrorPayload {
  if (timedOut || isAbortError(err)) {
    return { code: "UPSTREAM_ERROR", message: "Analisi scaduta, riprova" };
  }
  const e = err as { status?: number; message?: string };
  const msg = e?.message ?? "";
  if (e?.status === 429) {
    return {
      code: "RATE_LIMITED",
      message: "Il servizio di analisi è sovraccarico o hai esaurito la quota, riprova tra qualche secondo",
    };
  }
  if (msg.includes("GEMINI_API_KEY")) {
    return { code: "INTERNAL", message: `Chiave Gemini mancante. ${KEY_HINT}` };
  }
  if (
    e?.status === 401 ||
    e?.status === 403 ||
    /API_KEY_INVALID|API key not valid|API key expired/i.test(msg)
  ) {
    return { code: "INTERNAL", message: `Chiave Gemini non valida. ${KEY_HINT}` };
  }
  if (err instanceof SyntaxError) {
    return { code: "UPSTREAM_ERROR", message: "Risposta Gemini non valida, riprova" };
  }
  // Il messaggio grezzo dell'SDK è lungo e tecnico: va nei log, non all'utente.
  console.error("[recommend] Gemini error", err);
  return {
    code: "UPSTREAM_ERROR",
    message: "Il servizio di analisi ha restituito un errore, riprova tra poco",
  };
}

async function generateJson<T>(
  model: GenerativeModel,
  prompt: string,
  imageParts: ImagePart[],
  signal: AbortSignal
): Promise<T> {
  const result = await withRetry(
    () =>
      model.generateContent(
        { contents: [{ role: "user", parts: [{ text: prompt }, ...imageParts] }] },
        { signal }
      ),
    {
      retries: GEMINI_RETRIES,
      baseDelayMs: GEMINI_RETRY_BASE_MS,
      shouldRetry: isRetryableGeminiError,
      signal,
    }
  );
  return JSON.parse(result.response.text()) as T;
}

function isValidPlan(items: unknown): items is FurnitureQuery[] {
  return (
    Array.isArray(items) &&
    items.length > 0 &&
    items.every(
      (i) =>
        typeof i?.category === "string" &&
        typeof i?.query === "string" &&
        i.query.trim().length > 0
    )
  );
}

/**
 * Stadio 1: vision e planner in parallelo (il planner non dipende dall'output
 * della vision). Se la vision fallisce o le foto non mostrano una stanza, il
 * planner viene cancellato da `dispose()`.
 */
async function analyzeAndPlan(
  input: ValidRecommendRequest,
  parent: AbortSignal,
  onAnalysis: (a: RoomAnalysis) => void
): Promise<{ analysis: RoomAnalysis; plan: FurnitureQuery[] }> {
  const stage = withTimeout(parent, STAGE1_TIMEOUT_MS);
  try {
    const planPromise = generateJson<{ items: unknown }>(
      getImagePlanningModel(),
      buildImagePlanPrompt(input.budget, input.goal, input.ownedItems),
      input.imageParts,
      stage.signal
    );
    // Evita "unhandled rejection" se usciamo prima di attenderlo.
    planPromise.catch(() => {});

    let raw: unknown;
    try {
      raw = await generateJson<unknown>(
        getVisionModel(),
        buildUserPrompt(input.imageParts.length, input.dimensions),
        input.imageParts,
        stage.signal
      );
    } catch (err) {
      throw new PipelineStop(mapGeminiError(err, stage.timedOut));
    }

    if (isNotARoom(raw)) {
      throw new PipelineStop({
        code: "NOT_A_ROOM",
        message:
          "Le immagini non sembrano mostrare una stanza. Riprova con foto degli interni.",
      });
    }
    if (!isRoomAnalysis(raw)) {
      throw new PipelineStop({
        code: "UPSTREAM_ERROR",
        message: "Risposta Gemini non conforme allo schema atteso",
      });
    }
    const analysis: RoomAnalysis = {
      ...raw,
      colors: raw.colors.map((c) => c.toUpperCase()),
    };
    onAnalysis(analysis);

    let plan: { items: unknown };
    try {
      plan = await planPromise;
    } catch (err) {
      throw new PipelineStop(mapGeminiError(err, stage.timedOut));
    }
    if (!isValidPlan(plan?.items)) {
      throw new PipelineStop({
        code: "UPSTREAM_ERROR",
        message: "Piano d'arredo Gemini non conforme allo schema",
      });
    }
    return { analysis, plan: plan.items };
  } finally {
    stage.dispose();
  }
}

function describeSerpConfigError(err: unknown): string {
  const status = (err as { status?: number }).status;
  const hint =
    process.env.ROOMADVISOR_DESKTOP === "1"
      ? "Correggila dal menu «Chiavi API…»."
      : "Controlla SERPAPI_KEY nella configurazione.";
  if (status === 500) return `Chiave SerpAPI mancante. ${hint}`;
  return `Chiave SerpAPI non valida o quota esaurita. ${hint}`;
}

/**
 * Stadio 3: una ricerca SerpAPI per categoria, in parallelo. Ogni prodotto
 * viene emesso appena arriva; un singolo fallimento non blocca gli altri.
 */
async function searchProducts(
  plan: FurnitureQuery[],
  budget: number | undefined,
  parent: AbortSignal,
  onProduct: (p: Product) => void,
  onWarning: (e: StreamErrorPayload) => void
): Promise<Product[]> {
  const stage = withTimeout(parent, STAGE3_TIMEOUT_MS);
  const priceRange = budget !== undefined ? { max: budget } : undefined;
  const products: Product[] = [];
  let aborts = 0;
  let failures = 0;
  let configError: string | null = null;

  // Una sola query per categoria, nell'ordine del piano.
  const seen = new Set<string>();
  const queries = plan
    .filter((item) => {
      const key = item.category.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_ITEMS);

  try {
    await Promise.all(
      queries.map(async (item, rank) => {
        try {
          const found = await searchShopping(
            item.query,
            item.category,
            priceRange,
            stage.signal
          );
          if (found) {
            const product: Product = { ...found, rank };
            products.push(product);
            onProduct(product);
          }
        } catch (err) {
          if (isAbortError(err) || stage.signal.aborted) aborts++;
          else if (isConfigError(err)) configError = describeSerpConfigError(err);
          else failures++;
        }
      })
    );
  } finally {
    stage.dispose();
  }

  if (products.length === 0) {
    if (configError) throw new PipelineStop({ code: "INTERNAL", message: configError });
    if (aborts > 0) {
      throw new PipelineStop({
        code: "UPSTREAM_ERROR",
        message: "Ricerca prodotti scaduta, riprova",
      });
    }
    if (failures > 0) {
      throw new PipelineStop({
        code: "UPSTREAM_ERROR",
        message: "Ricerca prodotti non disponibile al momento, riprova più tardi",
      });
    }
  } else if (failures + aborts > 0) {
    const missed = failures + aborts;
    onWarning({
      code: "UPSTREAM_ERROR",
      message:
        missed === 1
          ? `Una categoria su ${queries.length} non è stata cercata per un errore temporaneo.`
          : `${missed} categorie su ${queries.length} non sono state cercate per un errore temporaneo.`,
    });
  }

  return products.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
}

export async function POST(req: Request) {
  // 1° controllo: rate limit (HTTP 429 puro, non SSE). Costa quasi nulla.
  const rl = await checkRateLimit(getClientIp(req));
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Troppe richieste, riprova tra poco", code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("INVALID_INPUT", "Body JSON non valido", 400);
  }
  const parsed = parseRecommendRequest(body);
  if (!parsed.ok) return jsonError("INVALID_INPUT", parsed.message, 400);
  const input = parsed.value;

  // Abortito se il client chiude la connessione: ferma Gemini e SerpAPI.
  const lifecycle = new AbortController();
  const onClientAbort = () => lifecycle.abort();
  req.signal?.addEventListener("abort", onClientAbort, { once: true });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (type: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(formatSseEvent(type, data)));
        } catch {
          closed = true;
          lifecycle.abort();
        }
      };

      try {
        const { analysis, plan } = await analyzeAndPlan(
          input,
          lifecycle.signal,
          (a) => send("analysis", a)
        );
        const products = await searchProducts(
          plan,
          input.budget,
          lifecycle.signal,
          (p) => send("product", p),
          (w) => send("warning", w)
        );
        // Nell'app desktop il server gira su 127.0.0.1 con una porta casuale:
        // un link condiviso non sarebbe raggiungibile da nessun altro.
        if (!lifecycle.signal.aborted && process.env.ROOMADVISOR_DESKTOP !== "1") {
          try {
            const id = await setShared({ analysis, products });
            send("shared", { id });
          } catch (err) {
            // Il link di condivisione è accessorio: non fa fallire la risposta.
            console.error("[recommend] share store failed", err);
          }
        }
      } catch (err) {
        if (err instanceof PipelineStop) {
          send("error", err.payload);
        } else if (!lifecycle.signal.aborted) {
          console.error("[recommend] unexpected error", err);
          send("error", { code: "INTERNAL", message: "Errore interno, riprova" });
        }
      } finally {
        send("done", {});
        req.signal?.removeEventListener("abort", onClientAbort);
        lifecycle.abort();
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            /* già chiuso */
          }
        }
      }
    },
    cancel() {
      lifecycle.abort();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
