import { z } from "zod";
import { APP_CONFIG } from "@/app.config";
import { CLASSES } from "@/sources.config";

/**
 * The request the browser sends to /api/generate. The same rules run in the
 * browser (for friendly messages) and on the server (as the real check).
 */

const classIds = CLASSES.map((c) => c.id) as [string, ...string[]];

/** Base64 text is about 4/3 the size of the bytes it holds. */
const maxBase64Chars = Math.ceil((APP_CONFIG.maxImageBytes * 4) / 3) + 4;

export const NoteImageSchema = z.object({
  mediaType: z.enum(["image/jpeg", "image/png"]),
  data: z
    .string()
    .max(maxBase64Chars, "One of the photos is too large.")
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, "One of the photos couldn't be read."),
});

export const GenerateRequestSchema = z.object({
  classId: z.enum(classIds, { error: "Please pick your class." }),
  topic: z
    .string()
    .trim()
    .min(3, "Tell us a little more about what you're studying.")
    .max(APP_CONFIG.maxTopicChars, `Please keep it under ${APP_CONFIG.maxTopicChars} characters.`),
  /** The student's local date (YYYY-MM-DD), for working out "test Friday". */
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bad date."),
  images: z
    .array(NoteImageSchema)
    .max(APP_CONFIG.maxImages, `You can add up to ${APP_CONFIG.maxImages} photos.`),
});

export type NoteImage = z.infer<typeof NoteImageSchema>;
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
