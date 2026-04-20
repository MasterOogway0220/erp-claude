import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { softDeleteData } from "@/lib/soft-delete";

const VALID_TEST_TYPES = ["HYDRO", "CHEMICAL", "MECHANICAL", "IGC", "IMPACT"];
const VALID_LOCATIONS = ["WAREHOUSE", "LAB"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("qualityRequirement", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const requirement = await prisma.qualityRequirement.findUnique({
      where: { id },
      include: {
        tpiAgency: { select: { id: true, name: true, code: true } },
      },
    });

    if (!requirement) {
      return NextResponse.json(
        { error: "Quality requirement not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(requirement);
  } catch (error) {
    console.error("Error fetching quality requirement:", error);
    return NextResponse.json(
      { error: "Failed to fetch quality requirement" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("qualityRequirement", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();

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

    const requirement = await prisma.qualityRequirement.update({
      where: { id },
      data: {
        parameter: body.parameter?.trim() ?? undefined,
        value: body.value ?? undefined,
        colourCodingRequired: body.colourCodingRequired ?? undefined,
        inspectionRequired: body.inspectionRequired ?? undefined,
        tpiAgencyId: body.tpiAgencyId !== undefined ? (body.tpiAgencyId || null) : undefined,
        testingRequired: body.testingRequired ?? undefined,
        testType: body.testType !== undefined ? (body.testType || null) : undefined,
        inspectionLocation: body.inspectionLocation !== undefined ? (body.inspectionLocation || null) : undefined,
        qapDocumentPath: body.qapDocumentPath !== undefined ? (body.qapDocumentPath || null) : undefined,
        remarks: body.remarks ?? undefined,
        isActive: body.isActive ?? undefined,
      },
      include: {
        tpiAgency: { select: { id: true, name: true, code: true } },
      },
    });

    await createAuditLog({
      tableName: "QualityRequirement",
      recordId: id,
      action: "UPDATE",
      userId: session.user?.id,
      companyId,
    });

    return NextResponse.json(requirement);
  } catch (error) {
    console.error("Error updating quality requirement:", error);
    return NextResponse.json(
      { error: "Failed to update quality requirement" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("qualityRequirement", "delete");
    if (!authorized) return response!;

    const { id } = await params;

    const requirement = await prisma.qualityRequirement.findUnique({
      where: { id },
      select: { parameter: true },
    });

    if (!requirement) {
      return NextResponse.json(
        { error: "Quality requirement not found" },
        { status: 404 }
      );
    }

    await prisma.qualityRequirement.update({ where: { id }, data: softDeleteData(true) });

    await createAuditLog({
      tableName: "QualityRequirement",
      recordId: id,
      action: "DELETE",
      userId: session.user?.id,
      companyId,
    });

    return NextResponse.json({ message: "Quality requirement deleted successfully" });
  } catch (error) {
    console.error("Error deleting quality requirement:", error);
    return NextResponse.json(
      { error: "Failed to delete quality requirement" },
      { status: 500 }
    );
  }
}
