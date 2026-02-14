import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { checkAccess } from "@/lib/rbac";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response } = await checkAccess("quotation", "write");
    if (!authorized) return response!;

    // Fetch the original quotation with all items and terms
    const original = await prisma.quotation.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sNo: "asc" } },
        terms: { orderBy: { termNo: "asc" } },
      },
    });

    if (!original) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      );
    }

    // Only allow revision of APPROVED, SENT, or REJECTED quotations
    if (!["APPROVED", "SENT", "REJECTED"].includes(original.status)) {
      return NextResponse.json(
        { error: "Only APPROVED, SENT, or REJECTED quotations can be revised" },
        { status: 400 }
      );
    }

    // Generate a new quotation number
    const newQuotationNo = await generateDocumentNumber("QUOTATION");

    // Create the new revision in a transaction
    const newQuotation = await prisma.$transaction(async (tx) => {
      // Set original quotation status to REVISED
      await tx.quotation.update({
        where: { id: original.id },
        data: { status: "REVISED" },
      });

      // Create new Quotation record with fields copied from original
      const created = await tx.quotation.create({
        data: {
          quotationNo: newQuotationNo,
          quotationDate: new Date(),
          enquiryId: original.enquiryId,
          customerId: original.customerId,
          quotationType: original.quotationType,
          quotationCategory: original.quotationCategory,
          status: "DRAFT",
          version: original.version + 1,
          parentQuotationId: original.id,
          validUpto: original.validUpto,
          currency: original.currency,
          preparedById: session.user.id,
          buyerId: original.buyerId,
          preparedByEmployeeId: original.preparedByEmployeeId,
          // Copy all QuotationItem records
          items: {
            create: original.items.map((item) => ({
              sNo: item.sNo,
              product: item.product,
              material: item.material,
              additionalSpec: item.additionalSpec,
              sizeId: item.sizeId,
              sizeLabel: item.sizeLabel,
              od: item.od,
              wt: item.wt,
              length: item.length,
              ends: item.ends,
              quantity: item.quantity,
              materialCost: item.materialCost,
              logisticsCost: item.logisticsCost,
              inspectionCost: item.inspectionCost,
              otherCosts: item.otherCosts,
              totalCostPerUnit: item.totalCostPerUnit,
              marginPercentage: item.marginPercentage,
              unitRate: item.unitRate,
              amount: item.amount,
              delivery: item.delivery,
              remark: item.remark,
              unitWeight: item.unitWeight,
              totalWeightMT: item.totalWeightMT,
              tagNo: item.tagNo,
              drawingRef: item.drawingRef,
              itemDescription: item.itemDescription,
              certificateReq: item.certificateReq,
              itemType: item.itemType,
              wtType: item.wtType,
              tubeLength: item.tubeLength,
              tubeCount: item.tubeCount,
              componentPosition: item.componentPosition,
              sizeNPS: item.sizeNPS,
              schedule: item.schedule,
              materialCodeId: item.materialCodeId,
              uom: item.uom,
            })),
          },
          // Copy all QuotationTerm records
          terms: {
            create: original.terms.map((term) => ({
              termNo: term.termNo,
              termName: term.termName,
              termValue: term.termValue,
              isDefault: term.isDefault,
              isIncluded: term.isIncluded,
              isCustom: term.isCustom,
              isHeadingEditable: term.isHeadingEditable,
            })),
          },
        },
        include: {
          customer: true,
          items: { orderBy: { sNo: "asc" } },
          terms: { orderBy: { termNo: "asc" } },
        },
      });

      return created;
    });

    return NextResponse.json({ quotation: newQuotation });
  } catch (error) {
    console.error("Error creating quotation revision:", error);
    return NextResponse.json(
      { error: "Failed to create quotation revision" },
      { status: 500 }
    );
  }
}
