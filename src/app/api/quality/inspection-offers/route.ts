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

    // `view=list` asks for the summary shape the offers table needs.
    //
    // The list screen is the only consumer of this endpoint, and of the offer's
    // items it shows nothing but how many there are — so the ids are enough to
    // give the array a length. It never shows who raised the offer either, so
    // the createdBy join can go with them.
    //
    // Full offer items carry the heat number, specification, colour code and
    // ready quantity that the inspection-offer letter and the inspection run
    // are built from; anything that produces a document reads the per-offer
    // route, not this one, and would break on the narrowed shape. Hence opt-in:
    // a caller that forgets the flag is merely slow, never silently short of
    // fields.
    const summaryOnly = searchParams.get("view") === "list";

    const offers = await prisma.inspectionOffer.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, city: true } },
        tpiAgency: { select: { id: true, name: true } },
        createdBy: summaryOnly ? false : { select: { name: true } },
        items: summaryOnly ? { select: { id: true } } : true,
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
