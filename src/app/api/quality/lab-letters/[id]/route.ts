import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const labLetter = await prisma.labLetter.findUnique({
      where: { id },
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
