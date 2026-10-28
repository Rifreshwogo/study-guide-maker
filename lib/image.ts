"use client";

import { APP_CONFIG } from "@/app.config";
import type { NoteImage } from "@/lib/request";

/**
 * Browser-only helpers for note photos. Every photo is redrawn onto a canvas and
 * saved as a new JPEG. This shrinks it, turns HEIC into JPEG, and drops the
 * photo's metadata (such as GPS location) before anything leaves the phone.
 */

/** Largest file we'll even try to open (phones make big HEICs). */
const MAX_INPUT_BYTES = 30 * 1024 * 1024;

export const ACCEPTED_INPUT = "image/jpeg,image/png,image/heic,image/heif,.heic,.heif";

export interface PreparedImage extends NoteImage {
  id: string;
  /** Object URL for the thumbnail. Revoke it when the photo is removed. */
  previewUrl: string;
}

export class ImageError extends Error {}

// Simple ids. crypto.randomUUID() is missing on plain-http LAN addresses (phone testing).
let nextId = 0;
const newId = () => `img-${Date.now()}-${nextId++}`;

function isHeic(file: File): boolean {
  return /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

function isAllowed(file: File): boolean {
  return /^image\/(jpeg|png)$/i.test(file.type) || isHeic(file);
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

async function decode(file: File): Promise<HTMLImageElement> {
  try {
    // Safari can open HEIC directly; other browsers can open JPG/PNG.
    return await loadImage(file);
  } catch {
    if (!isHeic(file)) throw new ImageError(`We couldn't open "${file.name}".`);
  }
  // Other browsers need HEIC converted first. Loaded only when needed (it's large).
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  return loadImage(blob);
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", quality),
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!isAllowed(file)) {
    throw new ImageError(`"${file.name}" isn't a JPG, PNG, or HEIC photo.`);
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageError(`"${file.name}" is too big to open. Try a smaller photo.`);
  }

  let img: HTMLImageElement;
  try {
    img = await decode(file);
  } catch (e) {
    if (e instanceof ImageError) throw e;
    throw new ImageError(`We couldn't open "${file.name}".`);
  }

  const max = APP_CONFIG.imageMaxDimension;
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageError("Your browser couldn't process this photo.");
  ctx.fillStyle = "#ffffff"; // PNG transparency becomes white, not black
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  // Step quality down until it fits the size cap.
  let blob: Blob | null = null;
  for (const quality of [0.85, 0.75, 0.65, 0.5]) {
    blob = await canvasToBlob(canvas, quality);
    if (blob.size <= APP_CONFIG.maxImageBytes) break;
  }
  if (!blob || blob.size > APP_CONFIG.maxImageBytes) {
    throw new ImageError(`"${file.name}" is still too large after shrinking it.`);
  }

  return {
    id: newId(),
    mediaType: "image/jpeg",
    data: await blobToBase64(blob),
    previewUrl: URL.createObjectURL(blob),
  };
}
