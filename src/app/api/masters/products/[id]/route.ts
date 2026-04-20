import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { softDeleteData } from "@/lib/soft-delete";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response, companyId } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const product = await prisma.productSpecMaster.findFirst({
      where: { id, ...companyFilter(companyId) },
      include: { dimensionalStandard: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { product, category, specification, grade, material, additionalSpec, ends, length, dimensionalStandardId } = body;

    const updated = await prisma.productSpecMaster.update({
      where: { id, ...companyFilter(companyId) },
      data: {
        product,
        category: category !== undefined ? (category || null) : undefined,
        specification: specification !== undefined ? (specification || null) : undefined,
        grade: grade !== undefined ? (grade || null) : undefined,
        material: material !== undefined ? (material || null) : undefined,
        additionalSpec: additionalSpec !== undefined ? (additionalSpec || null) : undefined,
        ends: ends !== undefined ? (ends || null) : undefined,
        length: length !== undefined ? (length || null) : undefined,
        dimensionalStandardId: dimensionalStandardId !== undefined ? (dimensionalStandardId || null) : undefined,
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      tableName: "ProductSpecMaster",
      recordId: id,
      newValue: JSON.stringify({ product: updated.product }),
      companyId,
    }).catch(console.error);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response, companyId } = await checkAccess("masters", "delete");
    if (!authorized) return response!;

    const product = await prisma.productSpecMaster.findUnique({
      where: { id, ...companyFilter(companyId) },
      select: { product: true, material: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const [quotationItemCount, soItemCount, poItemCount] = await Promise.all([
      prisma.quotationItem.count({ where: { product: product.product } }),
      prisma.salesOrderItem.count({ where: { product: product.product } }),
      prisma.pOItem.count({ where: { product: product.product } }),
    ]);
    const linkedCount = quotationItemCount + soItemCount + poItemCount;
    if (linkedCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete product. It is referenced by ${linkedCount} line item(s) across quotations, sales orders, and purchase orders.` },
        { status: 400 }
      );
    }

    await prisma.productSpecMaster.update({ where: { id, ...companyFilter(companyId) }, data: softDeleteData() });

    createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      tableName: "ProductSpecMaster",
      recordId: id,
      oldValue: `${product.product} - ${product.material || ""}`,
      companyId,
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
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
