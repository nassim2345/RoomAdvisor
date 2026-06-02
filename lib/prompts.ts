import { SchemaType, type ResponseSchema } from "@google/generative-ai";

export const SYSTEM_INSTRUCTION = `Sei un interior designer. Analizza le foto della stanza e produci SOLO il JSON dello schema:
- colors: 3-5 HEX dominanti (#RRGGBB maiuscolo)
- style: stile in italiano, max 80 caratteri
- dimensions: dimensioni stimate in italiano (es. "circa 15-20 m², soffitto ~2.7m")
- confidence: "high" se la stanza è chiara, "medium" se plausibile, "low" se ambigua
Se le foto NON mostrano una stanza: confidence "low", style "non determinabile", dimensions "non determinabili".`;

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

export function buildUserPrompt(
  imageCount: number,
  dimensions?: string
): string {
  const plural = imageCount === 1 ? "questa foto" : `queste ${imageCount} foto`;
  const dimsLine =
    dimensions && dimensions.trim().length > 0
      ? `\nL'utente dichiara dimensioni reali della stanza: "${dimensions.trim()}". Usa questo dato come fonte primaria invece di stimare visivamente.`
      : "";
  return `Analizza ${plural} della stessa stanza e produci il JSON richiesto.${dimsLine}`;
}

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

export const IMAGE_PLAN_SYSTEM_INSTRUCTION = `Sei un interior designer. Osserva le foto della stanza (stile, colori, materiali, dimensioni) e proponi 3-5 pezzi d'arredo che formino un INSIEME COERENTE.
Regole:
1. Categorie diverse (divano, poltrona, sedia, tavolo, tavolino, lampada, tappeto, libreria, pianta, vaso, quadro, specchio, tenda, cuscino, complemento): mai due della stessa categoria.
2. Filo conduttore condiviso: tutti i pezzi condividono materiali, palette e forme coerenti tra loro e con la stanza.
3. Ogni "query" (italiano, max 70 caratteri, per Google Shopping) include i materiali/colori del filo conduttore, così i pezzi si richiamano (es. filo "legno chiaro+nero opaco" → "lampada terra metallo nero opaco", "tavolino legno chiaro gambe nere").
4. Adatta allo spazio: stanza piccola → niente mobili ingombranti.
5. Budget (se indicato): resta entro il budget massimo per pezzo e metti il prezzo nella query (es. "tappeto geometrico sotto 150€").
"category" = nome breve in italiano. Ritorna SOLO il JSON dello schema.`;

export function buildImagePlanPrompt(budgetMax?: number): string {
  const budgetLine = budgetMax ? ` Budget massimo ${budgetMax}€ per pezzo.` : "";
  return `Analizza queste foto e proponi 3-5 pezzi d'arredo coerenti tra loro.${budgetLine}`;
}
