import { NextRequest, NextResponse } from "next/server";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response, companyId } = await checkAccess("quotation", "read");
    if (!authorized) return response!;

    const emailLogs = await prisma.quotationEmailLog.findMany({
      where: { quotationId: id, quotation: { ...companyFilter(companyId) } },
      include: {
        sentBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { sentAt: "desc" },
    });

    return NextResponse.json({ emailLogs });
  } catch (error) {
    console.error("Error fetching email logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch email logs" },
      { status: 500 }
    );
  }
}
