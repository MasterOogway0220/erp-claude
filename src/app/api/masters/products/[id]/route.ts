import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { product, material, additionalSpec, ends, length } = body;

    const updated = await prisma.productSpecMaster.update({
      where: { id },
      data: {
        product,
        material: material || null,
        additionalSpec: additionalSpec || null,
        ends: ends || null,
        length: length || null,
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      tableName: "ProductSpecMaster",
      recordId: id,
      newValue: JSON.stringify({ product: updated.product }),
    }).catch(console.error);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response } = await checkAccess("masters", "delete");
    if (!authorized) return response!;

    const product = await prisma.productSpecMaster.findUnique({
      where: { id },
      select: { product: true, material: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await prisma.productSpecMaster.delete({
      where: { id },
    });

    createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      tableName: "ProductSpecMaster",
      recordId: id,
      oldValue: `${product.product} - ${product.material || ""}`,
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === "P2003") {
      return NextResponse.json(
        { error: "Cannot delete product. It is referenced by other records." },
        { status: 400 }
      );
    }
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
