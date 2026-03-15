import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response, companyId } = await checkAccess("purchaseOrder", "read");
    if (!authorized) return response!;

    const cs = await prisma.comparativeStatement.findFirst({
      where: { id, ...companyFilter(companyId) },
      include: {
        rfq: {
          include: {
            purchaseRequisition: {
              include: {
                items: {
                  orderBy: { sNo: "asc" },
                },
                salesOrder: {
                  select: { id: true, soNo: true },
                },
              },
            },
            vendors: {
              include: {
                vendor: {
                  select: { id: true, name: true },
                },
                quotation: {
                  include: {
                    items: {
                      orderBy: { sNo: "asc" },
                    },
                  },
                },
              },
            },
          },
        },
        selectedVendor: {
          select: { id: true, name: true },
        },
        approvedBy: {
          select: { id: true, name: true },
        },
        preparedBy: {
          select: { id: true, name: true },
        },
        entries: {
          include: {
            vendor: {
              select: { id: true, name: true },
            },
          },
          orderBy: { rankNumber: "asc" },
        },
      },
    });

    if (!cs) {
      return NextResponse.json(
        { error: "Comparative Statement not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ comparativeStatement: cs });
  } catch (error) {
    console.error("Error fetching comparative statement:", error);
    return NextResponse.json(
      { error: "Failed to fetch comparative statement" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response, companyId } = await checkAccess("purchaseOrder", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { selectedVendorId, selectedRank, justificationRemarks, status, approvalRemarks } = body;

    const cs = await prisma.comparativeStatement.findFirst({
      where: { id, ...companyFilter(companyId) },
      include: {
        entries: {
          orderBy: { rankNumber: "asc" },
        },
      },
    });

    if (!cs) {
      return NextResponse.json(
        { error: "Comparative Statement not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};

    // Handle vendor selection
    if (selectedVendorId) {
      // Find the selected vendor's entry to determine rank
      const selectedEntry = cs.entries.find((e) => e.vendorId === selectedVendorId);

      if (!selectedEntry) {
        return NextResponse.json(
          { error: "Selected vendor not found in comparative statement entries" },
          { status: 400 }
        );
      }

      // If selecting non-L1 vendor, justification is required
      if (selectedEntry.rankNumber !== 1 && !justificationRemarks) {
        return NextResponse.json(
          { error: "Justification remarks are required when selecting a non-L1 vendor" },
          { status: 400 }
        );
      }

      updateData.selectedVendorId = selectedVendorId;
      updateData.selectedRank = selectedRank || selectedEntry.rank;
      if (justificationRemarks) {
        updateData.justificationRemarks = justificationRemarks;
      }
    }

    // Handle status changes
    if (status) {
      updateData.status = status;

      // When approving, set approvedById and approvalDate
      if (status === "APPROVED") {
        // Role check: Only MANAGEMENT and SUPER_ADMIN can approve
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { role: true },
        });

        if (user?.role !== "MANAGEMENT" && user?.role !== "SUPER_ADMIN") {
          return NextResponse.json(
            { error: "Only Management or Admin can approve comparative statements" },
            { status: 403 }
          );
        }

        updateData.approvedById = session.user.id;
        updateData.approvalDate = new Date();
        if (approvalRemarks) {
          updateData.approvalRemarks = approvalRemarks;
        }
      }

      if (status === "REJECTED") {
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { role: true },
        });

        if (user?.role !== "MANAGEMENT" && user?.role !== "SUPER_ADMIN") {
          return NextResponse.json(
            { error: "Only Management or Admin can reject comparative statements" },
            { status: 403 }
          );
        }

        updateData.approvedById = session.user.id;
        updateData.approvalDate = new Date();
        if (approvalRemarks) {
          updateData.approvalRemarks = approvalRemarks;
        }
      }
    }

    const updated = await prisma.comparativeStatement.update({
      where: { id },
      data: updateData,
      include: {
        rfq: {
          select: { id: true, rfqNo: true },
        },
        purchaseRequisition: {
          select: { id: true, prNo: true },
        },
        selectedVendor: {
          select: { id: true, name: true },
        },
        approvedBy: {
          select: { id: true, name: true },
        },
        preparedBy: {
          select: { id: true, name: true },
        },
        entries: {
          include: {
            vendor: {
              select: { id: true, name: true },
            },
          },
          orderBy: { rankNumber: "asc" },
        },
      },
    });

    // Determine audit action
    const auditAction = status === "APPROVED"
      ? "APPROVE"
      : status === "REJECTED"
        ? "REJECT"
        : selectedVendorId
          ? "UPDATE"
          : "STATUS_CHANGE";

    createAuditLog({
      userId: session.user.id,
      action: auditAction,
      tableName: "ComparativeStatement",
      recordId: id,
      fieldName: status ? "status" : selectedVendorId ? "selectedVendorId" : undefined,
      oldValue: status ? cs.status : cs.selectedVendorId || undefined,
      newValue: status || selectedVendorId || undefined,
      companyId,
    }).catch(console.error);

    return NextResponse.json({ comparativeStatement: updated });
  } catch (error) {
    console.error("Error updating comparative statement:", error);
    return NextResponse.json(
      { error: "Failed to update comparative statement" },
      { status: 500 }
    );
  }
}
