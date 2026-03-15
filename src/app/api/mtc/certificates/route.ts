import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("mtc", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const issuedAgainst = searchParams.get("issuedAgainst") || "";

    const where: any = { ...companyFilter(companyId) };

    if (search) {
      where.OR = [
        { certificateNo: { contains: search } },
        { customerName: { contains: search } },
        { poNo: { contains: search } },
        { quotationNo: { contains: search } },
        { projectName: { contains: search } },
        { materialSpec: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (issuedAgainst) {
      where.issuedAgainst = issuedAgainst;
    }

    const certificates = await prisma.mTCCertificate.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true },
        },
        materialSpecRef: {
          select: { id: true, materialSpec: true, description: true },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ certificates });
  } catch (error) {
    console.error("Error fetching MTC certificates:", error);
    return NextResponse.json(
      { error: "Failed to fetch MTC certificates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("mtc", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const {
      issuedAgainst,
      customerId,
      poNo,
      poDate,
      quotationId,
      quotationNo,
      projectName,
      otherReference,
      materialSpecId,
      additionalRequirement,
      notes,
      remarks,
      items = [],
    } = body;

    if (!materialSpecId) {
      return NextResponse.json(
        { error: "Material specification is required" },
        { status: 400 }
      );
    }

    // Look up material spec
    const materialSpecData = await prisma.mTCMaterialSpec.findUnique({
      where: { id: materialSpecId },
      include: {
        chemicalElements: { orderBy: { sortOrder: "asc" } },
        mechanicalProperties: { orderBy: { sortOrder: "asc" } },
        impactProperties: true,
      },
    });

    if (!materialSpecData) {
      return NextResponse.json(
        { error: "Material specification not found" },
        { status: 404 }
      );
    }

    // Look up customer name if customerId provided
    let customerName = body.customerName || "";
    if (customerId) {
      const customer = await prisma.customerMaster.findUnique({
        where: { id: customerId },
        select: { name: true },
      });
      if (customer) {
        customerName = customer.name;
      }
    }

    // Generate certificate number
    const certificateNo = await generateDocumentNumber("MTC_CERTIFICATE", companyId);

    // Generate heat numbers for items that don't have one
    const now = new Date();
    const dateStr = `${(now.getFullYear() % 100).toString().padStart(2, "0")}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}`;
    let heatCounter = 1;

    // Helper to parse size string and extract numeric value (inches)
    function parseSizeInches(size: string | number | null | undefined): number {
      if (size === null || size === undefined) return 0;
      const s = String(size).trim();
      // Try to parse as number directly
      const num = parseFloat(s);
      if (!isNaN(num)) return num;
      // Handle fraction format like "3/4"
      const fractionMatch = s.match(/^(\d+)\/(\d+)$/);
      if (fractionMatch) {
        return parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
      }
      // Handle mixed fraction like "1 1/2"
      const mixedMatch = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
      if (mixedMatch) {
        return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);
      }
      return 0;
    }

    // Process items: auto-determine specimenForm, orientation, and heatNo
    const processedItems = items.map((item: any, index: number) => {
      let heatNo = item.heatNo;
      if (!heatNo) {
        heatNo = `H-${dateStr}-${heatCounter.toString().padStart(3, "0")}`;
        heatCounter++;
      }

      // Determine specimen form
      let specimenForm = item.specimenForm;
      if (!specimenForm) {
        const ct = item.constructionType || materialSpecData.constructionType || "";
        if (ct.toUpperCase() === "FORGED") {
          specimenForm = "R";
        } else {
          const wt1 = parseFloat(item.sizeWT1) || 0;
          specimenForm = wt1 >= 19 ? "R" : "S";
        }
      }

      // Determine orientation
      let orientation = item.orientation;
      if (!orientation) {
        const ct = item.constructionType || materialSpecData.constructionType || "";
        if (ct.toUpperCase() === "FORGED") {
          orientation = "L";
        } else {
          const sizeOD = parseSizeInches(item.sizeOD1);
          orientation = sizeOD >= 8 ? "T" : "L";
        }
      }

      return {
        itemNo: item.itemNo || index + 1,
        description: item.description || "",
        constructionType: item.constructionType || materialSpecData.constructionType || "",
        dimensionStandard: item.dimensionStandard || materialSpecData.dimensionStandard || "",
        sizeOD1: item.sizeOD1 || "",
        sizeWT1: item.sizeWT1 || "",
        sizeOD2: item.sizeOD2 || "",
        sizeWT2: item.sizeWT2 || "",
        quantity: item.quantity || 0,
        heatNo,
        rawMaterial: item.rawMaterial || "",
        clientItemCode: item.clientItemCode || "",
        specimenForm,
        orientation,
        sortOrder: index,
      };
    });

    // Create certificate with items in a transaction
    const certificate = await prisma.$transaction(async (tx) => {
      const cert = await tx.mTCCertificate.create({
        data: {
          companyId: companyId || undefined,
          certificateNo,
          certificateDate: new Date(),
          issuedAgainst: issuedAgainst || "PURCHASE_ORDER",
          customerId: customerId || undefined,
          customerName,
          poNo: poNo || "",
          poDate: poDate ? new Date(poDate) : undefined,
          quotationId: quotationId || undefined,
          quotationNo: quotationNo || "",
          projectName: projectName || "",
          otherReference: otherReference || "",
          materialSpecId,
          materialSpec: materialSpecData.materialSpec,
          additionalRequirement: additionalRequirement || "",
          startingMaterial: materialSpecData.startingMaterial || "",
          heatTreatment: materialSpecData.heatTreatment || "",
          revision: 0,
          status: "DRAFT",
          notes: notes || materialSpecData.defaultNotes || "",
          remarks: remarks || "",
          createdById: session?.user?.id,
          items: {
            create: processedItems,
          },
        },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
        },
      });

      // Create chemical results for each item from spec
      for (const item of cert.items) {
        if (materialSpecData.chemicalElements.length > 0) {
          await tx.mTCChemicalResult.createMany({
            data: materialSpecData.chemicalElements.map((el) => ({
              certificateItemId: item.id,
              element: el.element,
              sortOrder: el.sortOrder,
              minValue: el.minValue,
              maxValue: el.maxValue,
              heatResult: null,
              productResult: null,
            })),
          });
        }

        // Create mechanical results for each item from spec
        if (materialSpecData.mechanicalProperties.length > 0) {
          await tx.mTCMechanicalResult.createMany({
            data: materialSpecData.mechanicalProperties.map((mp) => ({
              certificateItemId: item.id,
              propertyName: mp.propertyName,
              unit: mp.unit,
              sortOrder: mp.sortOrder,
              minValue: mp.minValue,
              maxValue: mp.maxValue,
              result: null,
              specimenForm: item.specimenForm || null,
              orientation: item.orientation || null,
            })),
          });
        }

        // Create impact results for each item from spec
        if (materialSpecData.impactProperties.length > 0) {
          await tx.mTCImpactResult.createMany({
            data: materialSpecData.impactProperties.map((ip) => ({
              certificateItemId: item.id,
              testTemperature: ip.testTemperature,
              specimenSize: ip.specimenSize,
              result1: null,
              result2: null,
              result3: null,
              average: null,
            })),
          });
        }
      }

      return cert;
    });

    // Reload with all nested data
    const fullCertificate = await prisma.mTCCertificate.findUnique({
      where: { id: certificate.id },
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
      recordId: certificate.id,
      action: "CREATE",
      newValue: certificateNo,
      userId: session?.user?.id,
      companyId,
    });

    return NextResponse.json({ certificate: fullCertificate }, { status: 201 });
  } catch (error) {
    console.error("Error creating MTC certificate:", error);
    return NextResponse.json(
      { error: "Failed to create MTC certificate" },
      { status: 500 }
    );
  }
}
