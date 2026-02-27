import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { productsSupplied: { contains: search } },
            { gstNo: { contains: search } },
            { contactPerson: { contains: search } },
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
    const { authorized, session, response } = await checkAccess("masters", "write");
    if (!authorized) return response!;

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

    createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      tableName: "VendorMaster",
      recordId: newVendor.id,
      newValue: JSON.stringify({ name: newVendor.name }),
    }).catch(console.error);

    return NextResponse.json(newVendor, { status: 201 });
  } catch (error) {
    console.error("Error creating vendor:", error);
    return NextResponse.json(
      { error: "Failed to create vendor" },
      { status: 500 }
    );
  }
}
