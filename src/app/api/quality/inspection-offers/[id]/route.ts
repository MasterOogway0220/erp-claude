import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("inspectionOffer", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const offer = await prisma.inspectionOffer.findUnique({
      where: { id },
      include: {
        customer: true,
        tpiAgency: true,
        createdBy: { select: { name: true } },
        clientPurchaseOrder: { select: { cpoNo: true, clientPoNumber: true } },
        salesOrder: { select: { soNo: true } },
        items: { orderBy: { sNo: "asc" } },
      },
    });

    if (!offer) {
      return NextResponse.json({ error: "Inspection Offer not found" }, { status: 404 });
    }

    return NextResponse.json(offer);
  } catch (error) {
    console.error("Error fetching inspection offer:", error);
    return NextResponse.json({ error: "Failed to fetch inspection offer" }, { status: 500 });
  }
}
