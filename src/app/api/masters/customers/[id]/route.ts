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

    const customer = await prisma.customerMaster.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        buyers: true,
        dispatchAddresses: true,
        defaultPaymentTerms: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer" },
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
      gstNo,
      gstType,
      contactPerson,
      contactPersonEmail,
      contactPersonPhone,
      email,
      phone,
      paymentTerms,
      currency,
      isActive,
      companyType,
      openingBalance,
      defaultPaymentTermsId,
      defaultCurrency,
      companyReferenceCode,
      tagIds,
      dispatchAddresses,
    } = body;

    // Update tags if provided
    if (tagIds !== undefined) {
      await prisma.customerTag.deleteMany({ where: { customerId: id } });
      if (tagIds.length > 0) {
        await prisma.customerTag.createMany({
          data: tagIds.map((tagId: string) => ({ customerId: id, tagId })),
        });
      }
    }

    // Update dispatch addresses if provided
    if (dispatchAddresses !== undefined) {
      await prisma.customerDispatchAddress.deleteMany({ where: { customerId: id } });
      if (dispatchAddresses.length > 0) {
        await prisma.customerDispatchAddress.createMany({
          data: dispatchAddresses.map((addr: any) => ({
            customerId: id,
            label: addr.label || null,
            addressLine1: addr.addressLine1 || null,
            addressLine2: addr.addressLine2 || null,
            city: addr.city || null,
            pincode: addr.pincode || null,
            state: addr.state || null,
            country: addr.country || "India",
            consigneeName: addr.consigneeName || null,
            placeOfSupply: addr.placeOfSupply || null,
            isDefault: addr.isDefault || false,
          })),
        });
      }
    }

    const updated = await prisma.customerMaster.update({
      where: { id },
      data: {
        name,
        addressLine1: addressLine1 ?? undefined,
        addressLine2: addressLine2 ?? undefined,
        city: city ?? undefined,
        state: state ?? undefined,
        country: country ?? undefined,
        pincode: pincode ?? undefined,
        gstNo: gstNo ?? undefined,
        gstType: gstType ?? undefined,
        contactPerson: contactPerson ?? undefined,
        contactPersonEmail: contactPersonEmail ?? undefined,
        contactPersonPhone: contactPersonPhone ?? undefined,
        email: email ?? undefined,
        phone: phone ?? undefined,
        paymentTerms: paymentTerms ?? undefined,
        currency: currency ?? undefined,
        isActive: isActive ?? undefined,
        companyType: companyType ?? undefined,
        openingBalance: openingBalance !== undefined ? parseFloat(openingBalance) : undefined,
        defaultPaymentTermsId: defaultPaymentTermsId ?? undefined,
        defaultCurrency: defaultCurrency ?? undefined,
        companyReferenceCode: companyReferenceCode ?? undefined,
      },
      include: {
        tags: { include: { tag: true } },
        dispatchAddresses: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
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

    await prisma.customerMaster.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}
