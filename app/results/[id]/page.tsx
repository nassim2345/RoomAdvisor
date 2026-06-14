import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import IssuesPanel from "@/components/IssuesPanel";
import ProductsPanel from "@/components/ProductsPanel";
import ResultsPanel from "@/components/ResultsPanel";
import { getShared } from "@/lib/share-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Risultato condiviso — RoomAdvisor",
  description: "Analisi della stanza e consigli d'arredo condivisi.",
};

export default function ResultsPage({ params }: { params: { id: string } }) {
  const result = getShared(params.id);
  if (!result) notFound();

  return (
    <main className="min-h-screen bg-brand-bg">
      <nav className="sticky top-0 z-50 h-14 border-b border-brand-border bg-brand-surface">
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-brand-text"
          >
            RoomAdvisor
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-[#2A2622] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0F0D0B]"
          >
            Analizza la tua stanza
          </Link>
        </div>
      </nav>

      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <ResultsPanel analysis={result.analysis} />
        <IssuesPanel issues={result.analysis.issues} />
        <ProductsPanel products={result.products} />
      </div>
    </main>
  );
}
