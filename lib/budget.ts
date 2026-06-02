import type { PriceRange } from "./types";

export function isValidBudget(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function budgetToPriceRange(maxEuro: number): PriceRange {
  return { max: maxEuro };
}

export function budgetHint(maxEuro: number): string {
  return `massimo ${maxEuro}€ per pezzo`;
}
