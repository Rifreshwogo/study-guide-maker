/** App-wide settings. Change these without touching other code. */
export const APP_CONFIG = {
  /** Claude model used to research and write guides. */
  model: "claude-sonnet-5-5",

  /** Longest study request a student can type. */
  maxTopicChars: 500,

  /** Note photos. */
  maxImages: 5,
  /** Longest side after resizing in the browser, in pixels (Claude reads up to 1568 at full detail). */
  imageMaxDimension: 1568,
  /**
   * Size cap per image after resizing (bytes). Vercel rejects request bodies over
   * 4.5 MB, so 5 photos × 600 KB (≈ 800 KB each as base64) keeps us under it.
   */
  maxImageBytes: 600_000,
  /** Largest request body the API route accepts. */
  maxRequestBytes: 4_400_000,

  /** Guides allowed per IP address per hour. */
  rateLimitPerHour: 5,
  /** Guides allowed for the whole app per day (a backstop for your API bill). */
  globalDailyLimit: 100,

  /** Web research limits per guide (each use costs money). */
  maxWebSearches: 3,
  maxWebFetches: 4,
  /** Approximate cap on how much of each fetched page is read. */
  maxFetchTokens: 8_000,
} as const;
