import { NextRequest, NextResponse } from "next/server";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";

const VALID_TEST_TYPES = ["HYDRO", "CHEMICAL", "MECHANICAL", "IGC", "IMPACT"];
const VALID_LOCATIONS = ["WAREHOUSE", "LAB"];

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("qualityRequirement", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where: any = {
      ...notDeleted,
      ...companyFilter(companyId),
    };

    if (search) {
      where.OR = [
        { parameter: { contains: search } },
        { value: { contains: search } },
        { testType: { contains: search } },
        { remarks: { contains: search } },
      ];
    }

    const requirements = await prisma.qualityRequirement.findMany({
      where,
      include: {
        tpiAgency: { select: { id: true, name: true, code: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ requirements });
  } catch (error) {
    console.error("Error fetching quality requirements:", error);
    return NextResponse.json(
      { error: "Failed to fetch quality requirements" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("qualityRequirement", "write");
    if (!authorized) return response!;

    const body = await request.json();

    if (!body.parameter?.trim()) {
      return NextResponse.json(
        { error: "Parameter name is required" },
        { status: 400 }
      );
    }

    if (body.testType && !VALID_TEST_TYPES.includes(body.testType)) {
      return NextResponse.json(
        { error: `Invalid test type. Must be one of: ${VALID_TEST_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (body.inspectionLocation && !VALID_LOCATIONS.includes(body.inspectionLocation)) {
      return NextResponse.json(
        { error: `Invalid inspection location. Must be one of: ${VALID_LOCATIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate TPI agency exists if provided
    if (body.tpiAgencyId) {
      const agency = await prisma.inspectionAgencyMaster.findUnique({
        where: { id: body.tpiAgencyId },
      });
      if (!agency) {
        return NextResponse.json(
          { error: "Selected TPI agency not found" },
          { status: 400 }
        );
      }
    }

    const requirement = await prisma.qualityRequirement.create({
      data: {
        companyId: companyId || null,
        parameter: body.parameter.trim(),
        value: body.value || null,
        colourCodingRequired: body.colourCodingRequired === true,
        inspectionRequired: body.inspectionRequired === true,
        tpiAgencyId: body.tpiAgencyId || null,
        testingRequired: body.testingRequired === true,
        testType: body.testingRequired ? (body.testType || null) : null,
        inspectionLocation: body.inspectionRequired ? (body.inspectionLocation || null) : null,
        qapDocumentPath: body.qapDocumentPath || null,
        remarks: body.remarks || null,
      },
      include: {
        tpiAgency: { select: { id: true, name: true, code: true } },
      },
    });

    await createAuditLog({
      tableName: "QualityRequirement",
      recordId: requirement.id,
      action: "CREATE",
      userId: session.user?.id,
      companyId,
    });

    return NextResponse.json(requirement, { status: 201 });
  } catch (error) {
    console.error("Error creating quality requirement:", error);
    return NextResponse.json(
      { error: "Failed to create quality requirement" },
      { status: 500 }
    );
  }
}
