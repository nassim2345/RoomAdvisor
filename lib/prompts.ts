import { SchemaType, type ResponseSchema } from "@google/generative-ai";

export const SYSTEM_INSTRUCTION = `Sei un interior designer esperto. Analizza le foto di una stanza fornite dall'utente e produci un oggetto JSON conforme allo schema richiesto. Linee guida:
- "colors": 3-5 colori dominanti come stringhe HEX (#RRGGBB maiuscolo)
- "style": breve descrizione dello stile in italiano (max 80 caratteri)
- "dimensions": stima delle dimensioni percepite della stanza in italiano (es. "circa 15-20 m², soffitto standard ~2.7m")
- "confidence": "low" se le foto non mostrano chiaramente una stanza o sono ambigue, "medium" se l'analisi è plausibile, "high" se la stanza è ben visibile e leggibile
Se le immagini non rappresentano una stanza, ritorna confidence "low", style "non determinabile" e dimensioni "non determinabili".`;

export const ROOM_ANALYSIS_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    colors: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    style: { type: SchemaType.STRING },
    dimensions: { type: SchemaType.STRING },
    confidence: {
      type: SchemaType.STRING,
      enum: ["low", "medium", "high"],
      format: "enum",
    },
  },
  required: ["colors", "style", "dimensions", "confidence"],
};

export function buildUserPrompt(imageCount: number): string {
  const plural = imageCount === 1 ? "questa foto" : `queste ${imageCount} foto`;
  return `Analizza ${plural} della stessa stanza e produci il JSON richiesto.`;
}
