import type { Book } from "@/sources.config";
import type { BookAttribution } from "@/lib/schema";

/** An error with a message that's safe and friendly to show a student. */
export class GenerationError extends Error {
  constructor(
    public userMessage: string,
    public status = 500,
    detail?: string,
  ) {
    super(detail ?? userMessage);
  }
}

/** The attribution line a guide shows for a book it used. */
export function attribution(book: Book): BookAttribution {
  return {
    title: book.title,
    authors: book.authors,
    publisher: book.publisher,
    licenseName: book.license.name,
    licenseUrl: book.license.url,
    freeUrl: book.freeUrl,
    notice: book.requiredNotice,
  };
}
