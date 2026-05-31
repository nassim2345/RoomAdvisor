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
}

export type AnalyzeResponse = RoomAnalysis;

export type AnalyzeErrorCode =
  | "INVALID_INPUT"
  | "UPSTREAM_ERROR"
  | "RATE_LIMITED"
  | "INTERNAL";

export interface AnalyzeError {
  error: string;
  code: AnalyzeErrorCode;
}
