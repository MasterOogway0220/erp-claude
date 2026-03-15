import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { checkAccess, companyFilter } from "@/lib/rbac";

function randomInRange(min: number, max: number, decimals: number = 3): number {
  const value = min + Math.random() * (max - min);
  return parseFloat(value.toFixed(decimals));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("mtc", "write");
    if (!authorized) return response!;

    const { id } = await params;

    // Load certificate with items and results
    const certificate = await prisma.mTCCertificate.findFirst({
      where: { id, ...companyFilter(companyId) },
      include: {
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
      },
    });

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }

    if (!certificate.materialSpecRef) {
      return NextResponse.json(
        { error: "Material specification not found for this certificate" },
        { status: 400 }
      );
    }

    const spec = certificate.materialSpecRef;

    // Build a lookup map from element name to spec ranges
    const elementSpecMap = new Map(
      spec.chemicalElements.map((el) => [
        el.element,
        {
          resultMinValue: el.resultMinValue,
          resultMaxValue: el.resultMaxValue,
        },
      ])
    );

    // Build a lookup map from property name to spec ranges
    const mechSpecMap = new Map(
      spec.mechanicalProperties.map((mp) => [
        mp.propertyName,
        {
          resultMinValue: mp.resultMinValue,
          resultMaxValue: mp.resultMaxValue,
        },
      ])
    );

    await prisma.$transaction(async (tx) => {
      for (const item of certificate.items) {
        // Generate chemical results
        // First pass: generate all element values so we can compute derived values
        const generatedChemValues: Record<string, number> = {};

        for (const cr of item.chemicalResults) {
          const specRange = elementSpecMap.get(cr.element);
          const rMin = Number(specRange?.resultMinValue ?? cr.minValue ?? 0);
          const rMax = Number(specRange?.resultMaxValue ?? cr.maxValue ?? 1);

          if (rMin <= rMax) {
            const heatResult = randomInRange(rMin, rMax, 3);
            // Product result slightly different from heat result
            const productDeviation = (rMax - rMin) * 0.1;
            let productResult = heatResult + randomInRange(-productDeviation, productDeviation, 3);
            // Clamp product result within spec range
            productResult = Math.max(rMin, Math.min(rMax, productResult));
            productResult = parseFloat(productResult.toFixed(3));

            generatedChemValues[cr.element] = heatResult;

            await tx.mTCChemicalResult.update({
              where: { id: cr.id },
              data: {
                heatResult,
                productResult,
              },
            });
          }
        }

        // Calculate derived values F1 and CEQ
        const C = generatedChemValues["C"] || 0;
        const Mn = generatedChemValues["Mn"] || 0;
        const Cr = generatedChemValues["Cr"] || 0;
        const Mo = generatedChemValues["Mo"] || 0;
        const V = generatedChemValues["V"] || 0;
        const Ni = generatedChemValues["Ni"] || 0;
        const Cu = generatedChemValues["Cu"] || 0;

        const F1 = parseFloat((Cu + Ni + Cr + Mo).toFixed(3));
        const CEQ = parseFloat(
          (C + Mn / 6 + (Cr + Mo + V) / 5 + (Ni + Cu) / 15).toFixed(3)
        );

        // Update F1 and CEQ if they exist as results
        for (const cr of item.chemicalResults) {
          if (cr.element === "F1") {
            await tx.mTCChemicalResult.update({
              where: { id: cr.id },
              data: { heatResult: F1, productResult: F1 },
            });
          } else if (cr.element === "CEQ") {
            await tx.mTCChemicalResult.update({
              where: { id: cr.id },
              data: { heatResult: CEQ, productResult: CEQ },
            });
          }
        }

        // Generate mechanical results
        for (const mr of item.mechanicalResults) {
          const specRange = mechSpecMap.get(mr.propertyName);
          const rMin = Number(specRange?.resultMinValue ?? mr.minValue ?? 0);
          const rMax = Number(specRange?.resultMaxValue ?? mr.maxValue ?? 100);

          if (rMin <= rMax) {
            const result = randomInRange(rMin, rMax, 2);
            await tx.mTCMechanicalResult.update({
              where: { id: mr.id },
              data: { result },
            });
          }
        }

        // Generate impact results
        for (const ir of item.impactResults) {
          // Find matching spec impact property
          const specImpact = spec.impactProperties.find(
            (ip) =>
              ip.testTemperature === ir.testTemperature &&
              ip.specimenSize === ir.specimenSize
          );

          const rMin = Number(specImpact?.resultMinValue ?? 27);
          const rMax = Number(specImpact?.resultMaxValue ?? 100);

          const result1 = randomInRange(rMin, rMax, 2);
          const result2 = randomInRange(rMin, rMax, 2);
          const result3 = randomInRange(rMin, rMax, 2);
          const average = parseFloat(((result1 + result2 + result3) / 3).toFixed(2));

          await tx.mTCImpactResult.update({
            where: { id: ir.id },
            data: { result1, result2, result3, average },
          });
        }
      }
    });

    // Reload the full certificate with updated results
    const updatedCertificate = await prisma.mTCCertificate.findUnique({
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
      action: "UPDATE",
      fieldName: "results",
      newValue: "Auto-generated test results",
      userId: session?.user?.id,
      companyId,
    });

    return NextResponse.json({ certificate: updatedCertificate });
  } catch (error) {
    console.error("Error generating MTC results:", error);
    return NextResponse.json(
      { error: "Failed to generate test results" },
      { status: 500 }
    );
  }
}
