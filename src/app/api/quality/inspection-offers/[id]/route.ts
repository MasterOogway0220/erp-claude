import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("inspectionOffer", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();
    const { action, tpiAgencyId, rejectionRemarks } = body;

    const existing = await prisma.inspectionOffer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Inspection Offer not found" }, { status: 404 });
    }

    const MANAGER_ROLES = ["MANAGEMENT", "ADMIN", "SUPER_ADMIN"];
    let updateData: any = {};

    switch (action) {
      case "submit_for_approval":
        if (existing.status !== "DRAFT") {
          return NextResponse.json({ error: "Only DRAFT offers can be submitted" }, { status: 400 });
        }
        updateData = { status: "PENDING_APPROVAL" };
        break;

      case "approve":
        if (!MANAGER_ROLES.includes(session.user.role)) {
          return NextResponse.json({ error: "Only managers can approve offers" }, { status: 403 });
        }
        if (existing.status !== "PENDING_APPROVAL") {
          return NextResponse.json({ error: "Only offers pending approval can be approved" }, { status: 400 });
        }
        updateData = { status: "APPROVED", approvedById: session.user.id, approvedAt: new Date() };
        break;

      case "reject":
        if (!MANAGER_ROLES.includes(session.user.role)) {
          return NextResponse.json({ error: "Only managers can reject offers" }, { status: 403 });
        }
        if (existing.status !== "PENDING_APPROVAL") {
          return NextResponse.json({ error: "Only offers pending approval can be rejected" }, { status: 400 });
        }
        if (!rejectionRemarks?.trim()) {
          return NextResponse.json({ error: "Rejection remarks are required" }, { status: 400 });
        }
        updateData = {
          status: "DRAFT",
          rejectedById: session.user.id,
          rejectedAt: new Date(),
          rejectionRemarks,
        };
        break;

      case "mark_sent":
        if (existing.status !== "APPROVED") {
          return NextResponse.json({ error: "Only approved offers can be marked as sent" }, { status: 400 });
        }
        updateData = {
          status: "SENT",
          sentAt: new Date(),
          ...(tpiAgencyId && { tpiAgencyId }),
        };
        break;

      case "mark_tpi_signed":
        if (existing.status !== "SENT") {
          return NextResponse.json({ error: "Offer must be in SENT status" }, { status: 400 });
        }
        updateData = { status: "INSPECTION_DONE", tpiSignedAt: new Date() };
        break;

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const updated = await prisma.inspectionOffer.update({
      where: { id },
      data: updateData,
    });

    createAuditLog({
      userId: session.user.id,
      companyId,
      action: "STATUS_CHANGE",
      tableName: "InspectionOffer",
      recordId: id,
      newValue: JSON.stringify({ action, newStatus: updated.status }),
    }).catch(console.error);

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating inspection offer:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update inspection offer" },
      { status: 500 }
    );
  }
}
