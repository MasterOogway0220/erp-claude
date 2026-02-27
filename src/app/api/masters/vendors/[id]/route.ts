import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response } = await checkAccess("masters", "read");
    if (!authorized) return response!;

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
    const { authorized, session, response } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { action } = body;

    // Handle approval workflow actions
    if (action === "approve" || action === "reject") {
      const userRole = session.user.role;
      if (userRole !== "MANAGEMENT" && userRole !== "ADMIN") {
        return NextResponse.json(
          { error: "Only MANAGEMENT or ADMIN can approve/reject vendors" },
          { status: 403 }
        );
      }

      const vendor = await prisma.vendorMaster.findUnique({
        where: { id },
        select: { name: true },
      });
      if (!vendor) {
        return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
      }

      if (action === "approve") {
        const updated = await prisma.vendorMaster.update({
          where: { id },
          data: {
            approvedStatus: true,
            approvedById: session.user.id,
            approvalDate: new Date(),
            approvalRemarks: body.approvalRemarks || null,
          },
          include: {
            approvedBy: { select: { id: true, name: true, email: true } },
          },
        });

        createAuditLog({
          userId: session.user.id,
          action: "APPROVE",
          tableName: "VendorMaster",
          recordId: id,
          fieldName: "approvedStatus",
          oldValue: "false",
          newValue: "true",
        }).catch(console.error);

        return NextResponse.json(updated);
      }

      // action === "reject"
      if (!body.approvalRemarks?.trim()) {
        return NextResponse.json(
          { error: "Remarks are required when rejecting a vendor" },
          { status: 400 }
        );
      }

      const updated = await prisma.vendorMaster.update({
        where: { id },
        data: {
          approvedStatus: false,
          approvedById: null,
          approvalDate: null,
          approvalRemarks: body.approvalRemarks,
        },
      });

      createAuditLog({
        userId: session.user.id,
        action: "REJECT",
        tableName: "VendorMaster",
        recordId: id,
        fieldName: "approvedStatus",
        oldValue: "true",
        newValue: "false",
      }).catch(console.error);

      return NextResponse.json(updated);
    }

    // Standard field update
    const {
      name,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      pincode,
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
        isActive: isActive ?? undefined,
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      tableName: "VendorMaster",
      recordId: id,
      newValue: JSON.stringify({ name: updated.name }),
    }).catch(console.error);

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
    const { authorized, session, response } = await checkAccess("masters", "delete");
    if (!authorized) return response!;

    // Check for linked records before deleting
    const vendor = await prisma.vendorMaster.findUnique({
      where: { id },
      select: {
        name: true,
        _count: {
          select: {
            purchaseOrders: true,
            ncrs: true,
          },
        },
      },
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const linkedCount = vendor._count.purchaseOrders + vendor._count.ncrs;

    if (linkedCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete vendor "${vendor.name}". It has ${vendor._count.purchaseOrders} purchase orders and ${vendor._count.ncrs} NCRs linked. Deactivate instead.`,
        },
        { status: 400 }
      );
    }

    await prisma.vendorMaster.delete({
      where: { id },
    });

    createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      tableName: "VendorMaster",
      recordId: id,
      oldValue: vendor.name,
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting vendor:", error);
    return NextResponse.json(
      { error: "Failed to delete vendor" },
      { status: 500 }
    );
  }
}
