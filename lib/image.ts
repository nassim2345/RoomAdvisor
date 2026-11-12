/** Utility immagini lato browser. */

export const COMPRESS_MAX_DIMENSION = 1600;
export const COMPRESS_QUALITY = 0.82;

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Errore lettura file"));
    reader.readAsDataURL(file);
  });
}

/** Dimensioni scalate mantenendo le proporzioni; non ingrandisce mai. */
export function fitWithin(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Ridimensiona e ricomprime una foto in JPEG prima dell'upload: una foto da
 * smartphone passa da 4-8 MB a ~200-400 KB. Gemini non ha bisogno di più di
 * ~1600px per analizzare una stanza, e il body resta sotto i 4.5 MB di Vercel.
 * Se il browser non sa decodificare il formato (es. HEIC su Chrome) ripiega
 * sul file originale.
 */
export async function compressImage(
  file: File,
  maxDimension = COMPRESS_MAX_DIMENSION,
  quality = COMPRESS_QUALITY
): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxDimension);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D non disponibile");
    // Sfondo bianco: i PNG trasparenti in JPEG diventerebbero neri.
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (!dataUrl.startsWith("data:image/jpeg")) throw new Error("Encoding JPEG fallito");
    return dataUrl;
  } catch {
    return fileToDataUrl(file);
  }
}

/** Byte approssimativi del payload base64 di una data URL. */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}
