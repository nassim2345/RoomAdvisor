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

export const FURNITURE_SYSTEM_INSTRUCTION = `Sei un interior designer. Data l'analisi di una stanza (colori, stile, dimensioni), proponi 3-5 pezzi d'arredo DIVERSI per CATEGORIA che si abbinino allo stile e ai colori. Linee guida:
- Categorie suggerite (scegline 3-5 diverse): divano, poltrona, sedia, tavolo, tavolino, lampada da terra, lampada da tavolo, tappeto, libreria, scaffale, pianta, vaso, quadro, specchio, tenda, cuscino, complemento.
- Evita di consigliare più oggetti della stessa categoria.
- Per ogni pezzo produci una "query" di ricerca in italiano per Google Shopping (max 60 caratteri), specifica e coerente con lo stile (es. "lampada da terra legno chiaro stile scandinavo").
- Adatta le proposte alle dimensioni: stanza piccola → niente mobili ingombranti.
- "category" è il nome breve della categoria in italiano (es. "Lampada da terra").
Ritorna ESCLUSIVAMENTE un JSON conforme allo schema.`;

export const FURNITURE_PLAN_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          category: { type: SchemaType.STRING },
          query: { type: SchemaType.STRING },
        },
        required: ["category", "query"],
      },
    },
  },
  required: ["items"],
};

export function buildFurniturePrompt(analysis: {
  colors: string[];
  style: string;
  dimensions: string;
}): string {
  return `Analisi della stanza:
- Stile: ${analysis.style}
- Colori dominanti: ${analysis.colors.join(", ")}
- Dimensioni: ${analysis.dimensions}

Proponi 3-5 pezzi d'arredo coerenti.`;
}
