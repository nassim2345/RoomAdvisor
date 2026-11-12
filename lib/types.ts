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
  /** Assente nei risultati condivisi prima dell'introduzione del campo. */
  isRoom?: boolean;
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

export interface ProductOption {
  name: string;
  price: string | null;
  /** Prezzo numerico in euro, se SerpAPI lo fornisce. */
  priceValue?: number | null;
  link: string;
  thumbnail: string | null;
  source?: string | null;
}

export interface Product extends ProductOption {
  category: string;
  query: string;
  /** Posizione nel piano d'arredo: ordina i prodotti in modo stabile. */
  rank?: number;
  /** Opzioni alternative per la stessa categoria (esclusa quella principale). */
  alternatives?: ProductOption[];
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
