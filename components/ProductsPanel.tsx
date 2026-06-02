import type { Product } from "@/lib/types";

interface ProductsPanelProps {
  products: Product[] | null;
}

export default function ProductsPanel({ products }: ProductsPanelProps) {
  if (products === null) return null;

  if (products.length === 0) {
    return (
      <section className="w-full rounded-2xl border border-brand-border bg-brand-surface p-8 text-center text-brand-text-muted">
        Nessun prodotto trovato per le categorie suggerite.
      </section>
    );
  }

  return (
    <section className="w-full">
      <h2 className="mb-6 text-xl font-semibold tracking-tight text-brand-text sm:text-2xl">
        Pezzi consigliati
      </h2>
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {products.map((p, i) => (
          <li
            key={`${p.category}-${i}`}
            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-text/20 hover:shadow-md"
          >
            <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-brand-muted">
              {p.thumbnail ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={p.thumbnail}
                  alt={p.name}
                  className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <span className="text-sm text-brand-text-muted">
                  Nessuna immagine
                </span>
              )}
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-3 p-5">
              <span className="inline-block w-fit rounded-full bg-brand-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted">
                {p.category}
              </span>
              <h3 className="line-clamp-2 text-sm font-medium leading-snug text-brand-text">
                {p.name}
              </h3>
              <p className="text-lg font-semibold tracking-tight text-brand-text">
                {p.price ?? (
                  <span className="text-sm font-normal text-brand-text-muted">
                    Prezzo non disponibile
                  </span>
                )}
              </p>
              <a
                href={p.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto inline-flex items-center justify-center rounded-lg bg-[#2A2622] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#0F0D0B] hover:shadow"
              >
                Acquista
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
