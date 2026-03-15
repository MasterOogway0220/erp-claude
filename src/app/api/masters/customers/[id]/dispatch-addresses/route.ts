import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response, companyId } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const { id } = await params;
    const addresses = await prisma.customerDispatchAddress.findMany({
      where: { customerId: id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
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
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();

    // If this is set as default, unset other defaults first
    if (body.isDefault) {
      await prisma.customerDispatchAddress.updateMany({
        where: { customerId: id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.customerDispatchAddress.create({
      data: {
        customerId: id,
        label: body.label || null,
        companyName: body.companyName || null,
        addressLine1: body.addressLine1 || null,
        addressLine2: body.addressLine2 || null,
        city: body.city || null,
        pincode: body.pincode || null,
        state: body.state || null,
        country: body.country || "India",
        contactPerson: body.contactPerson || null,
        contactNumber: body.contactNumber || null,
        gstNo: body.gstNo || null,
        consigneeName: body.consigneeName || null,
        placeOfSupply: body.placeOfSupply || body.state || null,
        isDefault: body.isDefault ?? false,
      },
    });

    await createAuditLog({
      tableName: "CustomerDispatchAddress",
      recordId: address.id,
      action: "CREATE",
      userId: session.user?.id,
      companyId,
    }).catch(console.error);

    return NextResponse.json(address, { status: 201 });
  } catch (error) {
    console.error("Error creating dispatch address:", error);
    return NextResponse.json(
      { error: "Failed to create dispatch address" },
      { status: 500 }
    );
  }
}
