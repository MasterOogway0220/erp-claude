import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const tests = await prisma.testingMaster.findMany({
      orderBy: { testName: "asc" },
    });

    return NextResponse.json({
      tests,
      testingMasters: tests,
      count: tests.length,
    });
  } catch (error) {
    console.error("Error fetching testing masters:", error);
    return NextResponse.json(
      { error: "Failed to fetch testing masters" },
      { status: 500 }
    );
  }
}
