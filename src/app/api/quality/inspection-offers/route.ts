import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("inspectionOffer", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where: any = { ...companyFilter(companyId) };
    if (search) {
      where.OR = [
        { offerNo: { contains: search } },
        { poNumber: { contains: search } },
        { customer: { name: { contains: search } } },
      ];
    }

    const offers = await prisma.inspectionOffer.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, city: true } },
        tpiAgency: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ offers });
  } catch (error) {
    console.error("Error fetching inspection offers:", error);
    return NextResponse.json({ error: "Failed to fetch inspection offers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("inspectionOffer", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const {
      customerId,
      clientPurchaseOrderId,
      salesOrderId,
      poNumber,
      projectName,
      inspectionLocation,
      proposedInspectionDate,
      tpiAgencyId,
      quantityReady,
      remarks,
      items,
    } = body;

    if (!customerId) {
      return NextResponse.json({ error: "Client is required" }, { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    const offerNo = await generateDocumentNumber("INSPECTION_OFFER", companyId);

    const offer = await prisma.inspectionOffer.create({
      data: {
        companyId,
        offerNo,
        customerId,
        clientPurchaseOrderId: clientPurchaseOrderId || null,
        salesOrderId: salesOrderId || null,
        poNumber: poNumber || null,
        projectName: projectName || null,
        inspectionLocation: inspectionLocation || null,
        proposedInspectionDate: proposedInspectionDate ? new Date(proposedInspectionDate) : null,
        tpiAgencyId: tpiAgencyId || null,
        quantityReady: quantityReady || null,
        remarks: remarks || null,
        createdById: session.user.id,
        items: {
          create: items.map((item: any, index: number) => ({
            sNo: index + 1,
            product: item.product || null,
            material: item.material || null,
            sizeLabel: item.sizeLabel || null,
            heatNo: item.heatNo || null,
            specification: item.specification || null,
            quantity: item.quantity || null,
            quantityReady: item.quantityReady || null,
            uom: item.uom || null,
            colourCodeRequired: item.colourCodeRequired || false,
            colourCode: item.colourCode || null,
            remark: item.remark || null,
          })),
        },
      },
      include: {
        customer: true,
        tpiAgency: true,
        items: true,
      },
    });

    createAuditLog({
      userId: session.user.id,
      companyId,
      action: "CREATE",
      tableName: "InspectionOffer",
      recordId: offer.id,
      newValue: JSON.stringify({ offerNo: offer.offerNo }),
    }).catch(console.error);

    return NextResponse.json(offer, { status: 201 });
  } catch (error: any) {
    console.error("Error creating inspection offer:", error);
    return NextResponse.json({ error: error?.message || "Failed to create inspection offer" }, { status: 500 });
  }
}
