import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status, poAcceptanceStatus } = body;

    const updated = await prisma.salesOrder.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(poAcceptanceStatus && { poAcceptanceStatus }),
      },
      include: {
        customer: true,
        items: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating sales order:", error);
    return NextResponse.json(
      { error: "Failed to update sales order" },
      { status: 500 }
    );
  }
}
