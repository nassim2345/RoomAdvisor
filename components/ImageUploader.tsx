"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalyzeError, RoomAnalysis } from "@/lib/types";

interface ImageUploaderProps {
  onResult: (analysis: RoomAnalysis) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: { message: string; code?: string } | null) => void;
  disabled?: boolean;
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

export default function ImageUploader({
  onResult,
  onLoading,
  onError,
  disabled = false,
}: ImageUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const handleSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      if (selected.length === 0) return;

      const availableSlots = MAX_IMAGES - files.length;
      const accepted = selected.slice(0, availableSlots);
      const rejected = selected.length - accepted.length;

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
      setWarning(
        rejected > 0
          ? `Massimo ${MAX_IMAGES} immagini: ${rejected} scartate.`
          : null
      );

      if (inputRef.current) inputRef.current.value = "";
    },
    [files.length]
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

    onLoading(true);
    onError(null);

    try {
      const dataUrls = await Promise.all(files.map(fileToDataUrl));
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: dataUrls }),
      });

      const payload: RoomAnalysis | AnalyzeError = await res.json();

      if (!res.ok) {
        const errorPayload = payload as AnalyzeError;
        onError({
          message: errorPayload.error ?? "Errore sconosciuto",
          code: errorPayload.code,
        });
        return;
      }

      const analysis = payload as RoomAnalysis;
      if (
        !Array.isArray(analysis.colors) ||
        typeof analysis.style !== "string" ||
        typeof analysis.dimensions !== "string" ||
        !["low", "medium", "high"].includes(analysis.confidence)
      ) {
        onError({
          message: "Risposta server non conforme allo schema atteso",
        });
        return;
      }

      onResult(analysis);
    } catch (err) {
      onError({
        message: err instanceof Error ? err.message : "Errore di rete",
      });
    } finally {
      onLoading(false);
    }
  }, [files, onLoading, onError, onResult]);

  const canAddMore = files.length < MAX_IMAGES;
  const canAnalyze = files.length > 0 && !disabled;

  return (
    <div className="w-full max-w-2xl space-y-4">
      <div>
        <label
          className={`inline-block cursor-pointer rounded-md border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:border-gray-500 hover:bg-gray-50 ${
            !canAddMore || disabled ? "pointer-events-none opacity-50" : ""
          }`}
        >
          {canAddMore
            ? `Seleziona foto (${files.length}/${MAX_IMAGES})`
            : `Limite raggiunto (${MAX_IMAGES}/${MAX_IMAGES})`}
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
          <p className="mt-2 text-sm text-amber-700">{warning}</p>
        )}
      </div>

      {previews.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {previews.map((src, i) => (
            <li
              key={src}
              className="relative overflow-hidden rounded-md border border-gray-200"
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
                className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white hover:bg-black/80 disabled:opacity-50"
              >
                Rimuovi
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={!canAnalyze}
        className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {disabled ? "Analisi in corso..." : "Analizza"}
      </button>
    </div>
  );
}
