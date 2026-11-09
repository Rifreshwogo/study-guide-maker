/**
 * Only accept JSON requests from this app's own pages. This stops other websites
 * from using the API (and your bill or your Mac) from their visitors' browsers.
 */
export function fromThisSite(req: Request, { requireJson = true } = {}): boolean {
  if (requireJson) {
    const type = req.headers.get("content-type") ?? "";
    if (!type.toLowerCase().startsWith("application/json")) return false;
  }
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin requests may omit it
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}
