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

    const paymentReceipt = await prisma.paymentReceipt.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            customer: true,
            salesOrder: {
              select: { id: true, soNo: true },
            },
          },
        },
        customer: true,
      },
    });

    if (!paymentReceipt) {
      return NextResponse.json(
        { error: "Payment receipt not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ paymentReceipt });
  } catch (error) {
    console.error("Error fetching payment receipt:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment receipt" },
      { status: 500 }
    );
  }
}
