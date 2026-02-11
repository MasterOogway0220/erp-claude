import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      addressLine1,
      city,
      state,
      country,
      approvedStatus,
      productsSupplied,
      avgLeadTimeDays,
      performanceScore,
      contactPerson,
      email,
      phone,
      isActive,
    } = body;

    const updated = await prisma.vendorMaster.update({
      where: { id: params.id },
      data: {
        name,
        addressLine1: addressLine1 || null,
        city: city || null,
        state: state || null,
        country: country || "India",
        approvedStatus: approvedStatus ?? true,
        productsSupplied: productsSupplied || null,
        avgLeadTimeDays: avgLeadTimeDays ? parseInt(avgLeadTimeDays) : null,
        performanceScore: performanceScore ? parseFloat(performanceScore) : null,
        contactPerson: contactPerson || null,
        email: email || null,
        phone: phone || null,
        isActive: isActive ?? true,
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.vendorMaster.delete({
      where: { id: params.id },
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
