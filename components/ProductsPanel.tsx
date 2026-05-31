import type { Product } from "@/lib/types";

interface ProductsPanelProps {
  products: Product[] | null;
}

export default function ProductsPanel({ products }: ProductsPanelProps) {
  if (products === null) return null;

  if (products.length === 0) {
    return (
      <section className="w-full max-w-4xl rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-500">
        Nessun prodotto trovato per le categorie suggerite.
      </section>
    );
  }

  return (
    <section className="w-full max-w-4xl">
      <h2 className="mb-4 text-2xl font-semibold text-gray-900">
        Pezzi consigliati
      </h2>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p, i) => (
          <li
            key={`${p.category}-${i}`}
            className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
          >
            <div className="flex aspect-square items-center justify-center bg-gray-100">
              {p.thumbnail ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={p.thumbnail}
                  alt={p.name}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              ) : (
                <span className="text-sm text-gray-400">Nessuna immagine</span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <span className="inline-block w-fit rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-gray-600">
                {p.category}
              </span>
              <h3 className="line-clamp-2 text-sm font-medium text-gray-900">
                {p.name}
              </h3>
              <p className="text-base font-semibold text-gray-900">
                {p.price ?? "Prezzo non disponibile"}
              </p>
              <a
                href={p.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
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
