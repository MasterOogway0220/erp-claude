import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response, companyId } = await checkAccess("mtc", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const certificate = await prisma.mTCCertificate.findFirst({
      where: { id, ...companyFilter(companyId) },
      include: {
        customer: true,
        materialSpecRef: {
          include: {
            chemicalElements: { orderBy: { sortOrder: "asc" } },
            mechanicalProperties: { orderBy: { sortOrder: "asc" } },
            impactProperties: true,
          },
        },
        items: {
          include: {
            chemicalResults: { orderBy: { sortOrder: "asc" } },
            mechanicalResults: { orderBy: { sortOrder: "asc" } },
            impactResults: true,
          },
          orderBy: { sortOrder: "asc" },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ certificate });
  } catch (error) {
    console.error("Error fetching MTC certificate:", error);
    return NextResponse.json(
      { error: "Failed to fetch MTC certificate" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("mtc", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.mTCCertificate.findFirst({
      where: { id, ...companyFilter(companyId) },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }

    const {
      status,
      notes,
      remarks,
      reviewedBy,
      witnessedBy,
      additionalRequirement,
      projectName,
      otherReference,
      items,
    } = body;

    // Helper to convert string/empty to number or null for Decimal fields
    function toDecimalOrNull(val: any): number | null {
      if (val === null || val === undefined || val === "") return null;
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    }

    // Build update data for the certificate
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (remarks !== undefined) updateData.remarks = remarks;
    if (reviewedBy !== undefined) updateData.reviewedBy = reviewedBy;
    if (witnessedBy !== undefined) updateData.witnessedBy = witnessedBy;
    if (additionalRequirement !== undefined) updateData.additionalRequirement = additionalRequirement;
    if (projectName !== undefined) updateData.projectName = projectName;
    if (otherReference !== undefined) updateData.otherReference = otherReference;

    // Handle revision increment on finalization
    if (status === "REVISED") {
      updateData.revision = (existing.revision || 0) + 1;
    }

    await prisma.$transaction(async (tx) => {
      // Update the certificate
      await tx.mTCCertificate.update({
        where: { id },
        data: updateData,
      });

      // Update item results if provided
      if (items && Array.isArray(items)) {
        for (const item of items) {
          if (!item.id) continue;

          // Update item fields if any
          if (item.heatNo !== undefined || item.rawMaterial !== undefined || item.clientItemCode !== undefined) {
            await tx.mTCCertificateItem.update({
              where: { id: item.id },
              data: {
                ...(item.heatNo !== undefined && { heatNo: item.heatNo }),
                ...(item.rawMaterial !== undefined && { rawMaterial: item.rawMaterial }),
                ...(item.clientItemCode !== undefined && { clientItemCode: item.clientItemCode }),
              },
            });
          }

          // Update chemical results
          if (item.chemicalResults && Array.isArray(item.chemicalResults)) {
            for (const cr of item.chemicalResults) {
              if (!cr.id) continue;
              await tx.mTCChemicalResult.update({
                where: { id: cr.id },
                data: {
                  ...(cr.heatResult !== undefined && { heatResult: toDecimalOrNull(cr.heatResult) }),
                  ...(cr.productResult !== undefined && { productResult: toDecimalOrNull(cr.productResult) }),
                },
              });
            }
          }

          // Update mechanical results
          if (item.mechanicalResults && Array.isArray(item.mechanicalResults)) {
            for (const mr of item.mechanicalResults) {
              if (!mr.id) continue;
              await tx.mTCMechanicalResult.update({
                where: { id: mr.id },
                data: {
                  ...(mr.result !== undefined && { result: toDecimalOrNull(mr.result) }),
                  ...(mr.specimenForm !== undefined && { specimenForm: mr.specimenForm || null }),
                  ...(mr.orientation !== undefined && { orientation: mr.orientation || null }),
                },
              });
            }
          }

          // Update impact results
          if (item.impactResults && Array.isArray(item.impactResults)) {
            for (const ir of item.impactResults) {
              if (!ir.id) continue;
              await tx.mTCImpactResult.update({
                where: { id: ir.id },
                data: {
                  ...(ir.result1 !== undefined && { result1: toDecimalOrNull(ir.result1) }),
                  ...(ir.result2 !== undefined && { result2: toDecimalOrNull(ir.result2) }),
                  ...(ir.result3 !== undefined && { result3: toDecimalOrNull(ir.result3) }),
                  ...(ir.average !== undefined && { average: toDecimalOrNull(ir.average) }),
                },
              });
            }
          }
        }
      }
    });

    // Reload full certificate
    const certificate = await prisma.mTCCertificate.findUnique({
      where: { id },
      include: {
        customer: true,
        materialSpecRef: true,
        items: {
          include: {
            chemicalResults: { orderBy: { sortOrder: "asc" } },
            mechanicalResults: { orderBy: { sortOrder: "asc" } },
            impactResults: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    await createAuditLog({
      tableName: "MTCCertificate",
      recordId: id,
      action: status ? "STATUS_CHANGE" : "UPDATE",
      ...(status && { fieldName: "status", oldValue: existing.status, newValue: status }),
      userId: session?.user?.id,
      companyId,
    });

    return NextResponse.json({ certificate });
  } catch (error) {
    console.error("Error updating MTC certificate:", error);
    return NextResponse.json(
      { error: "Failed to update MTC certificate" },
      { status: 500 }
    );
  }
}
