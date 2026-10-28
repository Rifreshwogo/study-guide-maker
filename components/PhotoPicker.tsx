"use client";

import { useRef, useState } from "react";
import { APP_CONFIG } from "@/app.config";
import { ACCEPTED_INPUT, ImageError, prepareImage, type PreparedImage } from "@/lib/image";

interface Props {
  images: PreparedImage[];
  onChange: (images: PreparedImage[]) => void;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}

export default function PhotoPicker({ images, onChange, disabled, onBusyChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const slotsLeft = APP_CONFIG.maxImages - images.length;
  const busy = processing > 0;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const newErrors: string[] = [];

    setProcessing(Math.min(files.length, slotsLeft));
    onBusyChange?.(true);
    const added: PreparedImage[] = [];
    let index = 0;
    // One at a time, so phones don't run out of memory on big photos.
    // A file that fails doesn't use up a slot; the next file gets a turn.
    for (; index < files.length && added.length < slotsLeft; index++) {
      const file = files[index];
      try {
        added.push(await prepareImage(file));
        setProcessing((n) => Math.max(0, n - 1));
      } catch (e) {
        newErrors.push(e instanceof ImageError ? e.message : `We couldn't open "${file.name}".`);
      }
    }
    setProcessing(0);
    onBusyChange?.(false);

    const skipped = files.length - index;
    if (skipped > 0) {
      newErrors.push(
        `You can add up to ${APP_CONFIG.maxImages} photos, so ${skipped} ` +
          `${skipped === 1 ? "wasn't" : "weren't"} added.`,
      );
    }

    onChange([...images, ...added]);
    setErrors(newErrors);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(id: string) {
    const img = images.find((i) => i.id === id);
    if (img) URL.revokeObjectURL(img.previewUrl);
    onChange(images.filter((i) => i.id !== id));
    setErrors([]);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || busy || slotsLeft <= 0}
          className="rounded-lg border border-line bg-card px-4 py-2.5 font-medium hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📷 Add photos of notes
        </button>
        <span className="text-sm text-muted">
          {busy
            ? `Getting ${processing} photo${processing === 1 ? "" : "s"} ready…`
            : `Optional · ${images.length}/${APP_CONFIG.maxImages}`}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_INPUT}
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-label="Add photos of your notes"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="text-sm text-red-600 dark:text-red-400 space-y-1">
          {errors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}

      {images.length > 0 && (
        <ul className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {images.map((img, i) => (
            <li key={img.id} className="relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img
                src={img.previewUrl}
                alt={`Note photo ${i + 1}`}
                className="h-full w-full rounded-lg object-cover border border-line"
              />
              <button
                type="button"
                onClick={() => remove(img.id)}
                disabled={disabled || busy}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-foreground text-background text-lg leading-none shadow disabled:opacity-50"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
