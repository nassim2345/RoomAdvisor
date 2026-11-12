import { ImageResponse } from "next/og";
import { getShared } from "@/lib/share-store";
import { readableTextColor } from "@/lib/color";

export const runtime = "nodejs";
export const alt = "Palette e stile della stanza analizzata con RoomAdvisor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#FAF7F2";
const TEXT = "#1F1B17";
const MUTED = "#6B645A";

/**
 * Anteprima social del link condiviso: la palette della stanza come fasce di
 * colore, lo stile e il numero di pezzi consigliati.
 */
export default async function OpengraphImage({ params }: { params: { id: string } }) {
  const result = await getShared(params.id).catch(() => null);
  const colors = result?.analysis.colors.length
    ? result.analysis.colors
    : ["#E5DDD0", "#EFEAE1", "#2A2622"];
  const style = result?.analysis.style ?? "Analizza la tua stanza";
  const count = result?.products.length ?? 0;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: BG }}>
        <div style={{ display: "flex", flexDirection: "column", width: 420, height: "100%" }}>
          {colors.map((hex) => (
            <div
              key={hex}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "flex-end",
                padding: "0 28px 16px",
                background: hex,
                color: readableTextColor(hex),
                fontSize: 22,
                letterSpacing: 2,
              }}
            >
              {hex.toUpperCase()}
            </div>
          ))}
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 64px 56px",
          }}
        >
          <div style={{ fontSize: 30, fontWeight: 700, color: TEXT, letterSpacing: -0.5 }}>
            RoomAdvisor
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 24, color: MUTED, textTransform: "uppercase", letterSpacing: 3 }}>
              Stile della stanza
            </div>
            <div style={{ fontSize: 58, fontWeight: 700, color: TEXT, lineHeight: 1.1 }}>
              {style.length > 70 ? `${style.slice(0, 67)}…` : style}
            </div>
          </div>
          <div style={{ fontSize: 26, color: MUTED }}>
            {count > 0
              ? `${count} pezzi d'arredo consigliati · palette di ${colors.length} colori`
              : "Carica una foto, ricevi stile e arredi da comprare"}
          </div>
        </div>
      </div>
    ),
    size
  );
}
