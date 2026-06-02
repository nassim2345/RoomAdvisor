import { NextResponse } from "next/server";
import { getVisionModel } from "@/lib/gemini";
import { buildUserPrompt } from "@/lib/prompts";
import type {
  AnalyzeError,
  AnalyzeErrorCode,
  AnalyzeRequest,
  RoomAnalysis,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const DATA_URL_RE = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/;
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
const MAX_IMAGES = 3;
const MAX_TOTAL_BYTES = 15 * 1024 * 1024;

function errorResponse(
  code: AnalyzeErrorCode,
  message: string,
  status: number
) {
  const body: AnalyzeError = { error: message, code };
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  let body: AnalyzeRequest;
  try {
    body = (await req.json()) as AnalyzeRequest;
  } catch {
    return errorResponse("INVALID_INPUT", "Body JSON non valido", 400);
  }

  if (
    !body ||
    !Array.isArray(body.images) ||
    body.images.length === 0 ||
    body.images.length > MAX_IMAGES
  ) {
    return errorResponse(
      "INVALID_INPUT",
      `Il campo "images" deve essere un array di 1-${MAX_IMAGES} elementi`,
      400
    );
  }

  const dimensions =
    typeof body.dimensions === "string" ? body.dimensions : undefined;

  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [{ text: buildUserPrompt(body.images.length, dimensions) }];
  let totalBytes = 0;

  for (let i = 0; i < body.images.length; i++) {
    const dataUrl = body.images[i];
    if (typeof dataUrl !== "string") {
      return errorResponse(
        "INVALID_INPUT",
        `images[${i}] non è una stringa`,
        400
      );
    }
    const match = DATA_URL_RE.exec(dataUrl);
    if (!match) {
      return errorResponse(
        "INVALID_INPUT",
        `images[${i}] non è una data URL base64 valida (atteso: data:image/...;base64,...)`,
        400
      );
    }
    const [, mimeType, data] = match;
    totalBytes += Math.floor((data.length * 3) / 4);
    if (totalBytes > MAX_TOTAL_BYTES) {
      return errorResponse(
        "INVALID_INPUT",
        `Dimensione totale immagini supera ${MAX_TOTAL_BYTES} byte`,
        400
      );
    }
    parts.push({ inlineData: { mimeType, data } });
  }

  let model;
  try {
    model = getVisionModel();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Errore configurazione";
    return errorResponse("INTERNAL", msg, 500);
  }

  let rawText: string;
  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
    });
    rawText = result.response.text();
  } catch (err) {
    const e = err as { status?: number; message?: string };
    if (e.status === 429) {
      return errorResponse(
        "RATE_LIMITED",
        "Rate limit Gemini raggiunto, riprova più tardi",
        429
      );
    }
    return errorResponse(
      "UPSTREAM_ERROR",
      e.message ?? "Errore chiamata Gemini",
      502
    );
  }

  let parsed: RoomAnalysis;
  try {
    parsed = JSON.parse(rawText) as RoomAnalysis;
  } catch {
    return errorResponse(
      "UPSTREAM_ERROR",
      "Risposta Gemini non è JSON valido",
      502
    );
  }

  if (
    !Array.isArray(parsed.colors) ||
    parsed.colors.length < 1 ||
    parsed.colors.length > 5 ||
    !parsed.colors.every((c) => typeof c === "string" && HEX_RE.test(c)) ||
    typeof parsed.style !== "string" ||
    typeof parsed.dimensions !== "string" ||
    !["low", "medium", "high"].includes(parsed.confidence)
  ) {
    return errorResponse(
      "UPSTREAM_ERROR",
      "Risposta Gemini non conforme allo schema atteso",
      502
    );
  }

  if (parsed.confidence === "low" && /non determinabile/i.test(parsed.style)) {
    return errorResponse(
      "NOT_A_ROOM",
      "Le immagini non sembrano mostrare una stanza. Riprova con foto degli interni.",
      422
    );
  }

  return NextResponse.json(parsed);
}
