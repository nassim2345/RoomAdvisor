import type { PriceRange, Product, ProductOption } from "./types";

export interface SerpShoppingResult {
  title?: string;
  price?: string;
  extracted_price?: number;
  link?: string;
  product_link?: string;
  thumbnail?: string;
  source?: string;
}

interface SerpResponse {
  shopping_results?: SerpShoppingResult[];
  error?: string;
}

export const OPTIONS_PER_CATEGORY = 3;

export class SerpApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "SerpApiError";
  }
}

/** Errori di configurazione: inutile riprovare o mostrare un errore per query. */
export function isConfigError(err: unknown): boolean {
  return (
    err instanceof SerpApiError && (err.status === 500 || err.status === 401 || err.status === 403)
  );
}

export function buildTbs(range: PriceRange): string | null {
  const parts: string[] = ["mr:1", "price:1"];
  if (range.min !== undefined) parts.push(`ppr_min:${range.min}`);
  if (range.max !== undefined) parts.push(`ppr_max:${range.max}`);
  return parts.length > 2 ? parts.join(",") : null;
}

/** Accetta solo URL http(s): i link finiscono in `href` lato client. */
export function safeHttpUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Estrae fino a `limit` opzioni dai risultati SerpAPI: scarta voci senza titolo
 * o link valido, duplicati per titolo e — se c'è un budget — prezzi fuori
 * budget (il filtro `tbs` di Google Shopping non è sempre rispettato).
 */
export function pickOptions(
  results: SerpShoppingResult[],
  maxPrice?: number,
  limit = OPTIONS_PER_CATEGORY
): ProductOption[] {
  const out: ProductOption[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (out.length >= limit) break;
    const name = r.title?.trim();
    if (!name) continue;
    const link = safeHttpUrl(r.product_link) ?? safeHttpUrl(r.link);
    if (!link) continue;
    const priceValue =
      typeof r.extracted_price === "number" && Number.isFinite(r.extracted_price)
        ? r.extracted_price
        : null;
    if (maxPrice !== undefined && priceValue !== null && priceValue > maxPrice) continue;
    const dedupeKey = name.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push({
      name,
      price: r.price ?? null,
      priceValue,
      link,
      thumbnail: safeHttpUrl(r.thumbnail),
      source: r.source ?? null,
    });
  }
  return out;
}

export async function searchShopping(
  query: string,
  category: string,
  priceRange?: PriceRange,
  signal?: AbortSignal
): Promise<Omit<Product, "rank"> | null> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    throw new SerpApiError("SERPAPI_KEY non configurata in .env.local", 500);
  }

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_shopping");
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "it");
  url.searchParams.set("gl", "it");
  url.searchParams.set("api_key", apiKey);
  if (priceRange) {
    const tbs = buildTbs(priceRange);
    if (tbs) url.searchParams.set("tbs", tbs);
  }

  const res = await fetch(url.toString(), { signal, cache: "no-store" });
  if (!res.ok) {
    throw new SerpApiError(`SerpAPI HTTP ${res.status}`, res.status);
  }

  const data = (await res.json()) as SerpResponse;
  if (data.error) {
    // "Google hasn't returned any results" non è un errore: zero risultati.
    if (/hasn't returned any results/i.test(data.error)) return null;
    throw new SerpApiError(data.error, 502);
  }

  const options = pickOptions(data.shopping_results ?? [], priceRange?.max);
  if (options.length === 0) return null;
  const [primary, ...alternatives] = options;
  return { category, query, ...primary, alternatives };
}
