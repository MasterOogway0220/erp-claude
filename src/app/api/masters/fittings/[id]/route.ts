import { NextRequest, NextResponse } from "next/server";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response, companyId } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const { id } = await params;
    const fitting = await prisma.fittingMaster.findUnique({
      where: { id, ...companyFilter(companyId) },
    });

    if (!fitting) {
      return NextResponse.json({ error: "Fitting not found" }, { status: 404 });
    }

    return NextResponse.json(fitting);
  } catch (error) {
    console.error("Error fetching fitting:", error);
    return NextResponse.json(
      { error: "Failed to fetch fitting" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();

    // Auto-generate description if fields changed
    const autoDesc = [
      body.type, body.size, body.schedule, body.endType, body.rating, body.materialGrade, body.standard,
    ].filter(Boolean).join(" ");

    const fitting = await prisma.fittingMaster.update({
      where: { id, ...companyFilter(companyId) },
      data: {
        type: body.type ?? undefined,
        size: body.size ?? undefined,
        schedule: body.schedule !== undefined ? (body.schedule || null) : undefined,
        materialGrade: body.materialGrade ?? undefined,
        standard: body.standard !== undefined ? (body.standard || null) : undefined,
        endType: body.endType !== undefined ? (body.endType || null) : undefined,
        rating: body.rating !== undefined ? (body.rating || null) : undefined,
        description: body.description !== undefined ? body.description : autoDesc || undefined,
      },
    });

    await createAuditLog({
      tableName: "FittingMaster",
      recordId: id,
      action: "UPDATE",
      userId: session.user?.id,
      companyId,
    });

    return NextResponse.json(fitting);
  } catch (error) {
    console.error("Error updating fitting:", error);
    return NextResponse.json(
      { error: "Failed to update fitting" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("masters", "delete");
    if (!authorized) return response!;

    const { id } = await params;

    const fitting = await prisma.fittingMaster.findUnique({
      where: { id, ...companyFilter(companyId) },
      select: {
        type: true,
        size: true,
        _count: {
          select: {
            quotationItems: true,
            poItems: true,
            salesOrderItems: true,
          },
        },
      },
    });

    if (!fitting) {
      return NextResponse.json({ error: "Fitting not found" }, { status: 404 });
    }

    const totalLinked = fitting._count.quotationItems + fitting._count.poItems + fitting._count.salesOrderItems;
    if (totalLinked > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete fitting "${fitting.type} ${fitting.size}". It is used in ${totalLinked} item(s).`,
        },
        { status: 400 }
      );
    }

    await prisma.fittingMaster.delete({ where: { id, ...companyFilter(companyId) } });

    await createAuditLog({
      tableName: "FittingMaster",
      recordId: id,
      action: "DELETE",
      userId: session.user?.id,
      companyId,
    });

    return NextResponse.json({ message: "Fitting deleted successfully" });
  } catch (error) {
    console.error("Error deleting fitting:", error);
    return NextResponse.json(
      { error: "Failed to delete fitting" },
      { status: 500 }
    );
  }
}
