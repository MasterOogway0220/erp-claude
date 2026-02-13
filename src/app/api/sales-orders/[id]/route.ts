import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        quotation: true,
        items: {
          orderBy: { sNo: "asc" },
          include: {
            stockReservations: {
              include: {
                inventoryStock: true,
              },
            },
          },
        },
        purchaseRequisitions: {
          select: {
            id: true,
            prNo: true,
            status: true,
          },
        },
      },
    });

    if (!salesOrder) {
      return NextResponse.json({ error: "Sales order not found" }, { status: 404 });
    }

    return NextResponse.json({ salesOrder });
  } catch (error) {
    console.error("Error fetching sales order:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales order" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status, poAcceptanceStatus } = body;

    const existing = await prisma.salesOrder.findUnique({
      where: { id },
      select: { status: true, poAcceptanceStatus: true },
    });

    const updated = await prisma.salesOrder.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(poAcceptanceStatus && { poAcceptanceStatus }),
      },
      include: {
        customer: true,
        items: true,
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      tableName: "SalesOrder",
      recordId: id,
      fieldName: "status",
      oldValue: existing?.status || null,
      newValue: updated.status,
    }).catch(console.error);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating sales order:", error);
    return NextResponse.json(
      { error: "Failed to update sales order" },
      { status: 500 }
    );
  }
}
