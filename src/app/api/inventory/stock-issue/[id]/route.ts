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

    const stockIssue = await prisma.stockIssue.findUnique({
      where: { id },
      include: {
        salesOrder: {
          select: {
            id: true, soNo: true, status: true,
            customer: { select: { id: true, name: true } },
          },
        },
        issuedBy: { select: { id: true, name: true } },
        authorizedBy: { select: { id: true, name: true } },
        items: {
          include: {
            inventoryStock: {
              select: {
                id: true, heatNo: true, product: true, sizeLabel: true,
                specification: true, status: true, quantityMtr: true,
              },
            },
          },
        },
      },
    });

    if (!stockIssue) {
      return NextResponse.json({ error: "Stock issue not found" }, { status: 404 });
    }

    return NextResponse.json({ stockIssue });
  } catch (error) {
    console.error("Error fetching stock issue:", error);
    return NextResponse.json({ error: "Failed to fetch stock issue" }, { status: 500 });
  }
}
