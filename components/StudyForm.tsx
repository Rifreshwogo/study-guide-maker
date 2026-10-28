"use client";

import { useEffect, useRef, useState } from "react";
import { APP_CONFIG } from "@/app.config";
import { CLASSES } from "@/sources.config";
import { GenerateRequestSchema, type GenerateRequest } from "@/lib/request";
import type { PreparedImage } from "@/lib/image";
import PhotoPicker from "./PhotoPicker";

interface Props {
  onSubmit: (request: GenerateRequest) => void;
  disabled?: boolean;
}

function localDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type FieldErrors = Partial<Record<"classId" | "topic" | "images", string>>;

export default function StudyForm({ onSubmit, disabled }: Props) {
  const [classId, setClassId] = useState("");
  const [topic, setTopic] = useState("");
  const [images, setImages] = useState<PreparedImage[]>([]);
  const [photosBusy, setPhotosBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Free the photo previews when the form goes away ("Make another guide").
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(() => () => imagesRef.current.forEach((i) => URL.revokeObjectURL(i.previewUrl)), []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = GenerateRequestSchema.safeParse({
      classId,
      topic,
      today: localDate(),
      images: images.map(({ mediaType, data }) => ({ mediaType, data })),
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        next[field] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  }

  const remaining = APP_CONFIG.maxTopicChars - topic.length;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="classId" className="block font-semibold">
          1. Your class
        </label>
        <select
          id="classId"
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
            setErrors((x) => ({ ...x, classId: undefined }));
          }}
          disabled={disabled}
          aria-invalid={!!errors.classId}
          aria-describedby={errors.classId ? "classId-error" : undefined}
          className="w-full rounded-lg border border-line bg-background px-3 py-3 text-base"
        >
          <option value="">Choose a class…</option>
          {CLASSES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.classId && (
          <p id="classId-error" className="text-sm text-red-600 dark:text-red-400">
            {errors.classId}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="topic" className="block font-semibold">
          2. What do you want to study?
        </label>
        <textarea
          id="topic"
          value={topic}
          onChange={(e) => {
            setTopic(e.target.value.slice(0, APP_CONFIG.maxTopicChars));
            setErrors((x) => ({ ...x, topic: undefined }));
          }}
          disabled={disabled}
          rows={3}
          maxLength={APP_CONFIG.maxTopicChars}
          placeholder='e.g. "Unit 3 cardiovascular system, test Friday" or "related rates problems"'
          aria-invalid={!!errors.topic}
          aria-describedby="topic-help"
          className="w-full rounded-lg border border-line bg-background px-3 py-3 text-base"
        />
        <div id="topic-help" className="flex justify-between gap-4 text-sm">
          <span className={errors.topic ? "text-red-600 dark:text-red-400" : "text-muted"}>
            {errors.topic ?? "Mention your test date if you have one. Please don't include your name or school."}
          </span>
          <span className={remaining < 50 ? "text-red-600 dark:text-red-400 shrink-0" : "text-muted shrink-0"}>
            {remaining}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <p className="font-semibold">3. Photos of your class notes</p>
        <p className="text-sm text-muted">
          Your notes show what your teacher actually covered, so the guide will focus on them.
          Photos are used only to make this guide and are never saved.
        </p>
        <PhotoPicker
          images={images}
          onChange={(next) => {
            setImages(next);
            setErrors((x) => ({ ...x, images: undefined }));
          }}
          disabled={disabled}
          onBusyChange={setPhotosBusy}
        />
        {errors.images && (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.images}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={disabled || photosBusy}
        className="w-full rounded-lg bg-accent px-4 py-3.5 text-lg font-semibold text-accent-fg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {photosBusy ? "Getting photos ready…" : "Make my study guide"}
      </button>
    </form>
  );
}
