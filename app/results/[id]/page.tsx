import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import IssuesPanel from "@/components/IssuesPanel";
import ProductsPanel from "@/components/ProductsPanel";
import ResultsPanel from "@/components/ResultsPanel";
import { getShared } from "@/lib/share-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

// Deduplica la lettura tra generateMetadata e la pagina nella stessa richiesta.
const loadShared = cache(async (id: string) => {
  try {
    return await getShared(id);
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await loadShared(params.id);
  if (!result) {
    return { title: "Risultato non trovato — RoomAdvisor", robots: { index: false } };
  }
  const { style } = result.analysis;
  const count = result.products.length;
  const description = `Stile: ${style}. ${count} pezzi d'arredo consigliati da RoomAdvisor.`;
  return {
    title: `${style} — RoomAdvisor`,
    description,
    robots: { index: false },
    openGraph: { title: `La mia stanza: ${style}`, description, type: "website" },
    twitter: { card: "summary_large_image", title: `La mia stanza: ${style}`, description },
  };
}

export default async function ResultsPage({ params }: Props) {
  const result = await loadShared(params.id);
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
