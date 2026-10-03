import { NextResponse } from "next/server";
import { confirmAddress } from "../../../lib/googleAddress";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { placeId?: string };
  const result = await confirmAddress(String(body.placeId || ""));
  if (!result.ok && result.reason === "missing_key") {
    return NextResponse.json(
      { success: false, error: "Google Maps is not configured for address lookup." },
      { status: 503 }
    );
  }
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.reason || "Could not confirm that address." }, { status: 502 });
  }
  return NextResponse.json({ success: true, address: result.address });
}
