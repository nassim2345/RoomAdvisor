"use client";

interface ResetButtonProps {
  onReset: () => void;
}

export default function ResetButton({ onReset }: ResetButtonProps) {
  return (
    <button
      type="button"
      onClick={onReset}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-border bg-brand-surface px-4 py-2 text-sm font-medium text-brand-text transition-colors hover:bg-brand-muted"
    >
      <span aria-hidden>↺</span>
      Nuova analisi
    </button>
  );
}
