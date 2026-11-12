import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/recommend/route";
import { SseParser } from "@/lib/sse";

const vision = vi.fn();
const planner = vi.fn();
const search = vi.fn();

vi.mock("@/lib/gemini", () => ({
  getVisionModel: () => ({ generateContent: vision }),
  getImagePlanningModel: () => ({ generateContent: planner }),
  isRetryableGeminiError: (e: { status?: number }) => e?.status === 503,
}));

vi.mock("@/lib/serpapi", async (orig) => ({
  ...(await orig<typeof import("@/lib/serpapi")>()),
  searchShopping: (...args: unknown[]) => search(...args),
}));

const PNG = "data:image/png;base64,iVBORw0KGgo=";
const json = (x: unknown) => ({ response: { text: () => JSON.stringify(x) } });
const room = {
  isRoom: true,
  colors: ["#aabbcc"],
  style: "Japandi",
  dimensions: "15 m²",
  confidence: "high",
  observations: [],
  issues: [],
};
const plan = {
  items: [
    { category: "Lampada", query: "lampada" },
    { category: "Tappeto", query: "tappeto" },
    { category: "lampada", query: "lampada duplicata" },
  ],
};

let ipCounter = 0;
function request(body: unknown) {
  return new Request("http://localhost/api/recommend", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": `10.0.0.${++ipCounter}` },
    body: JSON.stringify(body),
  });
}

async function readEvents(res: Response) {
  const parser = new SseParser();
  const text = await res.text();
  return [...parser.push(text), ...parser.flush()];
}

beforeEach(() => {
  vision.mockReset();
  planner.mockReset();
  search.mockReset();
});

describe("POST /api/recommend", () => {
  it("rejects invalid input with plain JSON 400", async () => {
    const res = await POST(request({ images: [] }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "INVALID_INPUT" });
  });

  it("streams analysis, products in plan order, shared and done", async () => {
    vision.mockResolvedValue(json(room));
    planner.mockResolvedValue(json(plan));
    // Il tappeto (rank 1) arriva prima della lampada (rank 0).
    search.mockImplementation(async (query: string, category: string) => {
      await new Promise((r) => setTimeout(r, query === "lampada" ? 20 : 1));
      return { category, query, name: category, price: "10 €", link: "https://x.example", thumbnail: null };
    });

    const res = await POST(request({ images: [PNG] }));
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const events = await readEvents(res);

    expect(events.map((e) => e.event)).toEqual(["analysis", "product", "product", "shared", "done"]);
    expect((events[0].data as { colors: string[] }).colors).toEqual(["#AABBCC"]);
    // Categoria duplicata scartata: solo 2 ricerche.
    expect(search).toHaveBeenCalledTimes(2);
    const products = events.filter((e) => e.event === "product").map((e) => e.data as { rank: number });
    expect(products.map((p) => p.rank).sort()).toEqual([0, 1]);
  });

  it("emits NOT_A_ROOM and cancels the in-flight planner", async () => {
    vision.mockResolvedValue(json({ ...room, isRoom: false, colors: [] }));
    let plannerSignal: AbortSignal | undefined;
    planner.mockImplementation((_req: unknown, opts: { signal: AbortSignal }) => {
      plannerSignal = opts.signal;
      return new Promise(() => {}); // non risponde mai
    });

    const events = await readEvents(await POST(request({ images: [PNG] })));
    expect(events.map((e) => e.event)).toEqual(["error", "done"]);
    expect(events[0].data).toMatchObject({ code: "NOT_A_ROOM" });
    expect(plannerSignal?.aborted).toBe(true);
    expect(search).not.toHaveBeenCalled();
  });

  it("retries transient Gemini errors", async () => {
    vision.mockRejectedValueOnce({ status: 503 }).mockResolvedValue(json(room));
    planner.mockResolvedValue(json(plan));
    search.mockResolvedValue(null);

    const events = await readEvents(await POST(request({ images: [PNG] })));
    expect(vision).toHaveBeenCalledTimes(2);
    expect(events[0].event).toBe("analysis");
  });

  it("surfaces SerpAPI failures instead of an empty result", async () => {
    vision.mockResolvedValue(json(room));
    planner.mockResolvedValue(json(plan));
    search.mockRejectedValue(new Error("boom"));

    const events = await readEvents(await POST(request({ images: [PNG] })));
    expect(events.map((e) => e.event)).toEqual(["analysis", "error", "done"]);
    expect(events[1].data).toMatchObject({ code: "UPSTREAM_ERROR" });
  });

  it("warns on partial failures but still returns the found products", async () => {
    vision.mockResolvedValue(json(room));
    planner.mockResolvedValue(json(plan));
    search
      .mockResolvedValueOnce({ category: "Lampada", query: "q", name: "L", price: null, link: "https://x.example", thumbnail: null })
      .mockRejectedValueOnce(new Error("boom"));

    const events = await readEvents(await POST(request({ images: [PNG] })));
    expect(events.map((e) => e.event)).toEqual(["analysis", "product", "warning", "shared", "done"]);
  });

  it("returns 429 after the rate limit", async () => {
    vision.mockResolvedValue(json(room));
    planner.mockResolvedValue(json(plan));
    search.mockResolvedValue(null);
    const headers = { "content-type": "application/json", "x-real-ip": "9.9.9.9" };
    let last: Response | undefined;
    for (let i = 0; i < 11; i++) {
      last = await POST(
        new Request("http://localhost/api/recommend", {
          method: "POST",
          headers,
          body: JSON.stringify({ images: [] }),
        })
      );
    }
    expect(last?.status).toBe(429);
    expect(last?.headers.get("retry-after")).toBeTruthy();
  });
});

describe("error messages", () => {
  it("turns an invalid Gemini key into a readable message", async () => {
    vision.mockRejectedValue(
      Object.assign(new Error("[400 Bad Request] API key not valid. Please pass a valid API key."), { status: 400 })
    );
    planner.mockReturnValue(new Promise(() => {}));
    const events = await readEvents(await POST(request({ images: [PNG] })));
    expect(events[0].data).toEqual({
      code: "INTERNAL",
      message: "Chiave Gemini non valida. Controlla GEMINI_API_KEY nella configurazione.",
    });
  });

  it("does not leak raw SDK messages for other upstream errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vision.mockRejectedValue(Object.assign(new Error("[400] internal gibberish {json}"), { status: 400 }));
    planner.mockReturnValue(new Promise(() => {}));
    const events = await readEvents(await POST(request({ images: [PNG] })));
    expect((events[0].data as { message: string }).message).not.toContain("gibberish");
  });
});
