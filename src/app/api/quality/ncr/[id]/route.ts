import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

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

    const ncr = await prisma.nCR.findUnique({
      where: { id },
      include: {
        grnItem: {
          select: {
            id: true,
            heatNo: true,
            product: true,
            material: true,
            specification: true,
            sizeLabel: true,
            receivedQtyMtr: true,
            pieces: true,
            grn: {
              select: {
                id: true,
                grnNo: true,
                grnDate: true,
                vendor: { select: { id: true, name: true } },
              },
            },
          },
        },
        inventoryStock: {
          select: {
            id: true,
            heatNo: true,
            product: true,
            sizeLabel: true,
            status: true,
            quantityMtr: true,
            pieces: true,
          },
        },
        vendor: {
          select: { id: true, name: true, contactPerson: true, email: true },
        },
        purchaseOrder: {
          select: {
            id: true,
            poNo: true,
            poDate: true,
            status: true,
            vendor: { select: { id: true, name: true } },
          },
        },
        closedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!ncr) {
      return NextResponse.json(
        { error: "NCR not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ncr });
  } catch (error) {
    console.error("Error fetching NCR:", error);
    return NextResponse.json(
      { error: "Failed to fetch NCR" },
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
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      status,
      nonConformanceType,
      description,
      rootCause,
      correctiveAction,
      preventiveAction,
      disposition,
      evidencePaths,
      targetClosureDate,
      responsiblePersonId,
    } = body;

    const existing = await prisma.nCR.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "NCR not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (nonConformanceType !== undefined) updateData.nonConformanceType = nonConformanceType;
    if (description !== undefined) updateData.description = description;
    if (rootCause !== undefined) updateData.rootCause = rootCause;
    if (correctiveAction !== undefined) updateData.correctiveAction = correctiveAction;
    if (preventiveAction !== undefined) updateData.preventiveAction = preventiveAction;
    if (disposition !== undefined) updateData.disposition = disposition;
    if (evidencePaths !== undefined) updateData.evidencePaths = evidencePaths;
    if (targetClosureDate !== undefined) updateData.targetClosureDate = targetClosureDate ? new Date(targetClosureDate) : null;
    if (responsiblePersonId !== undefined) updateData.responsiblePersonId = responsiblePersonId || null;

    // Handle status transitions:
    // OPEN → UNDER_INVESTIGATION → CORRECTIVE_ACTION_IN_PROGRESS → CLOSED → VERIFIED
    const validTransitions: Record<string, string[]> = {
      OPEN: ["UNDER_INVESTIGATION"],
      UNDER_INVESTIGATION: ["CORRECTIVE_ACTION_IN_PROGRESS"],
      CORRECTIVE_ACTION_IN_PROGRESS: ["CLOSED"],
      CLOSED: ["VERIFIED"],
    };

    if (status) {
      if (status === "CLOSED") {
        if (existing.status !== "CORRECTIVE_ACTION_IN_PROGRESS") {
          return NextResponse.json(
            { error: "NCR must be in CORRECTIVE_ACTION_IN_PROGRESS status to close" },
            { status: 400 }
          );
        }
        // Validate required fields for closing
        const finalRootCause = rootCause || existing.rootCause;
        const finalCorrectiveAction = correctiveAction || existing.correctiveAction;
        const finalPreventiveAction = preventiveAction || existing.preventiveAction;
        const finalDisposition = disposition || existing.disposition;

        if (!finalRootCause || !finalCorrectiveAction || !finalPreventiveAction || !finalDisposition) {
          return NextResponse.json(
            {
              error:
                "Root cause, corrective action, preventive action, and disposition are required to close an NCR",
            },
            { status: 400 }
          );
        }

        updateData.status = "CLOSED";
        updateData.closedDate = new Date();
        updateData.closedById = session.user.id;
      } else if (status === "VERIFIED") {
        if (existing.status !== "CLOSED") {
          return NextResponse.json(
            { error: "NCR must be CLOSED before verification" },
            { status: 400 }
          );
        }
        // Role check: only MANAGEMENT or ADMIN can verify
        const userRole = session.user.role;
        if (userRole !== "MANAGEMENT" && userRole !== "ADMIN") {
          return NextResponse.json(
            { error: "Only MANAGEMENT or ADMIN can verify NCRs" },
            { status: 403 }
          );
        }
        updateData.status = "VERIFIED";
        updateData.verifiedById = session.user.id;
        updateData.verifiedDate = new Date();
      } else {
        // Validate transition
        const allowed = validTransitions[existing.status] || [];
        if (!allowed.includes(status)) {
          return NextResponse.json(
            { error: `Invalid status transition from ${existing.status} to ${status}` },
            { status: 400 }
          );
        }
        updateData.status = status;
      }
    }

    const updated = await prisma.nCR.update({
      where: { id },
      data: updateData,
      include: {
        grnItem: {
          select: { id: true, heatNo: true, product: true, sizeLabel: true },
        },
        inventoryStock: {
          select: { id: true, heatNo: true, status: true },
        },
        vendor: { select: { id: true, name: true } },
        purchaseOrder: { select: { id: true, poNo: true } },
        closedBy: { select: { id: true, name: true } },
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      tableName: "NCR",
      recordId: id,
      fieldName: "status",
      oldValue: existing.status,
      newValue: updated.status,
    }).catch(console.error);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating NCR:", error);
    return NextResponse.json(
      { error: "Failed to update NCR" },
      { status: 500 }
    );
  }
}
