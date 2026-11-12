import { SseParser, type SseEvent } from "./sse";
import type { Goal, Product, RoomAnalysis, StreamError } from "./types";

export interface RecommendPayload {
  images: string[];
  dimensions?: string;
  budget?: number;
  goal?: Goal;
  ownedItems?: string;
}

export interface RecommendHandlers {
  onAnalysis: (analysis: RoomAnalysis) => void;
  onAnalysisError: (error: StreamError) => void;
  onProduct: (product: Product) => void;
  onProductsError: (error: StreamError) => void;
  onWarning?: (error: StreamError) => void;
  onShared: (id: string) => void;
}

/**
 * Smista un evento SSE sull'handler giusto. Un errore prima dell'analisi (o
 * NOT_A_ROOM) è un errore di analisi; dopo, riguarda i prodotti.
 */
export function dispatchEvent(
  ev: SseEvent,
  handlers: RecommendHandlers,
  state: { gotAnalysis: boolean }
): void {
  switch (ev.event) {
    case "analysis":
      state.gotAnalysis = true;
      handlers.onAnalysis(ev.data as RoomAnalysis);
      break;
    case "product":
      handlers.onProduct(ev.data as Product);
      break;
    case "shared":
      handlers.onShared((ev.data as { id: string }).id);
      break;
    case "warning":
      handlers.onWarning?.(ev.data as StreamError);
      break;
    case "error": {
      const err = ev.data as StreamError;
      if (err.code === "NOT_A_ROOM" || !state.gotAnalysis) handlers.onAnalysisError(err);
      else handlers.onProductsError(err);
      break;
    }
  }
}

/** Chiama `/api/recommend` e consuma lo stream SSE fino alla fine. */
export async function streamRecommend(
  payload: RecommendPayload,
  handlers: RecommendHandlers,
  signal: AbortSignal
): Promise<void> {
  const res = await fetch("/api/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify(payload),
  });

  if (!res.ok || !res.body) {
    let message =
      res.status === 413
        ? "Le foto sono troppo pesanti. Prova con immagini più piccole."
        : res.status === 429
          ? "Troppe richieste, riprova tra un minuto."
          : "Errore di rete";
    let code: string | undefined = res.status === 429 ? "RATE_LIMITED" : undefined;
    try {
      const j = await res.json();
      message = j.error ?? message;
      code = j.code ?? code;
    } catch {
      /* corpo non JSON */
    }
    handlers.onAnalysisError({ message, code });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const parser = new SseParser();
  const state = { gotAnalysis: false };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const ev of parser.push(decoder.decode(value, { stream: true }))) {
      dispatchEvent(ev, handlers, state);
    }
  }
  for (const ev of parser.push(decoder.decode())) dispatchEvent(ev, handlers, state);
  for (const ev of parser.flush()) dispatchEvent(ev, handlers, state);
}
