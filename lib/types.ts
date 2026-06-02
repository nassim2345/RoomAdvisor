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

export type Budget = "economico" | "medio" | "alto" | "lusso";

export interface PriceRange {
  min?: number;
  max?: number;
}

export interface ProductsRequest {
  analysis: RoomAnalysis;
  budget?: Budget;
}

export interface ProductsResponse {
  products: Product[];
}

export type ProductsErrorCode = AnalyzeErrorCode;

export interface ProductsError {
  error: string;
  code: ProductsErrorCode;
}
