import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("mtc", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();
    const { verificationStatus, remarks } = body;

    const validStatuses = ["PENDING", "VERIFIED", "DISCREPANT"];
    if (verificationStatus && !validStatuses.includes(verificationStatus)) {
      return NextResponse.json(
        { error: "Invalid verification status. Must be PENDING, VERIFIED, or DISCREPANT" },
        { status: 400 }
      );
    }

    const existing = await prisma.mTCDocument.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "MTC document not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (verificationStatus) updateData.verificationStatus = verificationStatus;
    if (remarks !== undefined) updateData.remarks = remarks;

    const updated = await prisma.mTCDocument.update({
      where: { id },
      data: updateData,
      include: {
        purchaseOrder: {
          select: { id: true, poNo: true },
        },
        grn: {
          select: { id: true, grnNo: true },
        },
        inventoryStock: {
          select: { id: true, heatNo: true, status: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating MTC document:", error);
    return NextResponse.json(
      { error: "Failed to update MTC document" },
      { status: 500 }
    );
  }
}
