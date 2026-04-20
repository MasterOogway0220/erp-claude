import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { softDeleteData } from "@/lib/soft-delete";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; addressId: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const { id, addressId } = await params;
    const body = await request.json();

    // Verify ownership
    const existing = await prisma.customerDispatchAddress.findFirst({
      where: { id: addressId, customerId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    // If setting as default, unset others
    if (body.isDefault) {
      await prisma.customerDispatchAddress.updateMany({
        where: { customerId: id, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    const address = await prisma.customerDispatchAddress.update({
      where: { id: addressId },
      data: {
        label: body.label ?? undefined,
        companyName: body.companyName ?? undefined,
        addressLine1: body.addressLine1 ?? undefined,
        addressLine2: body.addressLine2 ?? undefined,
        city: body.city ?? undefined,
        pincode: body.pincode ?? undefined,
        state: body.state ?? undefined,
        country: body.country ?? undefined,
        contactPerson: body.contactPerson ?? undefined,
        contactNumber: body.contactNumber ?? undefined,
        gstNo: body.gstNo ?? undefined,
        consigneeName: body.consigneeName ?? undefined,
        placeOfSupply: body.placeOfSupply ?? undefined,
        isDefault: body.isDefault ?? undefined,
      },
    });

    await createAuditLog({
      tableName: "CustomerDispatchAddress",
      recordId: addressId,
      action: "UPDATE",
      userId: session.user?.id,
      companyId,
    }).catch(console.error);

    return NextResponse.json(address);
  } catch (error) {
    console.error("Error updating dispatch address:", error);
    return NextResponse.json(
      { error: "Failed to update dispatch address" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; addressId: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("masters", "delete");
    if (!authorized) return response!;

    const { id, addressId } = await params;

    // Verify ownership
    const existing = await prisma.customerDispatchAddress.findFirst({
      where: { id: addressId, customerId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    // Check if address is referenced
    const refCount = await prisma.$transaction([
      prisma.salesOrder.count({ where: { dispatchAddressId: addressId } }),
      prisma.dispatchNote.count({ where: { dispatchAddressId: addressId } }),
      prisma.invoice.count({ where: { dispatchAddressId: addressId } }),
    ]);
    const totalRefs = refCount.reduce((a, b) => a + b, 0);

    if (totalRefs > 0) {
      return NextResponse.json(
        { error: `Cannot delete — address is referenced in ${totalRefs} document(s)` },
        { status: 400 }
      );
    }

    await prisma.customerDispatchAddress.update({ where: { id: addressId }, data: softDeleteData() });

    await createAuditLog({
      tableName: "CustomerDispatchAddress",
      recordId: addressId,
      action: "DELETE",
      userId: session.user?.id,
      companyId,
    }).catch(console.error);

    return NextResponse.json({ message: "Address deleted" });
  } catch (error) {
    console.error("Error deleting dispatch address:", error);
    return NextResponse.json(
      { error: "Failed to delete dispatch address" },
      { status: 500 }
    );
  }
}
