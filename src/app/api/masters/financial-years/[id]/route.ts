import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("masters", "read");
    if (!authorized) return response!;

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
    const { authorized, session, response } = await checkAccess("masters", "write");
    if (!authorized) return response!;

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

    await createAuditLog({
      tableName: "FinancialYear",
      recordId: id,
      action: "UPDATE",
      userId: session.user?.id,
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
    const { authorized, session, response } = await checkAccess("masters", "delete");
    if (!authorized) return response!;

    const { id } = await params;

    const fy = await prisma.financialYear.findUnique({
      where: { id },
      select: { label: true, isActive: true },
    });

    if (!fy) {
      return NextResponse.json({ error: "Financial year not found" }, { status: 404 });
    }

    if (fy.isActive) {
      return NextResponse.json(
        { error: `Cannot delete active financial year "${fy.label}". Deactivate it first.` },
        { status: 400 }
      );
    }

    await prisma.financialYear.delete({ where: { id } });

    await createAuditLog({
      tableName: "FinancialYear",
      recordId: id,
      action: "DELETE",
      userId: session.user?.id,
    });

    return NextResponse.json({
      message: "Financial year deleted successfully",
    });
  } catch (error: any) {
    if (error?.code === "P2003") {
      return NextResponse.json(
        { error: "Cannot delete financial year. It is referenced by other records." },
        { status: 400 }
      );
    }
    console.error("Error deleting financial year:", error);
    return NextResponse.json(
      { error: "Failed to delete financial year" },
      { status: 500 }
    );
  }
}
