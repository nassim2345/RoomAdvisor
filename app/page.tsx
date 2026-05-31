"use client";

import { useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import ResultsPanel from "@/components/ResultsPanel";
import type { RoomAnalysis } from "@/lib/types";

export default function Home() {
  const [analysis, setAnalysis] = useState<RoomAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(
    null
  );

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 bg-gray-50 px-4 py-12">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">RoomAdvisor</h1>
        <p className="mt-2 text-lg text-gray-600">
          Carica 1-3 foto della tua stanza per analizzarne colori, stile e
          dimensioni.
        </p>
      </header>

      <ImageUploader
        onResult={(a) => {
          setAnalysis(a);
          setError(null);
        }}
        onLoading={setLoading}
        onError={setError}
        disabled={loading}
      />

      {loading && (
        <div className="flex items-center gap-3 text-gray-600">
          <span
            aria-hidden
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"
          />
          <span>Analisi in corso...</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="w-full max-w-2xl rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <strong className="font-semibold">Errore</strong>
          {error.code && (
            <span className="ml-2 rounded bg-red-100 px-2 py-0.5 font-mono text-xs">
              {error.code}
            </span>
          )}
          <p className="mt-1">{error.message}</p>
        </div>
      )}

      <ResultsPanel analysis={analysis} />
    </main>
  );
}
