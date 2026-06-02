"use client";

import { useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import ProductsPanel from "@/components/ProductsPanel";
import ResetButton from "@/components/ResetButton";
import ResultsPanel from "@/components/ResultsPanel";
import ShareButton from "@/components/ShareButton";
import { AnalysisSkeleton, ProductsSkeleton } from "@/components/Skeleton";
import type { Product, RoomAnalysis } from "@/lib/types";

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

function NotARoomBanner({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <strong className="font-semibold">Foto non riconosciuta</strong>
      <p className="mt-1 leading-relaxed">{message}</p>
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

  const [budget, setBudget] = useState<number | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  function handleStart() {
    setAnalysis(null);
    setAnalysisError(null);
    setProducts(null);
    setProductsError(null);
    setShareId(null);
    setAnalysisLoading(true);
    setProductsLoading(true);
  }

  function handleReset() {
    setAnalysis(null);
    setAnalysisError(null);
    setProducts(null);
    setProductsError(null);
    setShareId(null);
    setAnalysisLoading(false);
    setProductsLoading(false);
    setBudget(null);
    setResetKey((k) => k + 1);
  }

  const hasResults =
    analysis !== null ||
    analysisLoading ||
    productsLoading ||
    products !== null ||
    productsError !== null ||
    analysisError !== null;

  const showReset = hasResults && !analysisLoading && !productsLoading;

  const uploader = (
    <ImageUploader
      key={resetKey}
      onStart={handleStart}
      onAnalysis={(a) => {
        setAnalysis(a);
        setAnalysisLoading(false);
      }}
      onAnalysisError={(e) => {
        setAnalysisError(e);
        setAnalysisLoading(false);
        setProductsLoading(false);
      }}
      onProduct={(p) => setProducts((prev) => [...(prev ?? []), p])}
      onProductsError={(e) => {
        setProductsError(e);
        setProductsLoading(false);
      }}
      onShared={(id) => setShareId(id)}
      onComplete={() => {
        setAnalysisLoading(false);
        setProductsLoading(false);
      }}
      disabled={analysisLoading || productsLoading}
      compact={analysis !== null || analysisLoading}
      budget={budget}
      onBudgetChange={setBudget}
    />
  );

  const analysisErrorRegion =
    analysisError?.code === "NOT_A_ROOM" ? (
      <NotARoomBanner message={analysisError.message} />
    ) : (
      <ErrorBanner title="Errore analisi" error={analysisError} />
    );

  const productsRegion =
    products && products.length > 0 ? (
      <ProductsPanel products={products} loading={productsLoading} />
    ) : productsLoading ? (
      <ProductsSkeleton />
    ) : (
      <ProductsPanel products={products} />
    );

  return (
    <main className="min-h-screen bg-brand-bg">
      <nav className="sticky top-0 z-50 h-14 border-b border-brand-border bg-brand-surface">
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <span className="text-lg font-semibold tracking-tight text-brand-text">
            RoomAdvisor
          </span>
          <div className="flex items-center gap-2">
            {shareId && !productsLoading && <ShareButton id={shareId} />}
            {showReset && <ResetButton onReset={handleReset} />}
          </div>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {/* Albero stabile: l'uploader resta sempre primo figlio dello stesso
            <aside> per evitare unmount/remount (che abortirebbe lo stream SSE).
            Cambiano solo le className e la presenza della colonna prodotti. */}
        <div
          className={
            hasResults
              ? "grid grid-cols-1 gap-8 lg:grid-cols-[420px_1fr] lg:items-start"
              : "flex justify-center"
          }
        >
          <aside
            className={
              hasResults
                ? "flex flex-col gap-6 lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-88px)] lg:overflow-y-auto lg:pr-2"
                : "flex w-full max-w-2xl flex-col gap-4"
            }
          >
            {uploader}
            {analysisErrorRegion}
            {hasResults &&
              (analysisLoading ? (
                <AnalysisSkeleton />
              ) : (
                <ResultsPanel analysis={analysis} />
              ))}
          </aside>

          {hasResults && (
            <section className="flex flex-col gap-6">
              <ErrorBanner
                title="Errore ricerca prodotti"
                error={productsError}
              />
              {productsRegion}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
