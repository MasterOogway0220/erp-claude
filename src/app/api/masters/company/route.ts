import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { authorized, session, response, companyId } = await checkAccess("admin", "read");
    if (!authorized) return response!;

    const userRole = session.user?.role;

    // ADMIN users only see their own company; SUPER_ADMIN sees all
    const where: any = {};
    if (userRole === "ADMIN" && companyId) {
      where.id = companyId;
    }

    const companies = await prisma.companyMaster.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { users: true, employees: true } },
      },
    });
    return NextResponse.json({ companies });
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("admin", "write");
    if (!authorized) return response!;

    // Only SUPER_ADMIN can create new companies
    if (session.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only Super Admin can create new companies" },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!body.companyName) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    const company = await prisma.companyMaster.create({
      data: {
        companyName: body.companyName,
        companyType: body.companyType || null,
        regAddressLine1: body.regAddressLine1 || null,
        regAddressLine2: body.regAddressLine2 || null,
        regCity: body.regCity || null,
        regPincode: body.regPincode || null,
        regState: body.regState || null,
        regCountry: body.regCountry || "India",
        whAddressLine1: body.whAddressLine1 || null,
        whAddressLine2: body.whAddressLine2 || null,
        whCity: body.whCity || null,
        whPincode: body.whPincode || null,
        whState: body.whState || null,
        whCountry: body.whCountry || "India",
        panNo: body.panNo || null,
        tanNo: body.tanNo || null,
        gstNo: body.gstNo || null,
        cinNo: body.cinNo || null,
        telephoneNo: body.telephoneNo || null,
        email: body.email || null,
        website: body.website || null,
        companyLogoUrl: body.companyLogoUrl || null,
        fyStartMonth: body.fyStartMonth ?? 4,
        fyStartDate: body.fyStartDate ? new Date(body.fyStartDate) : null,
        fyEndDate: body.fyEndDate ? new Date(body.fyEndDate) : null,
      },
    });

    await createAuditLog({
      tableName: "CompanyMaster",
      recordId: company.id,
      action: "CREATE",
      userId: session.user?.id,
      companyId,
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    );
  }
}
