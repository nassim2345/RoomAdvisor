import type { Product, ProductOption } from "./types";

/** Tutte le opzioni di un prodotto: la principale seguita dalle alternative. */
export function productOptions(p: Product): ProductOption[] {
  return [p, ...(p.alternatives ?? [])];
}

/** Inserisce un prodotto mantenendo l'ordine del piano (campo `rank`). */
export function insertByRank(list: Product[], product: Product): Product[] {
  const rank = product.rank ?? Number.MAX_SAFE_INTEGER;
  const idx = list.findIndex((p) => (p.rank ?? Number.MAX_SAFE_INTEGER) > rank);
  if (idx === -1) return [...list, product];
  return [...list.slice(0, idx), product, ...list.slice(idx)];
}

/** Ripiego per prezzi senza `priceValue` (es. vecchi link condivisi): "1.299,00 €". */
export function parseEuroPrice(price: string | null | undefined): number | null {
  if (!price) return null;
  const m = price.replace(/\s/g, "").match(/\d[\d.,]*/);
  if (!m) return null;
  let n = m[0];
  if (n.includes(",") && n.includes(".")) {
    n = n.lastIndexOf(",") > n.lastIndexOf(".")
      ? n.replace(/\./g, "").replace(",", ".")
      : n.replace(/,/g, "");
  } else if (n.includes(",")) {
    n = /,\d{3}$/.test(n) && !/,\d{1,2}$/.test(n) ? n.replace(/,/g, "") : n.replace(",", ".");
  } else if (/\.\d{3}$/.test(n)) {
    n = n.replace(/\./g, "");
  }
  const value = Number(n);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function optionPrice(o: ProductOption): number | null {
  return typeof o.priceValue === "number" ? o.priceValue : parseEuroPrice(o.price);
}

export interface SetTotal {
  total: number;
  priced: number;
  count: number;
}

export function computeSetTotal(selected: ProductOption[]): SetTotal {
  let total = 0;
  let priced = 0;
  for (const o of selected) {
    const v = optionPrice(o);
    if (v !== null) {
      total += v;
      priced++;
    }
  }
  return { total: Math.round(total * 100) / 100, priced, count: selected.length };
}

const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatEuro(value: number): string {
  return euro.format(value);
}
