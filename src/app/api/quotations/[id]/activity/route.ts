import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response } = await checkAccess("quotation", "read");
    if (!authorized) return response!;

    const activities = await prisma.auditLog.findMany({
      where: {
        tableName: "Quotation",
        recordId: id,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { timestamp: "desc" },
    });

    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Error fetching activity trail:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity trail" },
      { status: 500 }
    );
  }
}
