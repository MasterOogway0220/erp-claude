import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const dispatchNote = await prisma.dispatchNote.findUnique({
      where: { id },
      include: {
        packingList: {
          include: {
            items: {
              include: {
                inventoryStock: true,
              },
            },
          },
        },
        salesOrder: {
          include: {
            customer: true,
          },
        },
        transporter: true,
        invoices: {
          select: {
            id: true,
            invoiceNo: true,
            invoiceDate: true,
            invoiceType: true,
            totalAmount: true,
            status: true,
          },
        },
      },
    });

    if (!dispatchNote) {
      return NextResponse.json(
        { error: "Dispatch note not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ dispatchNote });
  } catch (error) {
    console.error("Error fetching dispatch note:", error);
    return NextResponse.json(
      { error: "Failed to fetch dispatch note" },
      { status: 500 }
    );
  }
}
