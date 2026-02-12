import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const vendor = await prisma.vendorMaster.findUnique({
      where: { id },
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json(vendor);
  } catch (error) {
    console.error("Error fetching vendor:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendor" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      isActive,
    } = body;

    const updated = await prisma.vendorMaster.update({
      where: { id },
      data: {
        name,
        addressLine1: addressLine1 ?? undefined,
        addressLine2: addressLine2 ?? undefined,
        city: city ?? undefined,
        state: state ?? undefined,
        country: country ?? undefined,
        pincode: pincode ?? undefined,
        approvedStatus: approvedStatus ?? undefined,
        productsSupplied: productsSupplied ?? undefined,
        avgLeadTimeDays: avgLeadTimeDays !== undefined ? (avgLeadTimeDays ? parseInt(avgLeadTimeDays) : null) : undefined,
        performanceScore: performanceScore !== undefined ? (performanceScore ? parseFloat(performanceScore) : null) : undefined,
        contactPerson: contactPerson ?? undefined,
        email: email ?? undefined,
        phone: phone ?? undefined,
        gstNo: gstNo ?? undefined,
        gstType: gstType ?? undefined,
        bankAccountNo: bankAccountNo ?? undefined,
        bankIfsc: bankIfsc ?? undefined,
        bankName: bankName ?? undefined,
        vendorRating: vendorRating !== undefined ? (vendorRating ? parseFloat(vendorRating) : null) : undefined,
        approvalDate: approvalDate !== undefined ? (approvalDate ? new Date(approvalDate) : null) : undefined,
        isActive: isActive ?? undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating vendor:", error);
    return NextResponse.json(
      { error: "Failed to update vendor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.vendorMaster.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting vendor:", error);
    return NextResponse.json(
      { error: "Failed to delete vendor" },
      { status: 500 }
    );
  }
}
