import { NextRequest, NextResponse } from "next/server";
import { getRate } from "@/lib/fx/get-rate";

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from") as "USD" | "INR" | null;
  const to = req.nextUrl.searchParams.get("to") as "USD" | "INR" | null;
  if (!from || !to) return NextResponse.json({ error: "from, to required" }, { status: 400 });
  const result = await getRate(from, to);
  if (!result) return NextResponse.json({ error: "rate unavailable" }, { status: 503 });
  return NextResponse.json(result);
}
