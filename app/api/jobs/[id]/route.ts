import { NextResponse } from "next/server";
import { viewJob } from "@/lib/jobs";
import { fromThisSite } from "@/lib/sameSite";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Progress for one study guide request: place in line, who's working, then the guide. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!fromThisSite(req, { requireJson: false })) return NextResponse.json({ error: "This request isn't allowed." }, { status: 403 });
  const { id } = await params;
  const view = UUID.test(id) ? viewJob(id) : null;
  if (!view) {
    return NextResponse.json(
      { error: "We couldn't find that request. It may have expired, so please make the guide again." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(view, { headers: { "Cache-Control": "no-store" } });
}
