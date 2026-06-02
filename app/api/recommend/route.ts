import { NextResponse } from "next/server";
import { isValidBudget } from "@/lib/budget";
import { getImagePlanningModel, getVisionModel } from "@/lib/gemini";
import { buildImagePlanPrompt, buildUserPrompt } from "@/lib/prompts";
import { SerpApiError, searchShopping } from "@/lib/serpapi";
import { setShared } from "@/lib/share-store";
import type {
  AnalyzeError,
  AnalyzeErrorCode,
  FurnitureQuery,
  Product,
  RecommendRequest,
  RoomAnalysis,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const DATA_URL_RE = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/;
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
const MAX_IMAGES = 3;
const MAX_TOTAL_BYTES = 15 * 1024 * 1024;
const MAX_ITEMS = 5;

type ImagePart = { inlineData: { mimeType: string; data: string } };

function jsonError(code: AnalyzeErrorCode, message: string, status: number) {
  const body: AnalyzeError = { error: message, code };
  return NextResponse.json(body, { status });
}

function isRoomAnalysis(x: RoomAnalysis): boolean {
  return (
    Array.isArray(x.colors) &&
    x.colors.length >= 1 &&
    x.colors.length <= 5 &&
    x.colors.every((c) => typeof c === "string" && HEX_RE.test(c)) &&
    typeof x.style === "string" &&
    typeof x.dimensions === "string" &&
    ["low", "medium", "high"].includes(x.confidence)
  );
}

export async function POST(req: Request) {
  let body: RecommendRequest;
  try {
    body = (await req.json()) as RecommendRequest;
  } catch {
    return jsonError("INVALID_INPUT", "Body JSON non valido", 400);
  }

  if (
    !body ||
    !Array.isArray(body.images) ||
    body.images.length === 0 ||
    body.images.length > MAX_IMAGES
  ) {
    return jsonError(
      "INVALID_INPUT",
      `Il campo "images" deve essere un array di 1-${MAX_IMAGES} elementi`,
      400
    );
  }

  if (body.budget !== undefined && !isValidBudget(body.budget)) {
    return jsonError(
      "INVALID_INPUT",
      'Campo "budget" deve essere un numero positivo (euro massimi per pezzo)',
      400
    );
  }

  const imageParts: ImagePart[] = [];
  let totalBytes = 0;
  for (let i = 0; i < body.images.length; i++) {
    const dataUrl = body.images[i];
    if (typeof dataUrl !== "string") {
      return jsonError("INVALID_INPUT", `images[${i}] non è una stringa`, 400);
    }
    const match = DATA_URL_RE.exec(dataUrl);
    if (!match) {
      return jsonError(
        "INVALID_INPUT",
        `images[${i}] non è una data URL base64 valida`,
        400
      );
    }
    const [, mimeType, data] = match;
    totalBytes += Math.floor((data.length * 3) / 4);
    if (totalBytes > MAX_TOTAL_BYTES) {
      return jsonError(
        "INVALID_INPUT",
        `Dimensione totale immagini supera ${MAX_TOTAL_BYTES} byte`,
        400
      );
    }
    imageParts.push({ inlineData: { mimeType, data } });
  }

  const dimensions =
    typeof body.dimensions === "string" ? body.dimensions : undefined;
  const budget = isValidBudget(body.budget) ? body.budget : undefined;
  const priceRange = budget !== undefined ? { max: budget } : undefined;

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (type: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };
      const mapGeminiError = (
        err: unknown
      ): { code: AnalyzeErrorCode; message: string } => {
        const e = err as { status?: number; message?: string };
        if (e.status === 429)
          return { code: "RATE_LIMITED", message: "Rate limit Gemini raggiunto" };
        const msg = e.message ?? "Errore chiamata Gemini";
        if (msg.includes("GEMINI_API_KEY"))
          return { code: "INTERNAL", message: msg };
        return { code: "UPSTREAM_ERROR", message: msg };
      };

      // Planner parallelo a vision: non dipende dal suo output.
      const planPromise = (async (): Promise<
        { ok: true; items: FurnitureQuery[] } | { ok: false; error: unknown }
      > => {
        try {
          const model = getImagePlanningModel();
          const result = await model.generateContent({
            contents: [
              {
                role: "user",
                parts: [{ text: buildImagePlanPrompt(budget) }, ...imageParts],
              },
            ],
          });
          const parsed = JSON.parse(result.response.text()) as {
            items: FurnitureQuery[];
          };
          return { ok: true, items: parsed.items };
        } catch (error) {
          return { ok: false, error };
        }
      })();

      let analysis: RoomAnalysis;
      try {
        const model = getVisionModel();
        const result = await model.generateContent({
          contents: [
            {
              role: "user",
              parts: [
                { text: buildUserPrompt(body.images.length, dimensions) },
                ...imageParts,
              ],
            },
          ],
        });
        analysis = JSON.parse(result.response.text()) as RoomAnalysis;
      } catch (err) {
        send("error", mapGeminiError(err));
        send("done", {});
        controller.close();
        return;
      }

      if (!isRoomAnalysis(analysis)) {
        send("error", {
          code: "UPSTREAM_ERROR",
          message: "Risposta Gemini non conforme allo schema atteso",
        });
        send("done", {});
        controller.close();
        return;
      }

      if (analysis.confidence === "low" && /non determinabile/i.test(analysis.style)) {
        send("error", {
          code: "NOT_A_ROOM",
          message:
            "Le immagini non sembrano mostrare una stanza. Riprova con foto degli interni.",
        });
        send("done", {});
        controller.close();
        return;
      }

      send("analysis", analysis);

      const plan = await planPromise;
      if (!plan.ok) {
        send("error", mapGeminiError(plan.error));
        send("done", {});
        controller.close();
        return;
      }
      if (
        !Array.isArray(plan.items) ||
        plan.items.length === 0 ||
        !plan.items.every(
          (i) => typeof i?.category === "string" && typeof i?.query === "string"
        )
      ) {
        send("error", {
          code: "UPSTREAM_ERROR",
          message: "Piano d'arredo Gemini non conforme allo schema",
        });
        send("done", {});
        controller.close();
        return;
      }

      const queries = plan.items.slice(0, MAX_ITEMS);
      const products: Product[] = [];
      await Promise.all(
        queries.map(async (item) => {
          try {
            const product = await searchShopping(
              item.query,
              item.category,
              priceRange
            );
            if (product) {
              products.push(product);
              send("product", product);
            }
          } catch (err) {
            // Un singolo fallimento non interrompe le altre query parallele.
            if (err instanceof SerpApiError && err.status === 500) {
              send("error", { code: "INTERNAL", message: err.message });
            }
          }
        })
      );

      const id = setShared({ analysis, products });
      send("shared", { id });
      send("done", {});
      controller.close();
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
