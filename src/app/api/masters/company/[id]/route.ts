import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, session, response } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.companyMaster.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const company = await prisma.companyMaster.update({
      where: { id },
      data: {
        companyName: body.companyName ?? existing.companyName,
        companyType: body.companyType ?? existing.companyType,
        regAddressLine1: body.regAddressLine1 ?? existing.regAddressLine1,
        regAddressLine2: body.regAddressLine2 ?? existing.regAddressLine2,
        regCity: body.regCity ?? existing.regCity,
        regPincode: body.regPincode ?? existing.regPincode,
        regState: body.regState ?? existing.regState,
        regCountry: body.regCountry ?? existing.regCountry,
        whAddressLine1: body.whAddressLine1 ?? existing.whAddressLine1,
        whAddressLine2: body.whAddressLine2 ?? existing.whAddressLine2,
        whCity: body.whCity ?? existing.whCity,
        whPincode: body.whPincode ?? existing.whPincode,
        whState: body.whState ?? existing.whState,
        whCountry: body.whCountry ?? existing.whCountry,
        panNo: body.panNo ?? existing.panNo,
        tanNo: body.tanNo ?? existing.tanNo,
        gstNo: body.gstNo ?? existing.gstNo,
        cinNo: body.cinNo ?? existing.cinNo,
        telephoneNo: body.telephoneNo ?? existing.telephoneNo,
        email: body.email ?? existing.email,
        website: body.website ?? existing.website,
        companyLogoUrl: body.companyLogoUrl ?? existing.companyLogoUrl,
        fyStartMonth: body.fyStartMonth ?? existing.fyStartMonth,
        fyStartDate: body.fyStartDate !== undefined ? (body.fyStartDate ? new Date(body.fyStartDate) : null) : existing.fyStartDate,
        fyEndDate: body.fyEndDate !== undefined ? (body.fyEndDate ? new Date(body.fyEndDate) : null) : existing.fyEndDate,
      },
    });

    await createAuditLog({
      tableName: "CompanyMaster",
      recordId: id,
      action: "UPDATE",
      userId: session.user?.id,
    });

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json({ error: "Failed to update company" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, session, response } = await checkAccess("masters", "delete");
    if (!authorized) return response!;

    const { id } = await params;
    const existing = await prisma.companyMaster.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    await prisma.companyMaster.delete({ where: { id } });

    await createAuditLog({
      tableName: "CompanyMaster",
      recordId: id,
      action: "DELETE",
      userId: session.user?.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json({ error: "Failed to delete company" }, { status: 500 });
  }
}
