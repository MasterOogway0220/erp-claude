import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

function getCurrentFinancialYear(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const fyStartYear = month >= 4 ? year : year - 1;
  return (fyStartYear % 100).toString().padStart(2, "0");
}

export async function GET(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("labLetter", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where: any = {};

    if (search) {
      where.OR = [
        { letterNo: { contains: search } },
        { heatNo: { contains: search } },
        { specification: { contains: search } },
      ];
    }

    const labLetters = await prisma.labLetter.findMany({
      where,
      include: {
        generatedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { letterDate: "desc" },
    });

    return NextResponse.json({ labLetters });
  } catch (error) {
    console.error("Error fetching lab letters:", error);
    return NextResponse.json(
      { error: "Failed to fetch lab letters" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response } = await checkAccess("labLetter", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { heatNo, specification, sizeLabel, testIds } = body;

    if (!heatNo) {
      return NextResponse.json(
        { error: "Heat number is required" },
        { status: 400 }
      );
    }

    // Generate letterNo using counter pattern: LAB/FY/NNNNN
    const currentFY = getCurrentFinancialYear();

    const letterNo = await prisma.$transaction(async (tx) => {
      // Count existing lab letters for this financial year to determine next number
      const existingCount = await tx.labLetter.count({
        where: {
          letterNo: {
            startsWith: `LAB/${currentFY}/`,
          },
        },
      });

      const nextNumber = existingCount + 1;
      return `LAB/${currentFY}/${nextNumber.toString().padStart(5, "0")}`;
    });

    const labLetter = await prisma.labLetter.create({
      data: {
        letterNo,
        heatNo: heatNo || null,
        specification: specification || null,
        sizeLabel: sizeLabel || null,
        testIds: testIds || null,
        generatedById: session.user.id,
      },
      include: {
        generatedBy: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(labLetter, { status: 201 });
  } catch (error) {
    console.error("Error creating lab letter:", error);
    return NextResponse.json(
      { error: "Failed to create lab letter" },
      { status: 500 }
    );
  }
}
