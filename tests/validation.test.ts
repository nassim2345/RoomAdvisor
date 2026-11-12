import { describe, expect, it } from "vitest";
import {
  base64DecodedBytes,
  isNotARoom,
  isRoomAnalysis,
  MAX_TOTAL_IMAGE_BYTES,
  parseRecommendRequest,
  sanitizeFreeText,
} from "@/lib/validation";

const PNG = "data:image/png;base64,iVBORw0KGgo=";

const validAnalysis = {
  isRoom: true,
  colors: ["#AABBCC", "#112233"],
  style: "Scandinavo",
  dimensions: "circa 15 m²",
  confidence: "high",
  observations: ["Luce naturale"],
  issues: [{ title: "Poca luce", description: "Serve una lampada" }],
};

describe("parseRecommendRequest", () => {
  it("accepts a minimal valid request", () => {
    const r = parseRecommendRequest({ images: [PNG] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.imageParts).toEqual([
        { inlineData: { mimeType: "image/png", data: "iVBORw0KGgo=" } },
      ]);
      expect(r.value.budget).toBeUndefined();
    }
  });

  it("rejects bad image arrays", () => {
    expect(parseRecommendRequest({}).ok).toBe(false);
    expect(parseRecommendRequest({ images: [] }).ok).toBe(false);
    expect(parseRecommendRequest({ images: [PNG, PNG, PNG, PNG] }).ok).toBe(false);
    expect(parseRecommendRequest({ images: ["not a data url"] }).ok).toBe(false);
    expect(parseRecommendRequest({ images: [42] }).ok).toBe(false);
  });

  it("rejects non-allowed MIME types such as SVG", () => {
    const r = parseRecommendRequest({ images: ["data:image/svg+xml;base64,PHN2Zz4="] });
    expect(r.ok).toBe(false);
  });

  it("rejects oversized payloads", () => {
    const big = "A".repeat(Math.ceil((MAX_TOTAL_IMAGE_BYTES * 4) / 3) + 8);
    expect(parseRecommendRequest({ images: [`data:image/jpeg;base64,${big}`] }).ok).toBe(false);
  });

  it("validates budget, goal and text fields", () => {
    expect(parseRecommendRequest({ images: [PNG], budget: -1 }).ok).toBe(false);
    expect(parseRecommendRequest({ images: [PNG], goal: "baroque" }).ok).toBe(false);
    expect(parseRecommendRequest({ images: [PNG], dimensions: "x".repeat(51) }).ok).toBe(false);
    expect(parseRecommendRequest({ images: [PNG], ownedItems: 5 }).ok).toBe(false);

    const r = parseRecommendRequest({
      images: [PNG],
      budget: 150,
      goal: "japandi",
      dimensions: "  4x5\nmetri ",
      ownedItems: "   ",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toMatchObject({ budget: 150, goal: "japandi", dimensions: "4x5 metri" });
      expect(r.value.ownedItems).toBeUndefined();
    }
  });
});

describe("helpers", () => {
  it("computes decoded base64 size with padding", () => {
    expect(base64DecodedBytes("YQ==")).toBe(1);
    expect(base64DecodedBytes("YWI=")).toBe(2);
    expect(base64DecodedBytes("YWJj")).toBe(3);
  });

  it("strips control characters", () => {
    expect(sanitizeFreeText("a\u0000b\t\tc\n")).toBe("a b c");
  });
});

describe("isRoomAnalysis / isNotARoom", () => {
  it("accepts a valid analysis", () => {
    expect(isRoomAnalysis(validAnalysis)).toBe(true);
    const { isRoom: _omit, ...legacy } = validAnalysis;
    expect(isRoomAnalysis(legacy)).toBe(true);
  });

  it("rejects malformed analyses", () => {
    expect(isRoomAnalysis(null)).toBe(false);
    expect(isRoomAnalysis({ ...validAnalysis, colors: ["red"] })).toBe(false);
    expect(isRoomAnalysis({ ...validAnalysis, confidence: "sure" })).toBe(false);
    expect(isRoomAnalysis({ ...validAnalysis, issues: [{ title: 1 }] })).toBe(false);
  });

  it("detects non-rooms via flag, with regex fallback", () => {
    expect(isNotARoom({ ...validAnalysis, isRoom: false, colors: [] })).toBe(true);
    expect(isNotARoom(validAnalysis)).toBe(false);
    expect(
      isNotARoom({ confidence: "low", style: "Non determinabile" })
    ).toBe(true);
    // Il flag esplicito vince sulla regex.
    expect(
      isNotARoom({ isRoom: true, confidence: "low", style: "non determinabile" })
    ).toBe(false);
  });
});
