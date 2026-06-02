import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-brand-bg px-4 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-brand-text">
        Link non valido
      </h1>
      <p className="max-w-md text-brand-text-muted">
        Questo risultato non esiste o il link è scaduto (i link condivisi
        durano 24 ore).
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex items-center justify-center rounded-lg bg-[#2A2622] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0F0D0B]"
      >
        Vai a RoomAdvisor
      </Link>
    </main>
  );
}
