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

    const pipeSize = await prisma.pipeSizeMaster.findUnique({
      where: { id },
    });

    if (!pipeSize) {
      return NextResponse.json(
        { error: "Pipe size not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(pipeSize);
  } catch (error) {
    console.error("Error fetching pipe size:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipe size" },
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

    const pipeSize = await prisma.pipeSizeMaster.update({
      where: { id },
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
      tableName: "PipeSizeMaster",
      recordId: id,
      action: "UPDATE",
      userId: session.user?.id,
    });

    return NextResponse.json(pipeSize);
  } catch (error) {
    console.error("Error updating pipe size:", error);
    return NextResponse.json(
      { error: "Failed to update pipe size" },
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

    const pipeSize = await prisma.pipeSizeMaster.findUnique({
      where: { id },
      select: {
        sizeLabel: true,
        _count: { select: { quotationItems: true } },
      },
    });

    if (!pipeSize) {
      return NextResponse.json({ error: "Pipe size not found" }, { status: 404 });
    }

    if (pipeSize._count.quotationItems > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete pipe size "${pipeSize.sizeLabel}". It is used in ${pipeSize._count.quotationItems} quotation item(s).`,
        },
        { status: 400 }
      );
    }

    await prisma.pipeSizeMaster.delete({ where: { id } });

    await createAuditLog({
      tableName: "PipeSizeMaster",
      recordId: id,
      action: "DELETE",
      userId: session.user?.id,
    });

    return NextResponse.json({ message: "Pipe size deleted successfully" });
  } catch (error) {
    console.error("Error deleting pipe size:", error);
    return NextResponse.json(
      { error: "Failed to delete pipe size" },
      { status: 500 }
    );
  }
}
