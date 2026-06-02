function Bar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-brand-muted ${className}`}
      aria-hidden
    />
  );
}

export function AnalysisSkeleton() {
  return (
    <section
      aria-busy
      aria-label="Caricamento analisi"
      className="w-full rounded-2xl border border-brand-border bg-brand-surface p-6 shadow-sm"
    >
      <div className="mb-5 flex items-center justify-between">
        <Bar className="h-7 w-32" />
        <Bar className="h-6 w-16 rounded-full" />
      </div>

      <Bar className="mb-2 h-3 w-28" />
      <div className="mb-6 flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Bar key={i} className="h-9 w-16" />
        ))}
      </div>

      <Bar className="mb-2 h-3 w-20" />
      <Bar className="mb-6 h-4 w-3/4" />

      <Bar className="mb-2 h-3 w-24" />
      <Bar className="h-4 w-2/3" />
    </section>
  );
}

export function ProductsSkeleton() {
  return (
    <section
      aria-busy
      aria-label="Caricamento prodotti"
      className="w-full"
    >
      <Bar className="mb-6 h-7 w-48" />
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={i}
            className="flex flex-col overflow-hidden rounded-2xl border border-brand-border bg-brand-surface"
          >
            <Bar className="aspect-square w-full rounded-none" />
            <div className="flex flex-col gap-3 p-4">
              <Bar className="h-4 w-20 rounded-full" />
              <Bar className="h-4 w-full" />
              <Bar className="h-4 w-3/4" />
              <Bar className="h-5 w-24" />
              <Bar className="mt-2 h-10 w-full rounded-lg" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
