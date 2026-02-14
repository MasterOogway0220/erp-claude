import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const { id } = await params;
    const addresses = await prisma.customerDispatchAddress.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ addresses });
  } catch (error) {
    console.error("Error fetching dispatch addresses:", error);
    return NextResponse.json(
      { error: "Failed to fetch dispatch addresses" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();

    const address = await prisma.customerDispatchAddress.create({
      data: {
        customerId: id,
        label: body.label || null,
        addressLine1: body.addressLine1 || null,
        addressLine2: body.addressLine2 || null,
        city: body.city || null,
        pincode: body.pincode || null,
        state: body.state || null,
        country: body.country || "India",
        consigneeName: body.consigneeName || null,
        placeOfSupply: body.placeOfSupply || null,
        isDefault: body.isDefault ?? false,
      },
    });

    return NextResponse.json(address, { status: 201 });
  } catch (error) {
    console.error("Error creating dispatch address:", error);
    return NextResponse.json(
      { error: "Failed to create dispatch address" },
      { status: 500 }
    );
  }
}
