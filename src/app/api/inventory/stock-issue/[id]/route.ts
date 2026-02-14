import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response } = await checkAccess("stockIssue", "read");
    if (!authorized) return response!;

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
