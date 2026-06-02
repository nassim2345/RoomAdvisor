export type Confidence = "low" | "medium" | "high";

export interface RoomAnalysis {
  colors: string[];
  style: string;
  dimensions: string;
  confidence: Confidence;
}

export interface FurnitureSuggestion {
  name: string;
  description: string;
  purchaseUrl: string;
}

export interface AnalyzeRequest {
  images: string[];
  dimensions?: string;
}

export type AnalyzeResponse = RoomAnalysis;

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

export interface ProductsRequest {
  analysis: RoomAnalysis;
  budget?: number;
}

export interface ProductsResponse {
  products: Product[];
}

export type ProductsErrorCode = AnalyzeErrorCode;

export interface ProductsError {
  error: string;
  code: ProductsErrorCode;
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

export type RecommendEvent =
  | { type: "analysis"; data: RoomAnalysis }
  | { type: "product"; data: Product }
  | { type: "shared"; data: { id: string } }
  | { type: "error"; data: { code: AnalyzeErrorCode; message: string } }
  | { type: "done"; data: Record<string, never> };
