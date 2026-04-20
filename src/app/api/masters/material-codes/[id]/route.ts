import { NextRequest, NextResponse } from "next/server";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { softDeleteData } from "@/lib/soft-delete";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response, companyId } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const materialCode = await prisma.materialCodeMaster.findFirst({
      where: { id },
    });

    if (!materialCode) {
      return NextResponse.json(
        { error: "Material code not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(materialCode);
  } catch (error) {
    console.error("Error fetching material code:", error);
    return NextResponse.json(
      { error: "Failed to fetch material code" },
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

    const materialCode = await prisma.materialCodeMaster.update({
      where: { id },
      data: {
        code: body.code ?? undefined,
        clientItemCode: body.clientItemCode ?? undefined,
        description: body.description ?? undefined,
        productType: body.productType ?? undefined,
        materialGrade: body.materialGrade ?? undefined,
        size: body.size ?? undefined,
        odSize: body.odSize ?? undefined,
        nbSize: body.nbSize ?? undefined,
        thickness: body.thickness ?? undefined,
        schedule: body.schedule ?? undefined,
        standard: body.standard ?? undefined,
        unit: body.unit ?? undefined,
        rate: body.rate !== undefined ? (body.rate ? parseFloat(body.rate) : null) : undefined,
      },
    });

    await createAuditLog({
      tableName: "MaterialCodeMaster",
      recordId: id,
      action: "UPDATE",
      userId: session.user?.id,
      companyId,
    });

    return NextResponse.json(materialCode);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Item code already exists" },
        { status: 400 }
      );
    }
    console.error("Error updating material code:", error);
    return NextResponse.json(
      { error: "Failed to update material code" },
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

    const materialCode = await prisma.materialCodeMaster.findUnique({
      where: { id },
      select: {
        code: true,
        _count: { select: { quotationItems: true } },
      },
    });

    if (!materialCode) {
      return NextResponse.json({ error: "Material code not found" }, { status: 404 });
    }

    if (materialCode._count.quotationItems > 0) {
      await prisma.quotationItem.updateMany({
        where: { materialCodeId: id },
        data: { materialCodeId: null },
      });
    }

    await prisma.materialCodeMaster.update({ where: { id }, data: softDeleteData() });

    await createAuditLog({
      tableName: "MaterialCodeMaster",
      recordId: id,
      action: "DELETE",
      userId: session.user?.id,
      companyId,
    });

    return NextResponse.json({
      message: "Material code deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting material code:", error);
    return NextResponse.json(
      { error: "Failed to delete material code" },
      { status: 500 }
    );
  }
}
