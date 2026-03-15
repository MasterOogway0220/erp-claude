import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { RFQStatus } from "@prisma/client";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("purchaseOrder", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as RFQStatus | null;
    const prId = searchParams.get("prId") || "";

    const where: any = { ...companyFilter(companyId) };

    if (search) {
      where.OR = [
        { rfqNo: { contains: search } },
        { purchaseRequisition: { prNo: { contains: search } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (prId) {
      where.prId = prId;
    }

    const rfqs = await prisma.rFQ.findMany({
      where,
      include: {
        purchaseRequisition: {
          select: { id: true, prNo: true, status: true },
        },
        vendors: {
          include: {
            vendor: {
              select: { id: true, name: true },
            },
          },
        },
        comparativeStatement: {
          select: { id: true, csNo: true, status: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { rfqDate: "desc" },
    });

    return NextResponse.json({ rfqs });
  } catch (error) {
    console.error("Error fetching RFQs:", error);
    return NextResponse.json(
      { error: "Failed to fetch RFQs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("purchaseOrder", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { prId, submissionDeadline, remarks, vendorIds } = body;

    if (!prId) {
      return NextResponse.json(
        { error: "Purchase Requisition is required" },
        { status: 400 }
      );
    }

    if (!vendorIds || vendorIds.length === 0) {
      return NextResponse.json(
        { error: "At least one vendor is required" },
        { status: 400 }
      );
    }

    // Validate PR exists and belongs to the same company
    const pr = await prisma.purchaseRequisition.findFirst({
      where: { id: prId, ...companyFilter(companyId) },
    });

    if (!pr) {
      return NextResponse.json(
        { error: "Purchase Requisition not found" },
        { status: 404 }
      );
    }

    // Generate RFQ number
    const rfqNo = await generateDocumentNumber("RFQ", companyId);

    // Create RFQ with nested vendors
    const rfq = await prisma.rFQ.create({
      data: {
        rfqNo,
        companyId,
        prId,
        submissionDeadline: submissionDeadline ? new Date(submissionDeadline) : null,
        remarks: remarks || null,
        status: "DRAFT",
        createdById: session.user.id,
        vendors: {
          create: vendorIds.map((vendorId: string) => ({
            vendorId,
            status: "PENDING",
          })),
        },
      },
      include: {
        purchaseRequisition: {
          select: { id: true, prNo: true },
        },
        vendors: {
          include: {
            vendor: {
              select: { id: true, name: true },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      tableName: "RFQ",
      recordId: rfq.id,
      newValue: JSON.stringify({ rfqNo: rfq.rfqNo, prNo: pr.prNo }),
      companyId,
    }).catch(console.error);

    return NextResponse.json(rfq, { status: 201 });
  } catch (error) {
    console.error("Error creating RFQ:", error);
    return NextResponse.json(
      { error: "Failed to create RFQ" },
      { status: 500 }
    );
  }
}
