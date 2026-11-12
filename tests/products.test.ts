import { describe, expect, it } from "vitest";
import { computeSetTotal, insertByRank, parseEuroPrice } from "@/lib/products";
import type { Product } from "@/lib/types";

const p = (rank: number | undefined, name = `p${rank}`): Product => ({
  category: name,
  query: name,
  name,
  price: null,
  link: "https://x.example",
  thumbnail: null,
  rank,
});

describe("insertByRank", () => {
  it("keeps plan order regardless of arrival order", () => {
    let list: Product[] = [];
    for (const r of [3, 0, 4, 1, 2]) list = insertByRank(list, p(r));
    expect(list.map((x) => x.rank)).toEqual([0, 1, 2, 3, 4]);
  });
  it("appends items without rank", () => {
    expect(insertByRank([p(0)], p(undefined, "z")).map((x) => x.name)).toEqual(["p0", "z"]);
  });
});

describe("parseEuroPrice", () => {
  it.each([
    ["89,99 €", 89.99],
    ["€ 1.299,00", 1299],
    ["€1,299.00", 1299],
    ["1.299 €", 1299],
    ["45 €", 45],
    ["12.5", 12.5],
  ])("%s → %d", (input, expected) => {
    expect(parseEuroPrice(input)).toBeCloseTo(expected);
  });
  it("returns null for missing or unparsable prices", () => {
    expect(parseEuroPrice(null)).toBeNull();
    expect(parseEuroPrice("gratis")).toBeNull();
  });
});

describe("computeSetTotal", () => {
  it("sums priceValue, falling back to the price string", () => {
    const total = computeSetTotal([
      { name: "a", price: "10 €", priceValue: 10.5, link: "", thumbnail: null },
      { name: "b", price: "1.000,00 €", link: "", thumbnail: null },
      { name: "c", price: null, link: "", thumbnail: null },
    ]);
    expect(total).toEqual({ total: 1010.5, priced: 2, count: 3 });
  });
});
