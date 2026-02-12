import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
