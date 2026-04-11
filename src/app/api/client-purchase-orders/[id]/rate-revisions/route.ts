import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("clientPO", "read");
    if (!authorized) return response!;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    const where: any = {
      clientPOItem: { clientPurchaseOrderId: id },
    };
    if (itemId) {
      where.clientPOItemId = itemId;
    }

    const revisions = await prisma.rateRevision.findMany({
      where,
      include: {
        changedBy: { select: { name: true } },
        clientPOItem: {
          select: { sNo: true, product: true, sizeLabel: true },
        },
      },
      orderBy: { changedAt: "desc" },
    });

    return NextResponse.json(
      revisions.map((rev) => ({
        id: rev.id,
        itemId: rev.clientPOItemId,
        sNo: rev.clientPOItem.sNo,
        product: rev.clientPOItem.product,
        sizeLabel: rev.clientPOItem.sizeLabel,
        oldRate: Number(rev.oldRate),
        newRate: Number(rev.newRate),
        remark: rev.remark,
        overallRemark: rev.overallRemark,
        changedBy: rev.changedBy.name,
        changedAt: rev.changedAt,
      }))
    );
  } catch (error) {
    console.error("Error fetching rate revisions:", error);
    return NextResponse.json(
      { error: "Failed to fetch rate revisions" },
      { status: 500 }
    );
  }
}
