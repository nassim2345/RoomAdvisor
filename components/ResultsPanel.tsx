import type { RoomAnalysis } from "@/lib/types";

interface ResultsPanelProps {
  analysis: RoomAnalysis | null;
}

const confidenceClasses: Record<RoomAnalysis["confidence"], string> = {
  low: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-green-100 text-green-800",
};

function readableTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1f2937" : "#f9fafb";
}

export default function ResultsPanel({ analysis }: ResultsPanelProps) {
  if (!analysis) return null;

  return (
    <section className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Analisi</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${confidenceClasses[analysis.confidence]}`}
        >
          {analysis.confidence}
        </span>
      </header>

      <div className="mb-4">
        <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-gray-500">
          Colori dominanti
        </h3>
        <ul className="flex flex-wrap gap-2">
          {analysis.colors.map((hex) => (
            <li
              key={hex}
              className="rounded-md px-3 py-2 font-mono text-xs"
              style={{ backgroundColor: hex, color: readableTextColor(hex) }}
            >
              {hex.toUpperCase()}
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-4">
        <h3 className="mb-1 text-sm font-medium uppercase tracking-wide text-gray-500">
          Stile
        </h3>
        <p className="text-gray-900">{analysis.style}</p>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-medium uppercase tracking-wide text-gray-500">
          Dimensioni
        </h3>
        <p className="text-gray-900">{analysis.dimensions}</p>
      </div>
    </section>
  );
}
