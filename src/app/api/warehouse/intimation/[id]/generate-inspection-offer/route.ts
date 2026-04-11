import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { createAuditLog } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("inspectionOffer", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();
    const { itemIds, addToExisting } = body;

    const intimation = await prisma.warehouseIntimation.findUnique({
      where: { id },
      include: {
        salesOrder: {
          select: {
            id: true,
            soNo: true,
            customerId: true,
            customerPoNo: true,
            projectName: true,
            clientPurchaseOrderId: true,
            customer: { select: { name: true } },
          },
        },
        items: {
          include: {
            details: {
              where: { status: "READY" },
              orderBy: { sNo: "asc" },
            },
            salesOrderItem: {
              select: {
                id: true,
                orderProcessing: {
                  select: {
                    tpiRequired: true,
                    tpiType: true,
                    colourCodingRequired: true,
                    colourCode: true,
                    vdiRequired: true,
                    vdiWitnessPercent: true,
                    hydroTestRequired: true,
                    hydroWitnessPercent: true,
                    requiredLabTests: true,
                  },
                },
              },
            },
          },
          orderBy: { sNo: "asc" },
        },
      },
    });

    if (!intimation) {
      return NextResponse.json({ error: "Warehouse Intimation not found" }, { status: 404 });
    }

    // Filter items if itemIds provided
    let selectedItems = intimation.items;
    if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
      selectedItems = intimation.items.filter((i) => itemIds.includes(i.id));
    }

    // Collect ready details from selected items
    const offerItems: any[] = [];
    let sNoCounter = 1;
    for (const item of selectedItems) {
      const readyDetails = item.details;
      if (readyDetails.length === 0) continue;

      const processing = item.salesOrderItem?.orderProcessing;

      for (const detail of readyDetails) {
        offerItems.push({
          sNo: sNoCounter++,
          product: item.product,
          material: item.material,
          sizeLabel: item.sizeLabel,
          heatNo: detail.heatNo,
          specification: item.additionalSpec,
          quantity: detail.lengthMtr ? String(Number(detail.lengthMtr)) : null,
          quantityReady: detail.lengthMtr ? String(Number(detail.lengthMtr)) : null,
          uom: "MTR",
          colourCodeRequired: processing?.colourCodingRequired || false,
          colourCode: processing?.colourCode || null,
          remark: detail.remarks,
        });
      }
    }

    if (offerItems.length === 0) {
      return NextResponse.json({ error: "No ready items found for inspection offer" }, { status: 400 });
    }

    // Add to existing IO or create new
    if (addToExisting) {
      const existingIO = await prisma.inspectionOffer.findUnique({
        where: { id: addToExisting },
        include: { items: { orderBy: { sNo: "desc" }, take: 1 } },
      });

      if (!existingIO) {
        return NextResponse.json({ error: "Existing inspection offer not found" }, { status: 404 });
      }

      const lastSNo = existingIO.items[0]?.sNo || 0;
      await prisma.inspectionOfferItem.createMany({
        data: offerItems.map((item, idx) => ({
          inspectionOfferId: addToExisting,
          ...item,
          sNo: lastSNo + idx + 1,
        })),
      });

      return NextResponse.json({ success: true, inspectionOfferId: addToExisting, addedItems: offerItems.length });
    }

    // Create new inspection offer
    const offerNo = await generateDocumentNumber("INSPECTION_OFFER", companyId);
    const so = intimation.salesOrder;

    const inspectionOffer = await prisma.inspectionOffer.create({
      data: {
        companyId,
        offerNo,
        customerId: so.customerId,
        salesOrderId: so.id,
        clientPurchaseOrderId: so.clientPurchaseOrderId,
        poNumber: so.customerPoNo,
        projectName: so.projectName,
        status: "DRAFT",
        createdById: session.user.id,
        remarks: `Auto-generated from MPR ${intimation.mprNo}`,
        items: {
          create: offerItems,
        },
      },
      include: { items: true },
    });

    // Create alert for QC
    if (companyId) {
      await prisma.alert.create({
        data: {
          companyId,
          type: "INSPECTION_DUE",
          title: `Inspection Offer: ${offerNo}`,
          message: `Draft inspection offer created from ${intimation.mprNo} for ${so.customer.name}. ${offerItems.length} item(s) ready for inspection.`,
          severity: "MEDIUM",
          status: "UNREAD",
          relatedModule: "InspectionOffer",
          relatedId: inspectionOffer.id,
          assignedToRole: "QC",
        },
      });
    }

    createAuditLog({
      companyId,
      userId: session.user.id,
      action: "CREATE",
      tableName: "InspectionOffer",
      recordId: inspectionOffer.id,
      newValue: JSON.stringify({ offerNo, mprNo: intimation.mprNo, itemCount: offerItems.length }),
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      inspectionOfferId: inspectionOffer.id,
      offerNo,
      itemCount: offerItems.length,
    }, { status: 201 });
  } catch (error) {
    console.error("Error generating inspection offer:", error);
    return NextResponse.json({ error: "Failed to generate inspection offer" }, { status: 500 });
  }
}
