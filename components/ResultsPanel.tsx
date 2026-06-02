import type { RoomAnalysis } from "@/lib/types";

interface ResultsPanelProps {
  analysis: RoomAnalysis | null;
}

const confidenceClasses: Record<RoomAnalysis["confidence"], string> = {
  low: "bg-red-50 text-red-700 ring-1 ring-red-200",
  medium: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  high: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
};

function readableTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1F1B17" : "#FAF7F2";
}

export default function ResultsPanel({ analysis }: ResultsPanelProps) {
  if (!analysis) return null;

  return (
    <section className="w-full rounded-2xl border border-brand-border bg-brand-surface p-6 shadow-sm">
      <header className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-brand-text sm:text-2xl">
          Analisi della stanza
        </h2>
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${confidenceClasses[analysis.confidence]}`}
        >
          {analysis.confidence}
        </span>
      </header>

      <div className="mb-6">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted">
          Colori dominanti
        </h3>
        <ul className="flex flex-wrap gap-2">
          {analysis.colors.map((hex) => (
            <li
              key={hex}
              className="rounded-lg px-3 py-2 font-mono text-xs shadow-sm ring-1 ring-black/5"
              style={{ backgroundColor: hex, color: readableTextColor(hex) }}
            >
              {hex.toUpperCase()}
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-6">
        <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted">
          Stile
        </h3>
        <p className="leading-relaxed text-brand-text">{analysis.style}</p>
      </div>

      <div>
        <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted">
          Dimensioni
        </h3>
        <p className="leading-relaxed text-brand-text">{analysis.dimensions}</p>
      </div>
    </section>
  );
}
