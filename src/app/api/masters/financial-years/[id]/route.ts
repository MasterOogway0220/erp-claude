import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const financialYear = await prisma.financialYear.findUnique({
      where: { id },
    });

    if (!financialYear) {
      return NextResponse.json(
        { error: "Financial year not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(financialYear);
  } catch (error) {
    console.error("Error fetching financial year:", error);
    return NextResponse.json(
      { error: "Failed to fetch financial year" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // If making this FY active, deactivate all others first
    if (body.isActive === true) {
      await prisma.financialYear.updateMany({
        data: { isActive: false },
      });
    }

    const financialYear = await prisma.financialYear.update({
      where: { id },
      data: {
        label: body.label ?? undefined,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        isActive: body.isActive ?? undefined,
      },
    });

    return NextResponse.json(financialYear);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Financial year label already exists" },
        { status: 400 }
      );
    }
    console.error("Error updating financial year:", error);
    return NextResponse.json(
      { error: "Failed to update financial year" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.financialYear.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Financial year deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting financial year:", error);
    return NextResponse.json(
      { error: "Failed to delete financial year" },
      { status: 500 }
    );
  }
}
