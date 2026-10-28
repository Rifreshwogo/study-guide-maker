/**
 * sources.config.ts — every class, book, license, and source rule lives here.
 *
 * ─── LICENSE WARNING: THIS APP MUST STAY FREE ───────────────────────────────
 * Most books below are NonCommercial (CC BY-NC / CC BY-NC-SA), and OpenStax
 * content is only allowed in AI products with OpenStax's permission.
 * Charging money for this app (subscriptions, ads behind a paywall, paid tiers)
 * would require removing EVERY NonCommercial source and EVERY OpenStax source
 * first. The only book here that allows commercial use is The American Yawp
 * (CC BY-SA 4.0). Public-domain Project Gutenberg texts are also fine.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * HOW TO APPROVE AN OPENSTAX BOOK
 * Find the book in BOOKS below and change `status: "pending"` to
 * `status: "approved"`. Nothing else needs to change: the app will start
 * fetching it for its classes, stop blocking openstax.org for that class,
 * and add OpenStax's attribution to every guide that uses it.
 */

export type SourceStatus = "approved" | "pending";

export interface License {
  name: string; // e.g. "CC BY-NC 4.0"
  url: string; // link to the license deed
}

export interface Book {
  id: string;
  title: string;
  authors: string; // author(s) and/or publisher, as shown in attribution
  publisher: string;
  license: License;
  /** Link to the free online version, shown in attribution. */
  freeUrl: string;
  status: SourceStatus;
  /** True for OpenStax books. Controls the OpenStax attribution line and blocking. */
  isOpenStax: boolean;
  /**
   * Where the AI may fetch this book from. `startUrl` is the table of contents
   * the AI is given; `fetchHosts` are the hostnames web fetch may reach.
   * `urlPrefixes` lists the exact book paths: the server checks every fetched URL
   * against these, so a shared host (like a LibreTexts subdomain) can't be used
   * to reach a different book.
   */
  startUrl: string;
  fetchHosts: string[];
  urlPrefixes: string[];
  /** Extra attribution text required by the publisher (shown under the book). */
  requiredNotice?: string;
  /**
   * Optional: how the server builds a chapter/section list for this book, so the
   * AI can open matching sections directly instead of reading the whole contents
   * page. `depth: 2` = the index page lists chapters and each chapter page lists
   * sections (LibreTexts). `linkPrefix` limits which links count. Leave this out
   * if the site blocks automated downloads; the AI then opens `startUrl` itself.
   */
  index?: { url: string; depth: 1 | 2; linkPrefix: string };
}

export interface ClassConfig {
  id: string;
  name: string;
  /** Book ids, main reference first. */
  bookIds: string[];
  /** Topics the books don't cover, which must come from web research + notes. */
  knownGaps?: string;
  /** Extra guidance for web research for this class. */
  researchNotes?: string;
  /** Sites to prefer in web research (a hint in the prompt, not a hard filter). */
  preferredSites: string[];
}

// ─── Licenses ────────────────────────────────────────────────────────────────

