export interface SseEvent {
  event: string;
  data: unknown;
}

/** Serializza un evento SSE (`event:` + `data:` JSON su una riga). */
export function formatSseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** Interpreta un singolo blocco SSE (senza il separatore `\n\n`). */
export function parseSseChunk(chunk: string): SseEvent | null {
  let event: string | null = null;
  const dataLines: string[] = [];
  for (const rawLine of chunk.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
  }
  if (!event || dataLines.length === 0) return null;
  try {
    return { event, data: JSON.parse(dataLines.join("\n")) };
  } catch {
    return null;
  }
}

/**
 * Parser incrementale: accetta frammenti arbitrari dello stream e restituisce
 * gli eventi completi. Gestisce eventi spezzati tra più chunk di rete.
 */
export class SseParser {
  private buffer = "";

  push(text: string): SseEvent[] {
    this.buffer += text.replace(/\r\n/g, "\n");
    const blocks = this.buffer.split("\n\n");
    this.buffer = blocks.pop() ?? "";
    const events: SseEvent[] = [];
    for (const block of blocks) {
      const ev = parseSseChunk(block);
      if (ev) events.push(ev);
    }
    return events;
  }

  /** Svuota l'eventuale evento finale non terminato da `\n\n`. */
  flush(): SseEvent[] {
    const rest = this.buffer;
    this.buffer = "";
    const ev = rest.trim() ? parseSseChunk(rest) : null;
    return ev ? [ev] : [];
  }
}
