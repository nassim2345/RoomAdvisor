export type Confidence = "low" | "medium" | "high";

export interface Issue {
  title: string;
  description: string;
}

export interface RoomAnalysis {
  colors: string[];
  style: string;
  dimensions: string;
  confidence: Confidence;
  observations: string[];
  issues: Issue[];
}

export type AnalyzeErrorCode =
  | "INVALID_INPUT"
  | "UPSTREAM_ERROR"
  | "RATE_LIMITED"
  | "INTERNAL"
  | "NOT_A_ROOM";

export interface AnalyzeError {
  error: string;
  code: AnalyzeErrorCode;
}

export interface StreamError {
  message: string;
  code?: string;
}

export interface FurnitureQuery {
  category: string;
  query: string;
}

export interface Product {
  category: string;
  query: string;
  name: string;
  price: string | null;
  link: string;
  thumbnail: string | null;
}

export interface PriceRange {
  min?: number;
  max?: number;
}

export type Goal =
  | "cozy"
  | "minimal"
  | "japandi"
  | "industrial"
  | "scandinavian"
  | "modern"
  | "luxury";

export const GOAL_OPTIONS: Goal[] = [
  "cozy",
  "minimal",
  "japandi",
  "industrial",
  "scandinavian",
  "modern",
  "luxury",
];

export const GOAL_LABELS: Record<Goal, string> = {
  cozy: "Cozy",
  minimal: "Minimal",
  japandi: "Japandi",
  industrial: "Industrial",
  scandinavian: "Scandinavian",
  modern: "Modern",
  luxury: "Luxury",
};

export function isGoal(value: unknown): value is Goal {
  return typeof value === "string" && GOAL_OPTIONS.includes(value as Goal);
}

export interface RecommendRequest {
  images: string[];
  dimensions?: string;
  budget?: number;
  goal?: Goal;
  ownedItems?: string;
}

export interface SharedResult {
  analysis: RoomAnalysis;
  products: Product[];
}