const CC_BY_4 = { name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" };
const CC_BY_SA_4 = { name: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" };
const CC_BY_NC_4 = { name: "CC BY-NC 4.0", url: "https://creativecommons.org/licenses/by-nc/4.0/" };
const CC_BY_NC_SA_4 = { name: "CC BY-NC-SA 4.0", url: "https://creativecommons.org/licenses/by-nc-sa/4.0/" };
const PUBLIC_DOMAIN = { name: "Public domain (US)", url: "https://www.gutenberg.org/policy/license.html" };

const OPENSTAX_NOTICE =
  "Access for free at openstax.org. OpenStax is a part of Rice University. " +
  "Content used with permission.";

// ─── Books ───────────────────────────────────────────────────────────────────

export const BOOKS: Record<string, Book> = {
  // ── Approved open textbooks ──
  "american-yawp": {
    id: "american-yawp",
    title: "The American Yawp",
    authors: "Joseph Locke and Ben Wright, eds.",
    publisher: "Stanford University Press / americanyawp.com",
    license: CC_BY_SA_4,
    freeUrl: "https://www.americanyawp.com/",
    status: "approved",
    isOpenStax: false,
    startUrl: "https://www.americanyawp.com/",
    fetchHosts: ["www.americanyawp.com", "americanyawp.com"],
    urlPrefixes: ["https://www.americanyawp.com/", "https://americanyawp.com/"],
    index: { url: "https://www.americanyawp.com/", depth: 1, linkPrefix: "https://www.americanyawp.com/text/" },
  },
  "personal-finance-coastline": {
    id: "personal-finance-coastline",
    title: "Personal Finance v2",
    authors: "Guy Buker, Jerrie Muir, and Erin Thomas (based on work by Rachel S. Siegel and Carol Yacht)",
    publisher: "Coastline College / LibreTexts",
    license: CC_BY_NC_SA_4,
    freeUrl: "https://biz.libretexts.org/Courses/Coastline_College/Personal_Finance_v2",
    status: "approved",
    isOpenStax: false,
    startUrl: "https://biz.libretexts.org/Courses/Coastline_College/Personal_Finance_v2",
    fetchHosts: ["biz.libretexts.org"],
    urlPrefixes: ["https://biz.libretexts.org/Courses/Coastline_College/Personal_Finance_v2"],
    index: {
      url: "https://biz.libretexts.org/Courses/Coastline_College/Personal_Finance_v2",
      depth: 2,
      linkPrefix: "https://biz.libretexts.org/Courses/Coastline_College/Personal_Finance_v2",
    },
  },
  "personal-finance-tulsa": {
    id: "personal-finance-tulsa",
    title: "Fundamentals of Personal Finance",
    authors: "Travis White, ed.",
    publisher: "Tulsa Community College",
    license: CC_BY_NC_SA_4,
    freeUrl: "https://open.ocolearnok.org/personalfinance/",
    status: "approved",
    isOpenStax: false,
    startUrl: "https://open.ocolearnok.org/personalfinance/",
    fetchHosts: ["open.ocolearnok.org"],
    urlPrefixes: ["https://open.ocolearnok.org/personalfinance/"],
    // No `index`: this site blocks automated downloads, so the AI opens startUrl itself.
  },
  "comparative-government": {
    id: "comparative-government",
    title: "Introduction to Comparative Government and Politics",
    authors: "Dino Bozonelos, Julia Wendt, Charlotte Lee, et al.",
    publisher: "ASCCC OERI / LibreTexts",
    license: CC_BY_NC_4,
    freeUrl:
      "https://socialsci.libretexts.org/Bookshelves/Political_Science_and_Civics/Introduction_to_Comparative_Government_and_Politics_(Bozonelos_et_al.)",
    status: "approved",
    isOpenStax: false,
    startUrl:
      "https://socialsci.libretexts.org/Bookshelves/Political_Science_and_Civics/Introduction_to_Comparative_Government_and_Politics_(Bozonelos_et_al.)",
    fetchHosts: ["socialsci.libretexts.org"],
    urlPrefixes: [
      "https://socialsci.libretexts.org/Bookshelves/Political_Science_and_Civics/Introduction_to_Comparative_Government_and_Politics_(Bozonelos_et_al.)",
    ],
    index: {
      url: "https://socialsci.libretexts.org/Bookshelves/Political_Science_and_Civics/Introduction_to_Comparative_Government_and_Politics_(Bozonelos_et_al.)",
      depth: 2,
      linkPrefix:
        "https://socialsci.libretexts.org/Bookshelves/Political_Science_and_Civics/Introduction_to_Comparative_Government_and_Politics_(Bozonelos_et_al.)",
    },
  },
  "writing-through-literature": {
    id: "writing-through-literature",
    title: "Writing and Critical Thinking Through Literature",
    authors: "Heather Ringo and Athena Kashyap",
    publisher: "City College of San Francisco / ASCCC OERI / LibreTexts",
    license: CC_BY_NC_4,
    freeUrl:
      "https://human.libretexts.org/Bookshelves/Literature_and_Literacy/Literacy_and_Critical_Thinking/Writing_and_Critical_Thinking_Through_Literature_(Ringo_and_Kashyap)",
    status: "approved",
    isOpenStax: false,
    startUrl:
      "https://human.libretexts.org/Bookshelves/Literature_and_Literacy/Literacy_and_Critical_Thinking/Writing_and_Critical_Thinking_Through_Literature_(Ringo_and_Kashyap)",
    fetchHosts: ["human.libretexts.org"],
    urlPrefixes: [
      "https://human.libretexts.org/Bookshelves/Literature_and_Literacy/Literacy_and_Critical_Thinking/Writing_and_Critical_Thinking_Through_Literature_(Ringo_and_Kashyap)",
    ],
    index: {
      url: "https://human.libretexts.org/Bookshelves/Literature_and_Literacy/Literacy_and_Critical_Thinking/Writing_and_Critical_Thinking_Through_Literature_(Ringo_and_Kashyap)",
      depth: 2,
      linkPrefix:
        "https://human.libretexts.org/Bookshelves/Literature_and_Literacy/Literacy_and_Critical_Thinking/Writing_and_Critical_Thinking_Through_Literature_(Ringo_and_Kashyap)",
    },
  },
  "project-gutenberg": {
    id: "project-gutenberg",
    title: "Project Gutenberg (public-domain literary texts)",
    authors: "Various authors",
    publisher: "Project Gutenberg",
    license: PUBLIC_DOMAIN,
    freeUrl: "https://www.gutenberg.org/",
    status: "approved",
    isOpenStax: false,
    startUrl: "https://www.gutenberg.org/",
    fetchHosts: ["www.gutenberg.org", "gutenberg.org"],
    urlPrefixes: ["https://www.gutenberg.org/", "https://gutenberg.org/"],
  },

  // ── OpenStax: PENDING PERMISSION. Do not flip to "approved" until OpenStax says yes. ──
  // Licenses below are from OpenStax's book pages; re-check them when approval arrives.
  "openstax-anatomy-2e": {
    id: "openstax-anatomy-2e",
    title: "Anatomy and Physiology 2e",
    authors: "J. Gordon Betts et al.",
    publisher: "OpenStax (Rice University)",
    license: CC_BY_4,
    freeUrl: "https://openstax.org/details/books/anatomy-and-physiology-2e",
    status: "pending",
    isOpenStax: true,
    startUrl: "https://openstax.org/books/anatomy-and-physiology-2e/pages/1-introduction",
    fetchHosts: ["openstax.org"],
    urlPrefixes: ["https://openstax.org/books/anatomy-and-physiology-2e/"],
    requiredNotice: OPENSTAX_NOTICE,
  },
  "openstax-calculus-1": {
    id: "openstax-calculus-1",
    title: "Calculus Volume 1",
    authors: "Gilbert Strang, Edwin “Jed” Herman, et al.",
    publisher: "OpenStax (Rice University)",
    license: CC_BY_NC_SA_4,
    freeUrl: "https://openstax.org/details/books/calculus-volume-1",
    status: "pending",
    isOpenStax: true,
    startUrl: "https://openstax.org/books/calculus-volume-1/pages/1-introduction",
    fetchHosts: ["openstax.org"],
    urlPrefixes: ["https://openstax.org/books/calculus-volume-1/"],
    requiredNotice: OPENSTAX_NOTICE,
  },
  "openstax-sociology-3e": {
    id: "openstax-sociology-3e",
    title: "Introduction to Sociology 3e",
    authors: "Tonja R. Conerly, Kathleen Holmes, Asha Lal Tamang, et al.",
    publisher: "OpenStax (Rice University)",
    license: CC_BY_4,
    freeUrl: "https://openstax.org/details/books/introduction-sociology-3e",
    status: "pending",
    isOpenStax: true,
    startUrl: "https://openstax.org/books/introduction-sociology-3e/pages/1-introduction",
    fetchHosts: ["openstax.org"],
    urlPrefixes: ["https://openstax.org/books/introduction-sociology-3e/"],
    requiredNotice: OPENSTAX_NOTICE,
  },
  "openstax-anthropology": {
    id: "openstax-anthropology",
    title: "Introduction to Anthropology",
    authors: "Jennifer Hasty, David G. Lewis, Marjorie M. Snipes, et al.",
    publisher: "OpenStax (Rice University)",
    license: CC_BY_4,
    freeUrl: "https://openstax.org/details/books/introduction-anthropology",
    status: "pending",
    isOpenStax: true,
    startUrl: "https://openstax.org/books/introduction-anthropology/pages/1-introduction",
    fetchHosts: ["openstax.org"],
    urlPrefixes: ["https://openstax.org/books/introduction-anthropology/"],
    requiredNotice: OPENSTAX_NOTICE,
  },
  "openstax-political-science": {
    id: "openstax-political-science",
    title: "Introduction to Political Science",
    authors: "Mark Carl Rom, Masaki Hidaka, Rachel Bzostek Walker, et al.",
    publisher: "OpenStax (Rice University)",
    license: CC_BY_4,
    freeUrl: "https://openstax.org/details/books/introduction-political-science",
    status: "pending",
    isOpenStax: true,
    startUrl: "https://openstax.org/books/introduction-political-science/pages/1-introduction",
    fetchHosts: ["openstax.org"],
    urlPrefixes: ["https://openstax.org/books/introduction-political-science/"],
    requiredNotice: OPENSTAX_NOTICE,
  },
};

// ─── Classes ─────────────────────────────────────────────────────────────────

export const CLASSES: ClassConfig[] = [
  {
    id: "ib-history-americas",
    name: "IB HL History of the Americas",
    bookIds: ["american-yawp"],
    knownGaps:
      "The American Yawp covers the United States only. Latin America and Canada " +
      "topics must come from web research and the student's notes.",
    preferredSites: ["loc.gov", "archives.gov", "canada.ca", "thecanadianencyclopedia.ca", "ibo.org", "khanacademy.org"],
  },
  {
    id: "personal-finance",
    name: "Personal Finance",
    bookIds: ["personal-finance-coastline", "personal-finance-tulsa"],
    preferredSites: ["consumerfinance.gov", "investor.gov", "irs.gov", "fdic.gov", "khanacademy.org"],
  },
  {
    id: "ib-government",
    name: "IB Government",
    bookIds: ["comparative-government", "openstax-political-science"],
    preferredSites: ["ibo.org", "congress.gov", "usa.gov", "khanacademy.org"],
  },
  {
    id: "ib-english-hl",
    name: "IB HL English",
    bookIds: ["writing-through-literature", "project-gutenberg"],
    researchNotes:
      "For works still under copyright, discuss themes and techniques in your own words. " +
      "Never quote more than a short line from a copyrighted text.",
    preferredSites: ["ibo.org", "poetryfoundation.org", "loc.gov"],
  },
  {
    id: "honors-anatomy",
    name: "Honors Anatomy & Physiology",
    bookIds: ["openstax-anatomy-2e"],
    preferredSites: ["ncbi.nlm.nih.gov", "nih.gov", "medlineplus.gov", "cancer.gov", "khanacademy.org"],
  },
  {
    id: "ap-calculus-ab",
    name: "AP Calculus AB",
    bookIds: ["openstax-calculus-1"],
    researchNotes:
      "Align topics, unit names, and skills to the College Board's public AP Calculus AB " +
      "Course and Exam Description. Make one of your searches find it on " +
      "apcentral.collegeboard.org so the guide can name the matching unit and topic.",
    preferredSites: ["apcentral.collegeboard.org", "collegeboard.org", "khanacademy.org", "tutorial.math.lamar.edu", "math.mit.edu"],
  },
  {
    id: "sociology-anthropology",
    name: "Sociology / Anthropology",
    bookIds: ["openstax-sociology-3e", "openstax-anthropology"],
    preferredSites: ["asanet.org", "americananthro.org", "census.gov", "pewresearch.org", "khanacademy.org"],
  },
];

// ─── Blocking for pending OpenStax books ─────────────────────────────────────

/**
 * Sites blocked from web search for any class that has a PENDING OpenStax book.
 * These host OpenStax books or copies/adaptations of them. LibreTexts is blocked
 * in search because it hosts many OpenStax remixes; approved LibreTexts books
 * are still reached through web fetch, limited to their own paths.
 */
export const OPENSTAX_MIRROR_DOMAINS = [
  "openstax.org",
  "cnx.org",
  "libretexts.org",
  "courses.lumenlearning.com",
  "lumenlearning.com",
  "opentextbc.ca",
  "pressbooks.pub",
  "pressbooks.bccampus.ca",
  "open.oregonstate.education",
  "oercommons.org",
  "coursehero.com",
  "studocu.com",
  "quizlet.com",
  "scribd.com",
];

/** Text that marks a URL as a likely OpenStax copy, wherever it's hosted. */
export const OPENSTAX_URL_MARKERS = ["openstax", "cnx.org"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getClass(id: string): ClassConfig | undefined {
  return CLASSES.find((c) => c.id === id);
}

export function booksForClass(cls: ClassConfig): Book[] {
  return cls.bookIds.map((id) => {
    const book = BOOKS[id];
    if (!book) throw new Error(`sources.config: class "${cls.id}" lists unknown book "${id}"`);
    return book;
  });
}

/** Books the AI may use for this class right now. */
export function approvedBooks(cls: ClassConfig): Book[] {
  return booksForClass(cls).filter((b) => b.status === "approved");
}

/** Pending books for this class (the AI must not touch these). */
export function pendingBooks(cls: ClassConfig): Book[] {
  return booksForClass(cls).filter((b) => b.status === "pending");
}

/**
 * Web SEARCH always blocks OpenStax and its mirrors, in every class. OpenStax's
 * AI restriction covers all of its books, not just the ones listed here. An
 * approved OpenStax book is still used: it's reached through web FETCH,
 * limited to that book's own pages (see Book.urlPrefixes).
 */
export function searchBlockedDomains(): string[] {
  return [...OPENSTAX_MIRROR_DOMAINS];
}

/** URL prefixes of every pending book, which the server rejects if fetched. */
export function pendingUrlPrefixes(): string[] {
  return Object.values(BOOKS)
    .filter((b) => b.status === "pending")
    .flatMap((b) => b.urlPrefixes);
}
