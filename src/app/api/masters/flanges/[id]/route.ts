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
    const flange = await prisma.flangeMaster.findUnique({
      where: { id },
    });

    if (!flange) {
      return NextResponse.json({ error: "Flange not found" }, { status: 404 });
    }

    return NextResponse.json(flange);
  } catch (error) {
    console.error("Error fetching flange:", error);
    return NextResponse.json(
      { error: "Failed to fetch flange" },
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

    const autoDesc = [
      body.type, body.size, body.rating, body.facing, body.materialGrade, body.standard,
    ].filter(Boolean).join(" ");

    const flange = await prisma.flangeMaster.update({
      where: { id },
      data: {
        type: body.type ?? undefined,
        size: body.size ?? undefined,
        rating: body.rating ?? undefined,
        materialGrade: body.materialGrade ?? undefined,
        standard: body.standard !== undefined ? (body.standard || null) : undefined,
        facing: body.facing !== undefined ? (body.facing || null) : undefined,
        schedule: body.schedule !== undefined ? (body.schedule || null) : undefined,
        description: body.description !== undefined ? body.description : autoDesc || undefined,
      },
    });

    await createAuditLog({
      tableName: "FlangeMaster",
      recordId: id,
      action: "UPDATE",
      userId: session.user?.id,
    });

    return NextResponse.json(flange);
  } catch (error) {
    console.error("Error updating flange:", error);
    return NextResponse.json(
      { error: "Failed to update flange" },
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

    const flange = await prisma.flangeMaster.findUnique({
      where: { id },
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

    if (!flange) {
      return NextResponse.json({ error: "Flange not found" }, { status: 404 });
    }

    const totalLinked = flange._count.quotationItems + flange._count.poItems + flange._count.salesOrderItems;
    if (totalLinked > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete flange "${flange.type} ${flange.size}". It is used in ${totalLinked} item(s).`,
        },
        { status: 400 }
      );
    }

    await prisma.flangeMaster.delete({ where: { id } });

    await createAuditLog({
      tableName: "FlangeMaster",
      recordId: id,
      action: "DELETE",
      userId: session.user?.id,
    });

    return NextResponse.json({ message: "Flange deleted successfully" });
  } catch (error) {
    console.error("Error deleting flange:", error);
    return NextResponse.json(
      { error: "Failed to delete flange" },
      { status: 500 }
    );
  }
}
