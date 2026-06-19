"use client";

import { useCallback, useState } from "react";

interface ShareButtonProps {
  id: string;
}

const COPIED_FEEDBACK_MS = 2000;

export default function ShareButton({ id }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const url = `${window.location.origin}/results/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      // Fallback: seleziona via prompt se clipboard non disponibile
      window.prompt("Copia il link:", url);
    }
  }, [id]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-border bg-brand-surface px-4 py-2 text-sm font-medium text-brand-text transition-colors hover:bg-brand-muted"
    >
      <span aria-hidden>{copied ? "✓" : "🔗"}</span>
      {copied ? "Link copiato" : "Condividi"}
    </button>
  );
}
