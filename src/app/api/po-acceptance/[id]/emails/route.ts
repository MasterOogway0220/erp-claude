import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("poAcceptance", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const logs = await prisma.pOAcceptanceEmailLog.findMany({
      where: { poAcceptanceId: id },
      include: {
        sentBy: { select: { name: true } },
      },
      orderBy: { sentAt: "desc" },
    });

    return NextResponse.json(
      logs.map((log) => ({
        id: log.id,
        sentTo: log.sentTo,
        sentCc: log.sentCc,
        subject: log.subject,
        sentBy: log.sentBy?.name || null,
        sentAt: log.sentAt,
        status: log.status,
        errorMessage: log.errorMessage,
      }))
    );
  } catch (error) {
    console.error("Error fetching email logs:", error);
    return NextResponse.json({ error: "Failed to fetch email logs" }, { status: 500 });
  }
}
