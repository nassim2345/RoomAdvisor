"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GOAL_LABELS,
  GOAL_OPTIONS,
  isGoal,
  type Goal,
  type Product,
  type RoomAnalysis,
} from "@/lib/types";

type StreamError = { message: string; code?: string };

interface ImageUploaderProps {
  onStart: () => void;
  onAnalysis: (analysis: RoomAnalysis) => void;
  onAnalysisError: (error: StreamError) => void;
  onProduct: (product: Product) => void;
  onProductsError: (error: StreamError) => void;
  onShared: (id: string) => void;
  onComplete: () => void;
  disabled?: boolean;
  compact?: boolean;
  budget: number | null;
  onBudgetChange: (budget: number | null) => void;
}

const MAX_IMAGES = 3;
const SOFT_MAX_BYTES = 8 * 1024 * 1024;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Errore lettura file"));
    reader.readAsDataURL(file);
  });
}

function parseSseChunk(
  chunk: string
): { event: string; data: unknown } | null {
  let event: string | null = null;
  let data: string | null = null;
  for (const line of chunk.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data = line.slice(5).trim();
  }
  if (!event || data === null) return null;
  try {
    return { event, data: JSON.parse(data) };
  } catch {
    return null;
  }
}

export default function ImageUploader({
  onStart,
  onAnalysis,
  onAnalysisError,
  onProduct,
  onProductsError,
  onShared,
  onComplete,
  disabled = false,
  compact = false,
  budget,
  onBudgetChange,
}: ImageUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dimensions, setDimensions] = useState("");
  const [goal, setGoal] = useState<Goal | null>(null);
  const [ownedItems, setOwnedItems] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const processFiles = useCallback(
    (selected: File[]) => {
      if (selected.length === 0) return;

      const onlyImages = selected.filter((f) => f.type.startsWith("image/"));
      if (onlyImages.length === 0) {
        setWarning("Sono ammessi solo file immagine.");
        return;
      }

      const availableSlots = MAX_IMAGES - files.length;
      const accepted = onlyImages.slice(0, availableSlots);
      const overCap = onlyImages.length - accepted.length;
      const nonImages = selected.length - onlyImages.length;

      const oversized = accepted.find((f) => f.size > SOFT_MAX_BYTES);
      if (oversized) {
        setWarning(
          `File "${oversized.name}" supera ${SOFT_MAX_BYTES / 1024 / 1024}MB. Riduci la risoluzione prima di caricare.`
        );
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      const newPreviews = accepted.map((f) => URL.createObjectURL(f));
      setFiles((prev) => [...prev, ...accepted]);
      setPreviews((prev) => [...prev, ...newPreviews]);

      const parts: string[] = [];
      if (overCap > 0)
        parts.push(`${overCap} immagini oltre il limite di ${MAX_IMAGES}`);
      if (nonImages > 0) parts.push(`${nonImages} file non immagine ignorati`);
      setWarning(parts.length > 0 ? `Scartati: ${parts.join(", ")}.` : null);

      if (inputRef.current) inputRef.current.value = "";
    },
    [files.length]
  );

  const handleSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      processFiles(Array.from(e.target.files ?? []));
    },
    [processFiles]
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      if (disabled || files.length >= MAX_IMAGES) return;
      setIsDragging(true);
    },
    [disabled, files.length]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  }, []);

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      const next = e.relatedTarget as Node | null;
      if (next && e.currentTarget.contains(next)) return;
      setIsDragging(false);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      processFiles(Array.from(e.dataTransfer.files ?? []));
    },
    [disabled, processFiles]
  );

  const handleRemove = useCallback(
    (index: number) => {
      URL.revokeObjectURL(previews[index]);
      setFiles((prev) => prev.filter((_, i) => i !== index));
      setPreviews((prev) => prev.filter((_, i) => i !== index));
      setWarning(null);
    },
    [previews]
  );

  const handleAnalyze = useCallback(async () => {
    if (files.length === 0) return;

    onStart();
    const ac = new AbortController();
    abortRef.current = ac;
    let gotAnalysis = false;

    try {
      const dataUrls = await Promise.all(files.map(fileToDataUrl));
      const trimmedDimensions = dimensions.trim();
      const trimmedOwned = ownedItems.trim();
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          images: dataUrls,
          ...(trimmedDimensions ? { dimensions: trimmedDimensions } : {}),
          ...(budget ? { budget } : {}),
          ...(goal ? { goal } : {}),
          ...(trimmedOwned ? { ownedItems: trimmedOwned } : {}),
        }),
      });

      if (!res.ok || !res.body) {
        let message = "Errore di rete";
        let code: string | undefined;
        try {
          const j = await res.json();
          message = j.error ?? message;
          code = j.code;
        } catch {
          /* corpo non JSON */
        }
        onAnalysisError({ message, code });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const ev = parseSseChunk(chunk);
          if (!ev) continue;
          if (ev.event === "analysis") {
            gotAnalysis = true;
            onAnalysis(ev.data as RoomAnalysis);
          } else if (ev.event === "product") {
            onProduct(ev.data as Product);
          } else if (ev.event === "shared") {
            onShared((ev.data as { id: string }).id);
          } else if (ev.event === "error") {
            const err = ev.data as { code?: string; message: string };
            if (err.code === "NOT_A_ROOM" || !gotAnalysis) {
              onAnalysisError({ message: err.message, code: err.code });
            } else {
              onProductsError({ message: err.message, code: err.code });
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      onAnalysisError({
        message: err instanceof Error ? err.message : "Errore di rete",
      });
    } finally {
      onComplete();
      abortRef.current = null;
    }
  }, [
    files,
    dimensions,
    budget,
    goal,
    ownedItems,
    onStart,
    onAnalysis,
    onAnalysisError,
    onProduct,
    onProductsError,
    onShared,
    onComplete,
  ]);

  const handleBudgetChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value.trim();
      if (v === "") return onBudgetChange(null);
      const n = Number(v);
      onBudgetChange(Number.isFinite(n) && n > 0 ? n : null);
    },
    [onBudgetChange]
  );

  const handleGoalChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const v = e.target.value;
      setGoal(v === "" ? null : isGoal(v) ? v : null);
    },
    []
  );

  const canAddMore = files.length < MAX_IMAGES;
  const canAnalyze = files.length > 0 && !disabled;
  const dropAreaLocked = !canAddMore || disabled;

  const dropAreaClasses = [
    "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 px-6 py-10 text-center transition-colors",
    isDragging
      ? "border-solid border-[#2A2622] bg-brand-muted/60"
      : "border-dashed border-brand-border bg-brand-surface hover:border-brand-text/30 hover:bg-brand-muted/30",
    dropAreaLocked ? "pointer-events-none opacity-50" : "cursor-pointer",
  ].join(" ");

  return (
    <div className="w-full rounded-2xl border border-brand-border bg-brand-surface p-6 shadow-sm">
      <h2 className="mb-5 text-xl font-semibold tracking-tight text-brand-text sm:text-2xl">
        Le tue foto
      </h2>

      <div className="space-y-5">
        <label
          className={dropAreaClasses}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <span className="text-base font-medium text-brand-text">
            {isDragging
              ? "Rilascia qui le foto"
              : canAddMore
                ? "Trascina o seleziona le foto della tua stanza"
                : "Limite raggiunto"}
          </span>
          <span className="text-sm text-brand-text-muted">
            {canAddMore
              ? `JPG o PNG, max ${MAX_IMAGES} immagini (${files.length}/${MAX_IMAGES} selezionate)`
              : `${MAX_IMAGES}/${MAX_IMAGES} immagini caricate`}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleSelect}
            disabled={!canAddMore || disabled}
          />
        </label>

        {warning && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {warning}
          </p>
        )}

        {previews.length > 0 &&
          (compact ? (
            <ul className="flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <li
                  key={src}
                  className="overflow-hidden rounded-lg border border-brand-border bg-brand-surface"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Foto caricata ${i + 1}`}
                    className="h-16 w-16 object-cover"
                  />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {previews.map((src, i) => (
                <li
                  key={src}
                  className="group relative overflow-hidden rounded-xl border border-brand-border bg-brand-surface"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Anteprima ${i + 1}`}
                    className="aspect-square w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemove(i)}
                    disabled={disabled}
                    aria-label={`Rimuovi immagine ${i + 1}`}
                    className="absolute right-2 top-2 rounded-full bg-[#2A2622]/80 px-2.5 py-1 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-[#2A2622] group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-50"
                  >
                    Rimuovi
                  </button>
                </li>
              ))}
            </ul>
          ))}

        <div className="space-y-3">
          <div>
            <label
              htmlFor="room-dimensions"
              className="mb-1.5 block text-sm font-medium text-brand-text"
            >
              Dimensioni stanza{" "}
              <span className="text-brand-text-muted">(opzionale)</span>
            </label>
            <input
              id="room-dimensions"
              type="text"
              value={dimensions}
              onChange={(e) => setDimensions(e.target.value)}
              placeholder="es. 4x5 metri"
              maxLength={50}
              disabled={disabled}
              className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="room-goal"
              className="mb-1.5 block text-sm font-medium text-brand-text"
            >
              Obiettivo stilistico{" "}
              <span className="text-brand-text-muted">(opzionale)</span>
            </label>
            <select
              id="room-goal"
              value={goal ?? ""}
              onChange={handleGoalChange}
              disabled={disabled}
              className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Nessun obiettivo</option>
              {GOAL_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {GOAL_LABELS[g]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="room-budget"
              className="mb-1.5 block text-sm font-medium text-brand-text"
            >
              Budget per pezzo{" "}
              <span className="text-brand-text-muted">(opzionale)</span>
            </label>
            <input
              id="room-budget"
              type="number"
              inputMode="numeric"
              min={1}
              value={budget ?? ""}
              onChange={handleBudgetChange}
              placeholder="es. 150"
              disabled={disabled}
              className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="room-owned"
              className="mb-1.5 block text-sm font-medium text-brand-text"
            >
              Cosa possiedi già{" "}
              <span className="text-brand-text-muted">(opzionale)</span>
            </label>
            <textarea
              id="room-owned"
              rows={2}
              maxLength={300}
              value={ownedItems}
              onChange={(e) => setOwnedItems(e.target.value)}
              placeholder="es. divano grigio in pelle, libreria IKEA Billy"
              disabled={disabled}
              className="w-full resize-none rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex justify-center sm:justify-start">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className="inline-flex w-full items-center justify-center rounded-lg bg-[#2A2622] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#0F0D0B] hover:shadow disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {disabled ? "Analisi in corso..." : "Analizza la stanza"}
          </button>
        </div>
      </div>
    </div>
  );
}
