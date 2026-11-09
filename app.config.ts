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

  /** Shown on the Privacy and Terms pages as the way to reach the site owner. Leave "" to hide. */
  contactEmail: "rielwogo@gmail.com",
  /** Date shown at the top of the Privacy and Terms pages. Update it when you change them. */
  policiesUpdated: "November 9, 2026",
  /** Youngest age that can use the site on their own. Under 13 brings extra US privacy rules (COPPA). */
  minimumAge: 13,
} as const;
