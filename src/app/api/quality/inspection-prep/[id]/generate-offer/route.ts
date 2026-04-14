import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { checkAccess, QA_ROLES } from "@/lib/rbac";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("inspectionOffer", "write");
    if (!authorized) return response!;

    if (!(QA_ROLES as readonly string[]).includes(session.user.role)) {
      return NextResponse.json({ error: "Only QA/Manager can generate inspection offers" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      selectedItems,
      customerId,
      tpiAgencyId,
      inspectionLocation,
      proposedInspectionDate,
      remarks,
    } = body;

    if (!selectedItems || selectedItems.length === 0) {
      return NextResponse.json({ error: "Select at least one item for the offer" }, { status: 400 });
    }
    if (!customerId) {
      return NextResponse.json({ error: "Customer is required" }, { status: 400 });
    }

    const prep = await prisma.inspectionPrep.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            heatEntries: { include: { mtcDocuments: true } },
          },
        },
      },
    });

    if (!prep) {
      return NextResponse.json({ error: "Inspection Prep not found" }, { status: 404 });
    }

    if (prep.status === "OFFER_GENERATED") {
      return NextResponse.json(
        { error: "An inspection offer has already been generated from this preparation" },
        { status: 409 }
      );
    }

    const offerNo = await generateDocumentNumber("INSPECTION_OFFER", companyId);

    const [offer] = await prisma.$transaction(async (tx) => {
      const newOffer = await tx.inspectionOffer.create({
        data: {
          companyId,
          offerNo,
          customerId,
          inspectionPrepId: id,
          tpiAgencyId: tpiAgencyId || null,
          inspectionLocation: inspectionLocation || null,
          proposedInspectionDate: proposedInspectionDate ? new Date(proposedInspectionDate) : null,
          remarks: remarks || null,
          status: "DRAFT",
          createdById: session.user.id,
          items: {
            create: selectedItems.map((sel: any, idx: number) => {
              const prepItem = prep.items.find((i: any) => i.id === sel.itemId);
              const totalPiecesSelected = (sel.heats || []).reduce(
                (sum: number, h: any) => sum + (parseInt(h.piecesSelected) || 0),
                0
              );
              return {
                sNo: idx + 1,
                product: prepItem?.description || null,
                sizeLabel: prepItem?.sizeLabel || null,
                uom: prepItem?.uom || null,
                piecesSelected: totalPiecesSelected || null,
                heatSelections: {
                  create: (sel.heats || []).map((h: any) => ({
                    heatEntryId: h.heatId,
                    piecesSelected: parseInt(h.piecesSelected) || null,
                  })),
                },
              };
            }),
          },
        },
        include: {
          items: { include: { heatSelections: true } },
        },
      });

      await tx.inspectionPrep.update({
        where: { id },
        data: { status: "OFFER_GENERATED" },
      });

      return [newOffer];
    });

    createAuditLog({
      userId: session.user.id,
      companyId,
      action: "CREATE",
      tableName: "InspectionOffer",
      recordId: offer.id,
      newValue: JSON.stringify({ offerNo: offer.offerNo, fromPrepId: id }),
    }).catch(console.error);

    return NextResponse.json(offer, { status: 201 });
  } catch (error: any) {
    console.error("Error generating inspection offer:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate inspection offer" },
      { status: 500 }
    );
  }
}
