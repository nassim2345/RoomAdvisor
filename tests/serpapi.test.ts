import { describe, expect, it } from "vitest";
import { buildTbs, pickOptions, safeHttpUrl } from "@/lib/serpapi";

describe("buildTbs", () => {
  it("returns null without bounds", () => {
    expect(buildTbs({})).toBeNull();
  });
  it("includes min and max", () => {
    expect(buildTbs({ min: 10, max: 150 })).toBe("mr:1,price:1,ppr_min:10,ppr_max:150");
  });
});

describe("safeHttpUrl", () => {
  it("only allows http(s)", () => {
    expect(safeHttpUrl("https://shop.example/x")).toBe("https://shop.example/x");
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
    expect(safeHttpUrl(undefined)).toBeNull();
  });
});

describe("pickOptions", () => {
  const r = (title: string, extracted_price?: number, link = `https://s.example/${title}`) => ({
    title,
    extracted_price,
    price: extracted_price !== undefined ? `${extracted_price} €` : undefined,
    product_link: link,
  });

  it("dedupes, skips invalid entries and respects the limit", () => {
    const out = pickOptions(
      [r("A", 10), r("a", 11), { title: "" }, r("B", 20, "javascript:x"), r("C", 30), r("D"), r("E")],
      undefined,
      3
    );
    expect(out.map((o) => o.name)).toEqual(["A", "C", "D"]);
    expect(out[2].priceValue).toBeNull();
  });

  it("filters out items above budget but keeps items without a price", () => {
    const out = pickOptions([r("Cheap", 90), r("Pricey", 400), r("Unknown")], 150);
    expect(out.map((o) => o.name)).toEqual(["Cheap", "Unknown"]);
  });

  it("prefers product_link and falls back to link", () => {
    const out = pickOptions([{ title: "X", link: "https://merchant.example/x" }]);
    expect(out[0].link).toBe("https://merchant.example/x");
  });
});
