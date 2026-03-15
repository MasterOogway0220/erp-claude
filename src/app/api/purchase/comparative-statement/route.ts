import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { CSStatus } from "@prisma/client";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("purchaseOrder", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as CSStatus | null;

    const where: any = { ...companyFilter(companyId) };

    if (search) {
      where.OR = [
        { csNo: { contains: search } },
        { rfq: { rfqNo: { contains: search } } },
        { purchaseRequisition: { prNo: { contains: search } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const comparativeStatements = await prisma.comparativeStatement.findMany({
      where,
      include: {
        rfq: {
          select: { id: true, rfqNo: true, status: true },
        },
        purchaseRequisition: {
          select: { id: true, prNo: true },
        },
        selectedVendor: {
          select: { id: true, name: true },
        },
        preparedBy: {
          select: { id: true, name: true },
        },
        approvedBy: {
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
      orderBy: { csDate: "desc" },
    });

    return NextResponse.json({ comparativeStatements });
  } catch (error) {
    console.error("Error fetching comparative statements:", error);
    return NextResponse.json(
      { error: "Failed to fetch comparative statements" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("purchaseOrder", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { rfqId } = body;

    if (!rfqId) {
      return NextResponse.json(
        { error: "RFQ ID is required" },
        { status: 400 }
      );
    }

    // Fetch the RFQ with vendors and quotations
    const rfq = await prisma.rFQ.findFirst({
      where: { id: rfqId, ...companyFilter(companyId) },
      include: {
        vendors: {
          include: {
            vendor: {
              select: { id: true, name: true },
            },
            quotation: true,
          },
        },
      },
    });

    if (!rfq) {
      return NextResponse.json(
        { error: "RFQ not found" },
        { status: 404 }
      );
    }

    // Check if CS already exists for this RFQ
    const existingCS = await prisma.comparativeStatement.findUnique({
      where: { rfqId },
    });

    if (existingCS) {
      return NextResponse.json(
        { error: "Comparative Statement already exists for this RFQ" },
        { status: 400 }
      );
    }

    // Filter vendors that have submitted quotations
    const vendorsWithQuotations = rfq.vendors.filter(
      (v) => v.quotation && v.status === "SUBMITTED"
    );

    if (vendorsWithQuotations.length === 0) {
      return NextResponse.json(
        { error: "No vendor quotations available to generate comparative statement" },
        { status: 400 }
      );
    }

    // Sort by totalLandedCost ascending for ranking
    const sorted = [...vendorsWithQuotations].sort((a, b) => {
      const costA = a.quotation?.totalLandedCost ? Number(a.quotation.totalLandedCost) : Infinity;
      const costB = b.quotation?.totalLandedCost ? Number(b.quotation.totalLandedCost) : Infinity;
      return costA - costB;
    });

    // Generate CS number
    const csNo = await generateDocumentNumber("COMPARATIVE_STATEMENT", companyId);

    // Create CS with entries
    const cs = await prisma.comparativeStatement.create({
      data: {
        csNo,
        companyId,
        rfqId,
        prId: rfq.prId,
        status: "DRAFT",
        preparedById: session.user.id,
        entries: {
          create: sorted.map((v, index) => {
            const q = v.quotation!;
            const materialCost = q.totalMaterialCost ? Number(q.totalMaterialCost) : 0;
            const freight = q.freight ? Number(q.freight) : 0;
            const testingCharges = q.testingCharges ? Number(q.testingCharges) : 0;
            const tpiCharges = q.tpiCharges ? Number(q.tpiCharges) : 0;
            const packingForwarding = q.packingForwarding ? Number(q.packingForwarding) : 0;
            const gstRate = q.gstRate ? Number(q.gstRate) : 0;
            const subtotal = materialCost + freight + testingCharges + tpiCharges + packingForwarding;
            const taxAmount = subtotal * (gstRate / 100);
            const totalLandedCost = q.totalLandedCost ? Number(q.totalLandedCost) : subtotal + taxAmount;

            return {
              vendorId: v.vendorId,
              vendorQuotationId: q.id,
              materialCost,
              freight,
              testingCharges,
              tpiCharges,
              packingForwarding,
              taxAmount,
              totalLandedCost,
              deliveryDays: q.deliveryDays,
              paymentTerms: q.paymentTerms,
              priceBasis: q.priceBasis,
              rankNumber: index + 1,
              rank: `L${index + 1}`,
            };
          }),
        },
      },
      include: {
        rfq: {
          select: { id: true, rfqNo: true },
        },
        purchaseRequisition: {
          select: { id: true, prNo: true },
        },
        entries: {
          include: {
            vendor: {
              select: { id: true, name: true },
            },
          },
          orderBy: { rankNumber: "asc" },
        },
        preparedBy: {
          select: { id: true, name: true },
        },
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      tableName: "ComparativeStatement",
      recordId: cs.id,
      newValue: JSON.stringify({ csNo: cs.csNo, rfqNo: rfq.rfqNo }),
      companyId,
    }).catch(console.error);

    return NextResponse.json(cs, { status: 201 });
  } catch (error) {
    console.error("Error creating comparative statement:", error);
    return NextResponse.json(
      { error: "Failed to create comparative statement" },
      { status: 500 }
    );
  }
}
