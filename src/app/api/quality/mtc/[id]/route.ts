import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { checkAccess } from "@/lib/rbac";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response } = await checkAccess("mtc", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();
    const { verificationStatus, remarks, filePath } = body;

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

    // Mandatory attachment: MTC file required before marking as VERIFIED
    if (verificationStatus === "VERIFIED" && !existing.filePath && !filePath) {
      return NextResponse.json(
        { error: "MTC file attachment is mandatory before marking as VERIFIED" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (verificationStatus) updateData.verificationStatus = verificationStatus;
    if (remarks !== undefined) updateData.remarks = remarks;
    if (filePath !== undefined) updateData.filePath = filePath;

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

    createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      tableName: "MTCDocument",
      recordId: id,
      fieldName: "verificationStatus",
      oldValue: existing.verificationStatus || undefined,
      newValue: verificationStatus || existing.verificationStatus || undefined,
    }).catch(console.error);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating MTC document:", error);
    return NextResponse.json(
      { error: "Failed to update MTC document" },
      { status: 500 }
    );
  }
}
