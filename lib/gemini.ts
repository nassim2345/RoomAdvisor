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
    model: "gemini-2.5-flash",
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
    model: "gemini-2.5-flash",
    systemInstruction: IMAGE_PLAN_SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: FURNITURE_PLAN_SCHEMA,
    },
  });
}
