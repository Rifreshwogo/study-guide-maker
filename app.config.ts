/** App-wide settings. Change these without touching other code. */
export const APP_CONFIG = {

  /** Longest study request a student can type. */
  maxTopicChars: 500,

  /** Note photos. */
  maxImages: 5,
  /** Longest side after resizing in the browser, in pixels (Claude reads up to 1568 at full detail). */
  imageMaxDimension: 1568,
  /**
   * Size cap per image after resizing (bytes). 5 photos × 600 KB keeps a request
   * under ~4.4 MB, which keeps uploads quick for students on phones.
   */
  maxImageBytes: 600_000,
  /** Largest request body the API route accepts. */
  maxRequestBytes: 4_400_000,

  /** Guides allowed per IP address per hour. */
  rateLimitPerHour: 5,
  /** Guides allowed for the whole site per day (keeps your Mac from running nonstop). */
  globalDailyLimit: 100,
} as const;
