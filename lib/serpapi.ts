import type { Product } from "./types";

interface SerpShoppingResult {
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

export class SerpApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "SerpApiError";
  }
}

export async function searchShopping(
  query: string,
  category: string
): Promise<Product | null> {
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

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new SerpApiError(
      `SerpAPI HTTP ${res.status}`,
      res.status
    );
  }

  const data = (await res.json()) as SerpResponse;
  if (data.error) {
    throw new SerpApiError(data.error, 502);
  }

  const first = data.shopping_results?.[0];
  if (!first || !first.title) return null;

  const link = first.product_link ?? first.link;
  if (!link) return null;

  return {
    category,
    query,
    name: first.title,
    price: first.price ?? null,
    link,
    thumbnail: first.thumbnail ?? null,
  };
}
