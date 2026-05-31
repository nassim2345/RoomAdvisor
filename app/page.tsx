"use client";

import { useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import ProductsPanel from "@/components/ProductsPanel";
import ResultsPanel from "@/components/ResultsPanel";
import type {
  Product,
  ProductsError,
  ProductsResponse,
  RoomAnalysis,
} from "@/lib/types";

type AppError = { message: string; code?: string } | null;

export default function Home() {
  const [analysis, setAnalysis] = useState<RoomAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<AppError>(null);

  const [products, setProducts] = useState<Product[] | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<AppError>(null);

  async function fetchProducts(roomAnalysis: RoomAnalysis) {
    setProductsLoading(true);
    setProductsError(null);
    setProducts(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: roomAnalysis }),
      });
      const payload: ProductsResponse | ProductsError = await res.json();
      if (!res.ok) {
        const e = payload as ProductsError;
        setProductsError({
          message: e.error ?? "Errore sconosciuto",
          code: e.code,
        });
        return;
      }
      setProducts((payload as ProductsResponse).products);
    } catch (err) {
      setProductsError({
        message: err instanceof Error ? err.message : "Errore di rete",
      });
    } finally {
      setProductsLoading(false);
    }
  }

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
          setAnalysisError(null);
          fetchProducts(a);
        }}
        onLoading={setAnalysisLoading}
        onError={setAnalysisError}
        disabled={analysisLoading}
      />

      {analysisLoading && (
        <div className="flex items-center gap-3 text-gray-600">
          <span
            aria-hidden
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"
          />
          <span>Analisi in corso...</span>
        </div>
      )}

      {analysisError && (
        <div
          role="alert"
          className="w-full max-w-2xl rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <strong className="font-semibold">Errore analisi</strong>
          {analysisError.code && (
            <span className="ml-2 rounded bg-red-100 px-2 py-0.5 font-mono text-xs">
              {analysisError.code}
            </span>
          )}
          <p className="mt-1">{analysisError.message}</p>
        </div>
      )}

      <ResultsPanel analysis={analysis} />

      {productsLoading && (
        <div className="flex items-center gap-3 text-gray-600">
          <span
            aria-hidden
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"
          />
          <span>Cerco prodotti consigliati...</span>
        </div>
      )}

      {productsError && (
        <div
          role="alert"
          className="w-full max-w-2xl rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <strong className="font-semibold">Errore ricerca prodotti</strong>
          {productsError.code && (
            <span className="ml-2 rounded bg-red-100 px-2 py-0.5 font-mono text-xs">
              {productsError.code}
            </span>
          )}
          <p className="mt-1">{productsError.message}</p>
        </div>
      )}

      <ProductsPanel products={products} />
    </main>
  );
}
