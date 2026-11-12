"use client";

import { useState } from "react";
import { readableTextColor } from "@/lib/color";
import type { RoomAnalysis } from "@/lib/types";

interface ResultsPanelProps {
  analysis: RoomAnalysis | null;
}

const confidenceClasses: Record<RoomAnalysis["confidence"], string> = {
  low: "bg-red-50 text-red-700 ring-1 ring-red-200",
  medium: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  high: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
};

const COPIED_FEEDBACK_MS = 1500;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function ResultsPanel({ analysis }: ResultsPanelProps) {
  const [copied, setCopied] = useState<string | null>(null);
  if (!analysis) return null;

  const flash = async (label: string, text: string) => {
    if (await copyText(text)) {
      setCopied(label);
      setTimeout(() => setCopied((c) => (c === label ? null : c)), COPIED_FEEDBACK_MS);
    }
  };

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

      {analysis.observations && analysis.observations.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted">
            Osservazioni
          </h3>
          <ul className="list-disc space-y-1.5 pl-5 leading-relaxed text-brand-text">
            {analysis.observations.map((obs, i) => (
              <li key={i}>{obs}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted">
            Colori dominanti
          </h3>
          <button
            type="button"
            onClick={() => flash("all", analysis.colors.map((c) => c.toUpperCase()).join(", "))}
            className="text-xs font-medium text-brand-text-muted underline-offset-2 hover:text-brand-text hover:underline"
          >
            {copied === "all" ? "Palette copiata ✓" : "Copia palette"}
          </button>
        </div>
        <ul className="flex flex-wrap gap-2">
          {analysis.colors.map((hex) => {
            const label = hex.toUpperCase();
            return (
              <li key={hex}>
                <button
                  type="button"
                  onClick={() => flash(label, label)}
                  title={`Copia ${label}`}
                  className="rounded-lg px-3 py-2 font-mono text-xs shadow-sm ring-1 ring-black/5 transition-transform hover:-translate-y-0.5"
                  style={{ backgroundColor: hex, color: readableTextColor(hex) }}
                >
                  {copied === label ? "Copiato ✓" : label}
                </button>
              </li>
            );
          })}
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
