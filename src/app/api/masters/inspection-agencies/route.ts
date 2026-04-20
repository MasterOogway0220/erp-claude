import { NextRequest, NextResponse } from "next/server";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";

export async function GET() {
  try {
    const { authorized, response, companyId } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const agencies = await prisma.inspectionAgencyMaster.findMany({
      where: { ...notDeleted, ...companyFilter(companyId) },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ agencies });
  } catch (error) {
    console.error("Error fetching inspection agencies:", error);
    return NextResponse.json(
      { error: "Failed to fetch inspection agencies" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();

    if (!body.name || !body.code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    const agency = await prisma.inspectionAgencyMaster.create({
      data: {
        code: body.code,
        name: body.name,
        contactPerson: body.contactPerson || null,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        accreditationDetails: body.accreditationDetails || null,
        approvedStatus: body.approvedStatus ?? true,
        isActive: body.isActive ?? true,
        companyId,
      },
    });

    await createAuditLog({
      tableName: "InspectionAgencyMaster",
      recordId: agency.id,
      action: "CREATE",
      userId: session.user?.id,
      companyId,
    });

    return NextResponse.json(agency, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Inspection agency code already exists" },
        { status: 400 }
      );
    }
    console.error("Error creating inspection agency:", error);
    return NextResponse.json(
      { error: "Failed to create inspection agency" },
      { status: 500 }
    );
  }
}
