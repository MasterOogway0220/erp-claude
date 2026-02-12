import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { productsSupplied: { contains: search, mode: "insensitive" as const } },
            { gstNo: { contains: search, mode: "insensitive" as const } },
            { contactPerson: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const vendors = await prisma.vendorMaster.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ vendors });
  } catch (error) {
    console.error("Error fetching vendors:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendors" },
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
    const {
      name,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      pincode,
      approvedStatus,
      productsSupplied,
      avgLeadTimeDays,
      performanceScore,
      contactPerson,
      email,
      phone,
      gstNo,
      gstType,
      bankAccountNo,
      bankIfsc,
      bankName,
      vendorRating,
      approvalDate,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Vendor name is required" },
        { status: 400 }
      );
    }

    const newVendor = await prisma.vendorMaster.create({
      data: {
        name,
        addressLine1: addressLine1 || null,
        addressLine2: addressLine2 || null,
        city: city || null,
        state: state || null,
        country: country || "India",
        pincode: pincode || null,
        approvedStatus: approvedStatus ?? true,
        productsSupplied: productsSupplied || null,
        avgLeadTimeDays: avgLeadTimeDays ? parseInt(avgLeadTimeDays) : null,
        performanceScore: performanceScore ? parseFloat(performanceScore) : null,
        contactPerson: contactPerson || null,
        email: email || null,
        phone: phone || null,
        gstNo: gstNo || null,
        gstType: gstType || null,
        bankAccountNo: bankAccountNo || null,
        bankIfsc: bankIfsc || null,
        bankName: bankName || null,
        vendorRating: vendorRating ? parseFloat(vendorRating) : null,
        approvalDate: approvalDate ? new Date(approvalDate) : null,
      },
    });

    return NextResponse.json(newVendor, { status: 201 });
  } catch (error) {
    console.error("Error creating vendor:", error);
    return NextResponse.json(
      { error: "Failed to create vendor" },
      { status: 500 }
    );
  }
}
