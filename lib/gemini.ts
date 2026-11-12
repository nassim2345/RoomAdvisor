import {
  GoogleGenerativeAI,
  type GenerativeModel,
} from "@google/generative-ai";
import {
  FURNITURE_PLAN_SCHEMA,
  IMAGE_PLAN_SYSTEM_INSTRUCTION,
  ROOM_ANALYSIS_SCHEMA,
  SYSTEM_INSTRUCTION,
} from "./prompts";

const DEFAULT_MODEL = "gemini-2.5-flash";

function modelName(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

/** Errori transitori di Gemini per cui ha senso un retry con backoff. */
export function isRetryableGeminiError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 429 || status === 500 || status === 503;
}

let cachedClient: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY non configurata in .env.local"
    );
  }

  cachedClient = new GoogleGenerativeAI(apiKey);
  return cachedClient;
}

export function getVisionModel(): GenerativeModel {
  const client = getGeminiClient();
  return client.getGenerativeModel({
    model: modelName(),
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: ROOM_ANALYSIS_SCHEMA,
    },
  });
}

export function getImagePlanningModel(): GenerativeModel {
  const client = getGeminiClient();
  return client.getGenerativeModel({
    model: modelName(),
    systemInstruction: IMAGE_PLAN_SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: FURNITURE_PLAN_SCHEMA,
    },
  });
}
