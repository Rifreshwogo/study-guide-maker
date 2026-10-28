import { z } from "zod";

/**
 * The JSON shape Claude must return. The server checks every response
 * against this and retries once if it doesn't match.
 *
 * Sources are NOT trusted from Claude. The server works out which books were
 * used from the pages actually fetched, and builds attribution from
 * sources.config.ts. Claude lists the websites it used (`webSources`), and the
 * server drops any that weren't actually seen during research.
 */

export const TermSchema = z.object({
  term: z.string().min(1),
  definition: z.string().min(1),
  highYield: z.boolean(),
});

export const TermGroupSchema = z.object({
  theme: z.string().min(1),
  terms: z.array(TermSchema).min(1),
});

export const FlashcardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
});

export const QuizQuestionSchema = z
  .object({
    question: z.string().min(1),
    choices: z.array(z.string().min(1)).length(4),
    answerIndex: z.number().int().min(0).max(3),
    explanation: z.string().min(1),
  });

export const StudyDaySchema = z.object({
  label: z.string().min(1), // e.g. "Tuesday" or "Day 1"
  tasks: z.array(z.string().min(1)).min(1),
});

export const TrapSchema = z.object({
  trap: z.string().min(1),
  fix: z.string().min(1),
});

export const WebSourceSchema = z.object({
  title: z.string().min(1),
  url: z.url({ protocol: /^https?$/ }),
});

export const StudyGuideSchema = z.object({
  title: z.string().min(1),
  overview: z.string().min(1),
  termGroups: z.array(TermGroupSchema).min(1),
  flashcards: z.array(FlashcardSchema).min(4),
  quiz: z.array(QuizQuestionSchema).min(8).max(10),
  studyPlan: z.object({
    testDate: z.string().nullable(),
    days: z.array(StudyDaySchema).min(1),
  }),
  traps: z.array(TrapSchema).min(1),
  /** Websites used in research (not the configured books). */
  webSources: z.array(WebSourceSchema),
  usedStudentNotes: z.boolean(),
});

export type StudyGuide = z.infer<typeof StudyGuideSchema>;

/** One entry in the Sources section, built by the server. */
export interface BookAttribution {
  title: string;
  authors: string;
  publisher: string;
  licenseName: string;
  licenseUrl: string;
  freeUrl: string;
  notice?: string;
}

/** What the API route sends to the browser. */
export interface GuideResponse {
  guide: StudyGuide;
  className: string;
  books: BookAttribution[];
}

/** What the API route sends when something goes wrong. */
export interface GuideErrorResponse {
  error: string;
}
