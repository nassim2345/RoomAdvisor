"use client";

import { useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import ProductsPanel from "@/components/ProductsPanel";
import ResultsPanel from "@/components/ResultsPanel";
import { AnalysisSkeleton, ProductsSkeleton } from "@/components/Skeleton";
import type {
  Budget,
  Product,
  ProductsError,
  ProductsResponse,
  RoomAnalysis,
} from "@/lib/types";

type AppError = { message: string; code?: string } | null;

function ErrorBanner({ title, error }: { title: string; error: AppError }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <div className="flex items-center gap-2">
        <strong className="font-semibold">{title}</strong>
        {error.code && (
          <span className="rounded bg-red-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider">
            {error.code}
          </span>
        )}
      </div>
      <p className="mt-1 leading-relaxed">{error.message}</p>
    </div>
  );
}

export default function Home() {
  const [analysis, setAnalysis] = useState<RoomAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<AppError>(null);

  const [products, setProducts] = useState<Product[] | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<AppError>(null);

  const [budget, setBudget] = useState<Budget | null>(null);

  async function fetchProducts(roomAnalysis: RoomAnalysis) {
    setProductsLoading(true);
    setProductsError(null);
    setProducts(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis: roomAnalysis,
          ...(budget ? { budget } : {}),
        }),
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

  const hasResults =
    analysis !== null ||
    analysisLoading ||
    productsLoading ||
    products !== null ||
    productsError !== null;

  const uploader = (
    <ImageUploader
      onResult={(a) => {
        setAnalysis(a);
        setAnalysisError(null);
        fetchProducts(a);
      }}
      onLoading={setAnalysisLoading}
      onError={setAnalysisError}
      disabled={analysisLoading}
      compact={analysis !== null || analysisLoading}
      budget={budget}
      onBudgetChange={setBudget}
    />
  );

  return (
    <main className="min-h-screen bg-brand-bg">
      <nav className="sticky top-0 z-50 h-14 border-b border-brand-border bg-brand-surface">
        <div className="mx-auto flex h-full w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <span className="text-lg font-semibold tracking-tight text-brand-text">
            RoomAdvisor
          </span>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {!hasResults ? (
          <div className="flex justify-center">{uploader}</div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
            <aside className="flex flex-col gap-6 lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-88px)] lg:overflow-y-auto lg:pr-2">
              {uploader}
              <ErrorBanner title="Errore analisi" error={analysisError} />
              {analysisLoading ? (
                <AnalysisSkeleton />
              ) : (
                <ResultsPanel analysis={analysis} />
              )}
            </aside>

            <section className="flex flex-col gap-6">
              <ErrorBanner
                title="Errore ricerca prodotti"
                error={productsError}
              />
              {productsLoading ? (
                <ProductsSkeleton />
              ) : (
                <ProductsPanel products={products} />
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
