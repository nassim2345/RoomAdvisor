import { isValidBudget } from "./budget";
import { isGoal, type Goal, type RoomAnalysis } from "./types";

export const MAX_IMAGES = 3;
/**
 * Limite sui byte decodificati. Le funzioni serverless di Vercel rifiutano body
 * oltre 4.5 MB e il base64 pesa ~4/3: 3 MB di immagini ≈ 4 MB di JSON.
 * Il client comprime le foto (~300 KB l'una), quindi il margine è ampio.
 */
export const MAX_TOTAL_IMAGE_BYTES = 3 * 1024 * 1024;
export const MAX_OWNED_ITEMS_CHARS = 300;
export const MAX_DIMENSIONS_CHARS = 50;
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

const DATA_URL_RE = /^data:(image\/[a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)$/;
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export type ImagePart = { inlineData: { mimeType: string; data: string } };

export interface ValidRecommendRequest {
  imageParts: ImagePart[];
  dimensions?: string;
  budget?: number;
  goal?: Goal;
  ownedItems?: string;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; message: string };

/** Byte decodificati di una stringa base64 (tiene conto del padding). */
export function base64DecodedBytes(b64: string): number {
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

/** Rimuove caratteri di controllo e comprime gli spazi (input che finisce nel prompt). */
export function sanitizeFreeText(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim();
}

function optionalText(
  value: unknown,
  field: string,
  maxChars: number
): ParseResult<string | undefined> {
  if (value === undefined || value === null) return { ok: true, value: undefined };
  if (typeof value !== "string") {
    return { ok: false, message: `Campo "${field}" deve essere una stringa` };
  }
  const clean = sanitizeFreeText(value);
  if (clean.length > maxChars) {
    return { ok: false, message: `Campo "${field}" supera ${maxChars} caratteri` };
  }
  return { ok: true, value: clean.length > 0 ? clean : undefined };
}

export function parseRecommendRequest(body: unknown): ParseResult<ValidRecommendRequest> {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Body JSON non valido" };
  }
  const b = body as Record<string, unknown>;

  if (!Array.isArray(b.images) || b.images.length === 0 || b.images.length > MAX_IMAGES) {
    return {
      ok: false,
      message: `Il campo "images" deve essere un array di 1-${MAX_IMAGES} elementi`,
    };
  }

  if (b.budget !== undefined && b.budget !== null && !isValidBudget(b.budget)) {
    return {
      ok: false,
      message: 'Campo "budget" deve essere un numero positivo (euro massimi per pezzo)',
    };
  }

  if (b.goal !== undefined && b.goal !== null && !isGoal(b.goal)) {
    return {
      ok: false,
      message:
        'Campo "goal" non valido (atteso: cozy, minimal, japandi, industrial, scandinavian, modern, luxury)',
    };
  }

  const dims = optionalText(b.dimensions, "dimensions", MAX_DIMENSIONS_CHARS);
  if (!dims.ok) return dims;
  const owned = optionalText(b.ownedItems, "ownedItems", MAX_OWNED_ITEMS_CHARS);
  if (!owned.ok) return owned;

  const imageParts: ImagePart[] = [];
  let totalBytes = 0;
  for (let i = 0; i < b.images.length; i++) {
    const dataUrl = b.images[i];
    if (typeof dataUrl !== "string") {
      return { ok: false, message: `images[${i}] non è una stringa` };
    }
    const match = DATA_URL_RE.exec(dataUrl);
    if (!match) {
      return { ok: false, message: `images[${i}] non è una data URL base64 valida` };
    }
    const [, rawMime, data] = match;
    const mimeType = rawMime.toLowerCase();
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType)) {
      return {
        ok: false,
        message: `images[${i}]: formato ${mimeType} non supportato (usa JPG, PNG, WebP o HEIC)`,
      };
    }
    totalBytes += base64DecodedBytes(data);
    if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
      return {
        ok: false,
        message: `Dimensione totale immagini supera ${MAX_TOTAL_IMAGE_BYTES / 1024 / 1024} MB`,
      };
    }
    imageParts.push({ inlineData: { mimeType, data } });
  }

  return {
    ok: true,
    value: {
      imageParts,
      dimensions: dims.value,
      budget: isValidBudget(b.budget) ? b.budget : undefined,
      goal: isGoal(b.goal) ? b.goal : undefined,
      ownedItems: owned.value,
    },
  };
}

export function isRoomAnalysis(x: unknown): x is RoomAnalysis {
  const a = x as RoomAnalysis;
  return (
    !!a &&
    typeof a === "object" &&
    Array.isArray(a.colors) &&
    a.colors.length >= 1 &&
    a.colors.length <= 5 &&
    a.colors.every((c) => typeof c === "string" && HEX_RE.test(c)) &&
    typeof a.style === "string" &&
    typeof a.dimensions === "string" &&
    ["low", "medium", "high"].includes(a.confidence) &&
    Array.isArray(a.observations) &&
    a.observations.length <= 5 &&
    a.observations.every((o) => typeof o === "string") &&
    Array.isArray(a.issues) &&
    a.issues.length <= 5 &&
    a.issues.every(
      (i) => typeof i?.title === "string" && typeof i?.description === "string"
    ) &&
    (a.isRoom === undefined || typeof a.isRoom === "boolean")
  );
}

/**
 * Le foto non mostrano una stanza? Si basa sul flag esplicito `isRoom`; la
 * regex sullo stile resta come rete di sicurezza se il modello lo omette.
 * Va chiamata PRIMA di `isRoomAnalysis`: per le non-stanze il modello può
 * restituire `colors: []`, che fallirebbe la validazione stretta.
 */
export function isNotARoom(x: unknown): boolean {
  const a = x as Partial<RoomAnalysis> | null;
  if (!a || typeof a !== "object") return false;
  if (a.isRoom === false) return true;
  return (
    a.isRoom === undefined &&
    a.confidence === "low" &&
    typeof a.style === "string" &&
    /non determinabil/i.test(a.style)
  );
}

