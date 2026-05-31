import { NextResponse } from "next/server";
import { getPlanningModel } from "@/lib/gemini";
import { buildFurniturePrompt } from "@/lib/prompts";
import { SerpApiError, searchShopping } from "@/lib/serpapi";
import type {
  FurnitureQuery,
  Product,
  ProductsError,
  ProductsErrorCode,
  ProductsRequest,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_ITEMS = 5;

function errorResponse(
  code: ProductsErrorCode,
  message: string,
  status: number
) {
  const body: ProductsError = { error: message, code };
  return NextResponse.json(body, { status });
}

function isValidAnalysis(a: unknown): a is ProductsRequest["analysis"] {
  if (!a || typeof a !== "object") return false;
  const x = a as Record<string, unknown>;
  return (
    Array.isArray(x.colors) &&
    x.colors.every((c) => typeof c === "string") &&
    typeof x.style === "string" &&
    typeof x.dimensions === "string" &&
    typeof x.confidence === "string"
  );
}

export async function POST(req: Request) {
  let body: ProductsRequest;
  try {
    body = (await req.json()) as ProductsRequest;
  } catch {
    return errorResponse("INVALID_INPUT", "Body JSON non valido", 400);
  }

  if (!isValidAnalysis(body?.analysis)) {
    return errorResponse(
      "INVALID_INPUT",
      'Campo "analysis" mancante o malformato',
      400
    );
  }

  let plan: FurnitureQuery[];
  try {
    const model = getPlanningModel();
    const result = await model.generateContent(
      buildFurniturePrompt(body.analysis)
    );
    const parsed = JSON.parse(result.response.text()) as {
      items: FurnitureQuery[];
    };
    if (
      !Array.isArray(parsed.items) ||
      parsed.items.length === 0 ||
      !parsed.items.every(
        (i) => typeof i?.category === "string" && typeof i?.query === "string"
      )
    ) {
      return errorResponse(
        "UPSTREAM_ERROR",
        "Piano d'arredo Gemini non conforme allo schema",
        502
      );
    }
    plan = parsed.items.slice(0, MAX_ITEMS);
  } catch (err) {
    const e = err as { status?: number; message?: string };
    if (e.status === 429) {
      return errorResponse(
        "RATE_LIMITED",
        "Rate limit Gemini raggiunto",
        429
      );
    }
    const msg = e.message ?? "Errore generazione piano d'arredo";
    if (msg.includes("GEMINI_API_KEY")) {
      return errorResponse("INTERNAL", msg, 500);
    }
    return errorResponse("UPSTREAM_ERROR", msg, 502);
  }

  const settled = await Promise.allSettled(
    plan.map((item) => searchShopping(item.query, item.category))
  );

  const products: Product[] = [];
  let lastError: string | null = null;
  let rateLimited = false;
  let keyMissing = false;

  for (const r of settled) {
    if (r.status === "fulfilled") {
      if (r.value) products.push(r.value);
    } else {
      const reason = r.reason as SerpApiError | Error;
      lastError = reason.message;
      if (reason instanceof SerpApiError) {
        if (reason.status === 429) rateLimited = true;
        if (reason.status === 500 && reason.message.includes("SERPAPI_KEY")) {
          keyMissing = true;
        }
      }
    }
  }

  if (products.length === 0) {
    if (keyMissing) {
      return errorResponse(
        "INTERNAL",
        "SERPAPI_KEY non configurata in .env.local",
        500
      );
    }
    if (rateLimited) {
      return errorResponse(
        "RATE_LIMITED",
        "Quota SerpAPI esaurita, riprova più tardi",
        429
      );
    }
    return errorResponse(
      "UPSTREAM_ERROR",
      lastError ?? "Nessun prodotto trovato per le query suggerite",
      502
    );
  }

  return NextResponse.json({ products });
}
