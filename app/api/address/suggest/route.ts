import { NextResponse } from "next/server";
import { suggestAddresses } from "../../../lib/googleAddress";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = String(searchParams.get("q") || "").trim();
  const result = await suggestAddresses(q);
  if (!result.ok && result.reason === "missing_key") {
    return NextResponse.json(
      { success: false, error: "Google Maps is not configured for address lookup." },
      { status: 503 }
    );
  }
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.reason, suggestions: [] }, { status: 502 });
  }
  return NextResponse.json({ success: true, suggestions: result.suggestions });
}
