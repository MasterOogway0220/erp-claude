import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response, companyId } = await checkAccess("labLetter", "read");
    if (!authorized) return response!;

    const labLetter = await prisma.labLetter.findFirst({
      where: { id, ...companyFilter(companyId) },
      include: {
        generatedBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!labLetter) {
      return NextResponse.json(
        { error: "Lab letter not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ labLetter });
  } catch (error) {
    console.error("Error fetching lab letter:", error);
    return NextResponse.json(
      { error: "Failed to fetch lab letter" },
      { status: 500 }
    );
  }
}
