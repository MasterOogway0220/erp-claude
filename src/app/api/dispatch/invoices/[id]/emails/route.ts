import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response } = await checkAccess("invoice", "read");
    if (!authorized) return response!;

    const emailLogs = await prisma.invoiceEmailLog.findMany({
      where: { invoiceId: id },
      include: {
        sentBy: { select: { name: true, email: true } },
      },
      orderBy: { sentAt: "desc" },
    });

    return NextResponse.json({ emailLogs });
  } catch (error: any) {
    console.error("Error fetching invoice email logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch email logs" },
      { status: 500 }
    );
  }
}
