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

    const materialCode = await prisma.materialCodeMaster.findUnique({
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
    const { authorized, session, response } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();

    const materialCode = await prisma.materialCodeMaster.update({
      where: { id },
      data: {
        code: body.code ?? undefined,
        description: body.description ?? undefined,
        productType: body.productType ?? undefined,
        materialGrade: body.materialGrade ?? undefined,
        size: body.size ?? undefined,
        schedule: body.schedule ?? undefined,
      },
    });

    await createAuditLog({
      tableName: "MaterialCodeMaster",
      recordId: id,
      action: "UPDATE",
      userId: session.user?.id,
    });

    return NextResponse.json(materialCode);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Material code already exists" },
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
    const { authorized, session, response } = await checkAccess("masters", "delete");
    if (!authorized) return response!;

    const { id } = await params;

    await prisma.materialCodeMaster.delete({
      where: { id },
    });

    await createAuditLog({
      tableName: "MaterialCodeMaster",
      recordId: id,
      action: "DELETE",
      userId: session.user?.id,
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
