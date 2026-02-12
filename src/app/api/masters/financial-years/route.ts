import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const financialYears = await prisma.financialYear.findMany({
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json({ financialYears });
  } catch (error) {
    console.error("Error fetching financial years:", error);
    return NextResponse.json(
      { error: "Failed to fetch financial years" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.label || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: "Label, start date and end date are required" },
        { status: 400 }
      );
    }

    // If making this FY active, deactivate all others
    if (body.isActive) {
      await prisma.financialYear.updateMany({
        data: { isActive: false },
      });
    }

    const fy = await prisma.financialYear.create({
      data: {
        label: body.label,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        isActive: body.isActive ?? false,
      },
    });

    return NextResponse.json(fy, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Financial year label already exists" },
        { status: 400 }
      );
    }
    console.error("Error creating financial year:", error);
    return NextResponse.json(
      { error: "Failed to create financial year" },
      { status: 500 }
    );
  }
}
