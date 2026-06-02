import type { Budget, PriceRange } from "./types";

export const BUDGET_RANGES: Record<Budget, PriceRange> = {
  economico: { max: 200 },
  medio: { min: 200, max: 500 },
  alto: { min: 500, max: 1000 },
  lusso: { min: 1000 },
};

export const BUDGET_LABELS: Record<Budget, string> = {
  economico: "Fino a 200€",
  medio: "200€ - 500€",
  alto: "500€ - 1.000€",
  lusso: "Oltre 1.000€",
};

export const BUDGET_OPTIONS: Budget[] = ["economico", "medio", "alto", "lusso"];

export function isBudget(value: unknown): value is Budget {
  return (
    typeof value === "string" && BUDGET_OPTIONS.includes(value as Budget)
  );
}

export function budgetToHint(b: Budget): string {
  const r = BUDGET_RANGES[b];
  if (r.max !== undefined && r.min === undefined) return `sotto i ${r.max}€`;
  if (r.min !== undefined && r.max === undefined) return `oltre i ${r.min}€`;
  if (r.min !== undefined && r.max !== undefined)
    return `tra ${r.min}€ e ${r.max}€`;
  return "";
}
