import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();

    const clientItem = await prisma.clientItemMaster.update({
      where: { id },
      data: {
        itemNo: body.itemNo !== undefined ? String(body.itemNo).trim() : undefined,
        description: body.description !== undefined ? body.description?.trim() || null : undefined,
        unit: body.unit !== undefined ? body.unit || null : undefined,
      },
    });

    await createAuditLog({
      tableName: "ClientItemMaster",
      recordId: id,
      action: "UPDATE",
      userId: session.user?.id,
      companyId,
    });

    return NextResponse.json(clientItem);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "This customer already has that Item ID" }, { status: 400 });
    }
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Client item not found" }, { status: 404 });
    }
    console.error("Error updating client item:", error);
    return NextResponse.json({ error: "Failed to update client item" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("masters", "delete");
    if (!authorized) return response!;

    const { id } = await params;
    // Quotation lines hold the ID as text, so deleting a master row never
    // touches a document — it only stops the ID being suggested.
    await prisma.clientItemMaster.delete({ where: { id } });

    await createAuditLog({
      tableName: "ClientItemMaster",
      recordId: id,
      action: "DELETE",
      userId: session.user?.id,
      companyId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Client item not found" }, { status: 404 });
    }
    console.error("Error deleting client item:", error);
    return NextResponse.json({ error: "Failed to delete client item" }, { status: 500 });
  }
}
