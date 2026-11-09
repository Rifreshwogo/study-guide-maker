import "server-only";

/**
 * Local mode settings (server only, so none of this reaches the browser).
 * Override in .env.local.
 */
export const LOCAL_CONFIG = {
  ollamaUrl: process.env.OLLAMA_URL ?? "http://127.0.0.1:11434",
  /**
   * Model for the whole team. Must accept images (for note photos). Use an
   * "instruct" (non-thinking) version: thinking versions reason at length before
   * every answer, which made each step take minutes.
   */
  model: process.env.LOCAL_MODEL ?? "qwen3-vl:8b-instruct",
  searxngUrl: process.env.SEARXNG_URL ?? "http://127.0.0.1:8888",
  /** Context window per request (tokens). Bigger = more source text, more memory. */
  contextTokens: 24_576,
  /** How much of each source page the team reads (characters). */
  maxPageChars: 7_000,
  maxSearchQueries: 3,
  maxWebPages: 4,
} as const;
