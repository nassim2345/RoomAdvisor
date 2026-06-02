import { SchemaType, type ResponseSchema } from "@google/generative-ai";
import { budgetHint } from "./budget";

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

export const FURNITURE_SYSTEM_INSTRUCTION = `Sei un interior designer. Data l'analisi di una stanza (colori, stile, dimensioni) ed eventuale budget per pezzo, proponi 3-5 pezzi d'arredo che formino un INSIEME COERENTE: non solo abbinati alla stanza, ma anche tra loro.

Regole fondamentali:
1. CATEGORIE DIVERSE: scegli 3-5 categorie distinte (divano, poltrona, sedia, tavolo, tavolino, lampada, tappeto, libreria, scaffale, pianta, vaso, quadro, specchio, tenda, cuscino, complemento). Mai due pezzi della stessa categoria.
2. LINGUAGGIO STILISTICO CONDIVISO: prima definisci mentalmente un filo conduttore comune a tutti i pezzi — stessi materiali (es. legno chiaro + lino), stessa palette (coerente coi colori della stanza), stesse forme (es. linee morbide o geometrie nette). Tutti i pezzi devono sembrare scelti dalla stessa persona per la stessa stanza.
3. QUERY COERENTI: ogni "query" (italiano, max 70 caratteri, per Google Shopping) deve includere materiali/finiture/colori del filo conduttore condiviso, così che i pezzi si richiamino visivamente (es. se il filo è "legno chiaro + nero opaco", la lampada sarà "lampada terra metallo nero opaco" e il tavolino "tavolino legno chiaro gambe nere").
4. DIMENSIONI: adatta le proposte allo spazio (stanza piccola → niente mobili ingombranti).
5. BUDGET: se indicato un massimo per pezzo, resta entro quella cifra e includi il prezzo nella query (es. "tappeto geometrico sotto 150€").

"category" = nome breve della categoria in italiano (es. "Lampada da terra").
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

export const IMAGE_PLAN_SYSTEM_INSTRUCTION = `Sei un interior designer. Osserva le foto della stanza (stile, colori, materiali, dimensioni) e proponi 3-5 pezzi d'arredo che formino un INSIEME COERENTE.
Regole:
1. Categorie diverse (divano, poltrona, sedia, tavolo, tavolino, lampada, tappeto, libreria, pianta, vaso, quadro, specchio, tenda, cuscino, complemento): mai due della stessa categoria.
2. Filo conduttore condiviso: tutti i pezzi condividono materiali, palette e forme coerenti tra loro e con la stanza.
3. Ogni "query" (italiano, max 70 caratteri, per Google Shopping) include i materiali/colori del filo conduttore, così i pezzi si richiamano (es. filo "legno chiaro+nero opaco" → "lampada terra metallo nero opaco", "tavolino legno chiaro gambe nere").
4. Adatta allo spazio: stanza piccola → niente mobili ingombranti.
5. Budget (se indicato): resta entro il budget massimo per pezzo e metti il prezzo nella query (es. "tappeto geometrico sotto 150€").
"category" = nome breve in italiano. Ritorna SOLO il JSON dello schema.`;

export function buildImagePlanPrompt(budgetMax?: number): string {
  const budgetLine = budgetMax ? ` Budget ${budgetHint(budgetMax)}.` : "";
  return `Analizza queste foto e proponi 3-5 pezzi d'arredo coerenti tra loro.${budgetLine}`;
}

export function buildFurniturePrompt(
  analysis: {
    colors: string[];
    style: string;
    dimensions: string;
  },
  budgetMax?: number
): string {
  const budgetLine = budgetMax
    ? `\n- Budget per singolo pezzo: ${budgetHint(budgetMax)}`
    : "";
  return `Analisi della stanza:
- Stile: ${analysis.style}
- Colori dominanti: ${analysis.colors.join(", ")}
- Dimensioni: ${analysis.dimensions}${budgetLine}

Definisci un filo conduttore stilistico comune e proponi 3-5 pezzi che lo condividano, così da formare un insieme coerente.`;
}
