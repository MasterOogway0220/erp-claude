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

    const size = await prisma.sizeMaster.findUnique({
      where: { id, ...companyFilter(companyId) },
    });

    if (!size) {
      return NextResponse.json(
        { error: "Size not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(size);
  } catch (error) {
    console.error("Error fetching size:", error);
    return NextResponse.json(
      { error: "Failed to fetch size" },
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

    const size = await prisma.sizeMaster.update({
      where: { id, ...companyFilter(companyId) },
      data: {
        sizeLabel: body.sizeLabel ?? undefined,
        od: body.od != null ? parseFloat(body.od) : undefined,
        wt: body.wt != null ? parseFloat(body.wt) : undefined,
        weight: body.weight != null ? parseFloat(body.weight) : undefined,
        pipeType: body.pipeType ?? undefined,
        nps: body.nps != null ? parseFloat(body.nps) : undefined,
        schedule: body.schedule ?? undefined,
      },
    });

    await createAuditLog({
      tableName: "SizeMaster",
      recordId: id,
      action: "UPDATE",
      userId: session.user?.id,
      companyId,
    });

    return NextResponse.json(size);
  } catch (error) {
    console.error("Error updating size:", error);
    return NextResponse.json(
      { error: "Failed to update size" },
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

    const size = await prisma.sizeMaster.findUnique({
      where: { id, ...companyFilter(companyId) },
      select: {
        sizeLabel: true,
        _count: { select: { quotationItems: true } },
      },
    });

    if (!size) {
      return NextResponse.json({ error: "Size not found" }, { status: 404 });
    }

    if (size._count.quotationItems > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete size "${size.sizeLabel}". It is used in ${size._count.quotationItems} quotation item(s).`,
        },
        { status: 400 }
      );
    }

    await prisma.sizeMaster.delete({ where: { id, ...companyFilter(companyId) } });

    await createAuditLog({
      tableName: "SizeMaster",
      recordId: id,
      action: "DELETE",
      userId: session.user?.id,
      companyId,
    });

    return NextResponse.json({ message: "Size deleted successfully" });
  } catch (error) {
    console.error("Error deleting size:", error);
    return NextResponse.json(
      { error: "Failed to delete size" },
      { status: 500 }
    );
  }
}
