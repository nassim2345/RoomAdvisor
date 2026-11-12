"use client";

import { useMemo, useState } from "react";
import {
  computeSetTotal,
  formatEuro,
  productOptions,
} from "@/lib/products";
import type { Product } from "@/lib/types";

interface ProductsPanelProps {
  products: Product[] | null;
  loading?: boolean;
  /** Budget massimo per pezzo, se impostato dall'utente. */
  budget?: number | null;
}

function productKey(p: Product, i: number): string {
  return `${p.rank ?? i}-${p.category}`;
}

export default function ProductsPanel({
  products,
  loading = false,
  budget = null,
}: ProductsPanelProps) {
  // Indice dell'opzione scelta per ogni categoria (0 = proposta principale).
  const [selected, setSelected] = useState<Record<string, number>>({});

  const chosen = useMemo(
    () =>
      (products ?? []).map((p, i) => {
        const options = productOptions(p);
        const idx = Math.min(selected[productKey(p, i)] ?? 0, options.length - 1);
        return { product: p, options, idx, option: options[idx] };
      }),
    [products, selected]
  );

  const total = useMemo(
    () => computeSetTotal(chosen.map((c) => c.option)),
    [chosen]
  );

  if (products === null) return null;

  if (products.length === 0) {
    return (
      <section className="w-full rounded-2xl border border-brand-border bg-brand-surface p-8 text-center text-brand-text-muted">
        Nessun prodotto trovato per le categorie suggerite.
        {budget ? " Prova ad alzare il budget per pezzo." : ""}
      </section>
    );
  }

  const cycle = (key: string, length: number, delta: number) =>
    setSelected((prev) => ({
      ...prev,
      [key]: ((prev[key] ?? 0) + delta + length) % length,
    }));

  return (
    <section className="w-full">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-brand-text sm:text-2xl">
          Pezzi consigliati
        </h2>
        {total.priced > 0 && (
          <div
            className="rounded-xl border border-brand-border bg-brand-surface px-4 py-2 text-right shadow-sm"
            aria-live="polite"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted">
              Totale del set
            </p>
            <p className="text-lg font-semibold tracking-tight text-brand-text">
              {formatEuro(total.total)}
              {total.priced < total.count && (
                <span className="ml-1 text-xs font-normal text-brand-text-muted">
                  ({total.priced}/{total.count} con prezzo)
                </span>
              )}
            </p>
          </div>
        )}
      </div>
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {chosen.map(({ product: p, options, idx, option: o }, i) => {
          const key = productKey(p, i);
          const hasAlternatives = options.length > 1;
          return (
            <li
              key={key}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-text/20 hover:shadow-md"
            >
              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-brand-muted">
                {o.thumbnail ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={o.thumbnail}
                    src={o.thumbnail}
                    alt={o.name}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-sm text-brand-text-muted">
                    Nessuna immagine
                  </span>
                )}
                {hasAlternatives && (
                  <span className="absolute bottom-2 right-2 rounded-full bg-[#2A2622]/80 px-2 py-0.5 font-mono text-[10px] text-white backdrop-blur-sm">
                    {idx + 1}/{options.length}
                  </span>
                )}
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-block w-fit rounded-full bg-brand-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted">
                    {p.category}
                  </span>
                  {o.source && (
                    <span className="truncate text-xs text-brand-text-muted">
                      {o.source}
                    </span>
                  )}
                </div>
                <h3 className="line-clamp-2 text-sm font-medium leading-snug text-brand-text">
                  {o.name}
                </h3>
                <p className="text-lg font-semibold tracking-tight text-brand-text">
                  {o.price ?? (
                    <span className="text-sm font-normal text-brand-text-muted">
                      Prezzo non disponibile
                    </span>
                  )}
                </p>
                <div className="mt-auto flex gap-2">
                  {hasAlternatives && (
                    <button
                      type="button"
                      onClick={() => cycle(key, options.length, 1)}
                      aria-label={`Mostra un'altra opzione per ${p.category}`}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-brand-border px-3 py-2.5 text-sm font-medium text-brand-text transition-colors hover:bg-brand-muted"
                    >
                      <span aria-hidden>↻</span> Cambia
                    </button>
                  )}
                  <a
                    href={o.link}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex flex-1 items-center justify-center rounded-lg border border-transparent bg-[#2A2622] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#0F0D0B] hover:shadow"
                  >
                    Acquista
                  </a>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {loading && (
        <p className="mt-4 flex items-center gap-2 text-sm text-brand-text-muted">
          <span
            aria-hidden
            className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-border border-t-brand-text"
          />
          Cerco altri prodotti…
        </p>
      )}
    </section>
  );
}
