import { NextRequest, NextResponse } from "next/server";
import City from "country-state-city/lib/city";
import { checkAuth } from "@/lib/rbac";

/**
 * GET /api/geo/cities?country=AE&state=DU
 * Cities of one state for the international address picker. The world city
 * list is 8 MB of JSON; served from here it stays out of the browser bundle.
 */
export async function GET(request: NextRequest) {
  const { authorized, response } = await checkAuth();
  if (!authorized) return response!;

  const country = request.nextUrl.searchParams.get("country") ?? "";
  const state = request.nextUrl.searchParams.get("state") ?? "";
  if (!/^[A-Z]{2}$/.test(country) || !/^[A-Za-z0-9-]{1,10}$/.test(state)) {
    return NextResponse.json({ error: "country and state codes are required" }, { status: 400 });
  }

  const cities = City.getCitiesOfState(country, state).map((c) => ({ name: c.name }));
  return NextResponse.json(cities, {
    // Static reference data: let the browser keep it for a day.
    headers: { "Cache-Control": "private, max-age=86400" },
  });
}
