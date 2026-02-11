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

    const purchaseRequisition = await prisma.purchaseRequisition.findUnique({
      where: { id },
      include: {
        salesOrder: {
          select: { id: true, soNo: true, soDate: true },
        },
        suggestedVendor: {
          select: { id: true, name: true },
        },
        approvedBy: {
          select: { id: true, name: true },
        },
        items: {
          orderBy: { sNo: "asc" },
        },
        purchaseOrders: {
          select: { id: true, poNo: true, status: true },
        },
      },
    });

    if (!purchaseRequisition) {
      return NextResponse.json(
        { error: "Purchase requisition not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ purchaseRequisition });
  } catch (error) {
    console.error("Error fetching purchase requisition:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase requisition" },
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
    const { status } = body;

    const pr = await prisma.purchaseRequisition.findUnique({
      where: { id },
    });

    if (!pr) {
      return NextResponse.json(
        { error: "Purchase requisition not found" },
        { status: 404 }
      );
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      DRAFT: ["PENDING_APPROVAL"],
      PENDING_APPROVAL: ["APPROVED", "REJECTED"],
      REJECTED: ["DRAFT"],
    };

    if (
      validTransitions[pr.status] &&
      !validTransitions[pr.status].includes(status)
    ) {
      return NextResponse.json(
        { error: `Cannot transition from ${pr.status} to ${status}` },
        { status: 400 }
      );
    }

    const updateData: any = { status };

    if (status === "APPROVED") {
      updateData.approvedById = (session as any).user?.id;
      updateData.approvalDate = new Date();
    }

    if (status === "REJECTED") {
      updateData.approvedById = (session as any).user?.id;
      updateData.approvalDate = new Date();
    }

    const updated = await prisma.purchaseRequisition.update({
      where: { id },
      data: updateData,
      include: {
        salesOrder: {
          select: { id: true, soNo: true },
        },
        suggestedVendor: {
          select: { id: true, name: true },
        },
        approvedBy: {
          select: { id: true, name: true },
        },
        items: {
          orderBy: { sNo: "asc" },
        },
        purchaseOrders: {
          select: { id: true, poNo: true, status: true },
        },
      },
    });

    return NextResponse.json({ purchaseRequisition: updated });
  } catch (error) {
    console.error("Error updating purchase requisition:", error);
    return NextResponse.json(
      { error: "Failed to update purchase requisition" },
      { status: 500 }
    );
  }
}
