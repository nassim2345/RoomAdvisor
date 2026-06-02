export type Confidence = "low" | "medium" | "high";

export interface RoomAnalysis {
  colors: string[];
  style: string;
  dimensions: string;
  confidence: Confidence;
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

export interface RecommendRequest {
  images: string[];
  dimensions?: string;
  budget?: number;
}

export interface SharedResult {
  analysis: RoomAnalysis;
  products: Product[];
}
