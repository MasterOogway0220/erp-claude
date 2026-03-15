import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { generateDocumentNumber } from "@/lib/document-numbering";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("labLetter", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: any = { ...companyFilter(companyId) };

    if (search) {
      where.OR = [
        { letterNo: { contains: search } },
        { heatNo: { contains: search } },
        { labName: { contains: search } },
        { clientName: { contains: search } },
        { poNumber: { contains: search } },
        { specification: { contains: search } },
        { itemCode: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const labLetters = await prisma.labLetter.findMany({
      where,
      include: {
        generatedBy: {
          select: { id: true, name: true },
        },
        tpiAgency: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { letterDate: "desc" },
    });

    return NextResponse.json({ labLetters });
  } catch (error) {
    console.error("Error fetching lab letters:", error);
    return NextResponse.json(
      { error: "Failed to fetch lab letters" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("labLetter", "write");
    if (!authorized) return response!;

    const body = await request.json();

    if (!body.heatNo) {
      return NextResponse.json(
        { error: "Heat number is required" },
        { status: 400 }
      );
    }

    if (!body.testIds || body.testIds.length === 0) {
      return NextResponse.json(
        { error: "At least one test must be selected" },
        { status: 400 }
      );
    }

    // Resolve test names from IDs for denormalized storage
    let testNames: string[] = [];
    if (body.testIds?.length > 0) {
      const tests = await prisma.testingMaster.findMany({
        where: { id: { in: body.testIds } },
        select: { testName: true },
      });
      testNames = tests.map((t) => t.testName);
    }

    // Resolve TPI agency name if provided
    let tpiAgencyName: string | null = null;
    if (body.tpiAgencyId) {
      const agency = await prisma.inspectionAgencyMaster.findUnique({
        where: { id: body.tpiAgencyId },
        select: { name: true },
      });
      tpiAgencyName = agency?.name || null;
    }

    const letterNo = await generateDocumentNumber("LAB_LETTER", companyId);

    const labLetter = await prisma.labLetter.create({
      data: {
        letterNo,
        companyId,
        labName: body.labName || null,
        labAddress: body.labAddress || null,
        inventoryStockId: body.inventoryStockId || null,
        poNumber: body.poNumber || null,
        clientName: body.clientName || null,
        productDescription: body.productDescription || null,
        itemCode: body.itemCode || null,
        heatNo: body.heatNo || null,
        make: body.make || null,
        specification: body.specification || null,
        sizeLabel: body.sizeLabel || null,
        quantity: body.quantity || null,
        unit: body.unit || null,
        testIds: body.testIds || null,
        testNames: testNames.length > 0 ? (testNames as any) : null,
        witnessRequired: body.witnessRequired ?? false,
        tpiAgencyId: body.tpiAgencyId || null,
        tpiAgencyName,
        remarks: body.remarks || null,
        generatedById: session.user.id,
      },
      include: {
        generatedBy: {
          select: { id: true, name: true },
        },
        tpiAgency: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    await createAuditLog({
      tableName: "LabLetter",
      recordId: labLetter.id,
      action: "CREATE",
      userId: session.user.id,
      companyId,
    }).catch(console.error);

    return NextResponse.json(labLetter, { status: 201 });
  } catch (error) {
    console.error("Error creating lab letter:", error);
    return NextResponse.json(
      { error: "Failed to create lab letter" },
      { status: 500 }
    );
  }
}
