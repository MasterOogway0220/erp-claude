import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function GET() {
  try {
    const { authorized, response } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const currencies = await prisma.currencyMaster.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    });

    return NextResponse.json({ currencies });
  } catch (error) {
    console.error("Error fetching currencies:", error);
    return NextResponse.json({ error: "Failed to fetch currencies" }, { status: 500 });
  }
}
