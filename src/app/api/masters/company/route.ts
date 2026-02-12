import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const company = await prisma.companyMaster.findFirst();
    return NextResponse.json({ company });
  } catch (error) {
    console.error("Error fetching company:", error);
    return NextResponse.json(
      { error: "Failed to fetch company" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Check if company already exists
    const existing = await prisma.companyMaster.findFirst();
    if (existing) {
      return NextResponse.json(
        { error: "Company already exists. Use PATCH to update." },
        { status: 400 }
      );
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
      },
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

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const existing = await prisma.companyMaster.findFirst();

    if (!existing) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    const company = await prisma.companyMaster.update({
      where: { id: existing.id },
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
      },
    });

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json(
      { error: "Failed to update company" },
      { status: 500 }
    );
  }
}
