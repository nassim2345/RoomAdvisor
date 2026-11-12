import { describe, expect, it, vi } from "vitest";
import { dispatchEvent, type RecommendHandlers } from "@/lib/recommend-client";

function handlers(): RecommendHandlers {
  return {
    onAnalysis: vi.fn(),
    onAnalysisError: vi.fn(),
    onProduct: vi.fn(),
    onProductsError: vi.fn(),
    onWarning: vi.fn(),
    onShared: vi.fn(),
  };
}

describe("dispatchEvent", () => {
  it("routes errors before analysis to the analysis handler", () => {
    const h = handlers();
    dispatchEvent({ event: "error", data: { message: "x" } }, h, { gotAnalysis: false });
    expect(h.onAnalysisError).toHaveBeenCalledWith({ message: "x" });
  });

  it("routes errors after analysis to the products handler, except NOT_A_ROOM", () => {
    const h = handlers();
    const state = { gotAnalysis: false };
    dispatchEvent({ event: "analysis", data: { style: "s" } }, h, state);
    expect(state.gotAnalysis).toBe(true);
    dispatchEvent({ event: "error", data: { message: "y" } }, h, state);
    expect(h.onProductsError).toHaveBeenCalledWith({ message: "y" });
    dispatchEvent({ event: "error", data: { message: "z", code: "NOT_A_ROOM" } }, h, state);
    expect(h.onAnalysisError).toHaveBeenCalledWith({ message: "z", code: "NOT_A_ROOM" });
  });

  it("forwards product, shared and warning events", () => {
    const h = handlers();
    const state = { gotAnalysis: true };
    dispatchEvent({ event: "product", data: { name: "p" } }, h, state);
    dispatchEvent({ event: "shared", data: { id: "abc" } }, h, state);
    dispatchEvent({ event: "warning", data: { message: "w" } }, h, state);
    expect(h.onProduct).toHaveBeenCalledWith({ name: "p" });
    expect(h.onShared).toHaveBeenCalledWith("abc");
    expect(h.onWarning).toHaveBeenCalledWith({ message: "w" });
  });
});
