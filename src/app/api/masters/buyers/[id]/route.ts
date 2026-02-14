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

    const buyer = await prisma.buyerMaster.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true } },
      },
    });

    if (!buyer) {
      return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
    }

    return NextResponse.json(buyer);
  } catch (error) {
    console.error("Error fetching buyer:", error);
    return NextResponse.json(
      { error: "Failed to fetch buyer" },
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

    const buyer = await prisma.buyerMaster.update({
      where: { id },
      data: {
        buyerName: body.buyerName ?? undefined,
        designation: body.designation ?? undefined,
        email: body.email ?? undefined,
        mobile: body.mobile ?? undefined,
        telephone: body.telephone ?? undefined,
        customerId: body.customerId ?? undefined,
        isActive: body.isActive ?? undefined,
      },
      include: {
        customer: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      tableName: "BuyerMaster",
      recordId: id,
      action: "UPDATE",
      userId: session.user?.id,
    });

    return NextResponse.json(buyer);
  } catch (error) {
    console.error("Error updating buyer:", error);
    return NextResponse.json(
      { error: "Failed to update buyer" },
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

    await prisma.buyerMaster.delete({
      where: { id },
    });

    await createAuditLog({
      tableName: "BuyerMaster",
      recordId: id,
      action: "DELETE",
      userId: session.user?.id,
    });

    return NextResponse.json({ message: "Buyer deleted successfully" });
  } catch (error) {
    console.error("Error deleting buyer:", error);
    return NextResponse.json(
      { error: "Failed to delete buyer" },
      { status: 500 }
    );
  }
}
