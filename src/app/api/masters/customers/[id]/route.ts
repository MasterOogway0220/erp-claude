import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response, companyId } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const customer = await prisma.customerMaster.findUnique({
      where: { id, ...companyFilter(companyId) },
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
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
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
      gstNo,
      gstType,
      pan,
      panNo,
      industrySegment,
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
      creditLimit,
      creditDays,
      defaultPaymentTermsId,
      defaultCurrency,
      companyReferenceCode,
      tanNo,
      bankName,
      bankBranchName,
      bankAccountNo,
      bankIfsc,
      bankAccountType,
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

    // Fetch existing customer for type-change logic
    const existingCustomer = await prisma.customerMaster.findUnique({
      where: { id, ...companyFilter(companyId) },
      select: { companyType: true, contactPerson: true, contactPersonEmail: true, contactPersonPhone: true, linkedVendor: { select: { id: true } } },
    });

    const updated = await prisma.customerMaster.update({
      where: { id, ...companyFilter(companyId) },
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
        pan: pan ?? panNo ?? undefined,
        industrySegment: industrySegment ?? undefined,
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
        creditLimit: creditLimit !== undefined ? (creditLimit ? parseFloat(creditLimit) : null) : undefined,
        creditDays: creditDays !== undefined ? (creditDays ? parseInt(creditDays) : null) : undefined,
        defaultPaymentTermsId: defaultPaymentTermsId ?? undefined,
        defaultCurrency: defaultCurrency ?? undefined,
        companyReferenceCode: companyReferenceCode ?? undefined,
        tanNo: tanNo ?? undefined,
        bankName: bankName ?? undefined,
        bankBranchName: bankBranchName ?? undefined,
        bankAccountNo: bankAccountNo ?? undefined,
        bankIfsc: bankIfsc ?? undefined,
        bankAccountType: bankAccountType ?? undefined,
      },
      include: {
        tags: { include: { tag: true } },
        dispatchAddresses: true,
      },
    });

    if (companyType && existingCustomer) {
      const wasSupplier = existingCustomer.companyType === "SUPPLIER" || existingCustomer.companyType === "BOTH";
      const isSupplier = companyType === "SUPPLIER" || companyType === "BOTH";
      const isBuyer = companyType === "BUYER" || companyType === "BOTH";

      // Auto-create buyer contact when type becomes BUYER/BOTH and none exists
      if (isBuyer) {
        const buyerCount = await prisma.buyerMaster.count({ where: { customerId: id } });
        if (buyerCount === 0) {
          const cp = contactPerson ?? existingCustomer.contactPerson;
          if (cp) {
            await prisma.buyerMaster.create({
              data: {
                customerId: id,
                buyerName: cp,
                email: (contactPersonEmail ?? existingCustomer.contactPersonEmail) || null,
                mobile: (contactPersonPhone ?? existingCustomer.contactPersonPhone) || null,
              },
            });
          }
        }
      }

      // Auto-create linked VendorMaster when type becomes SUPPLIER/BOTH and none exists
      if (isSupplier && !wasSupplier && !existingCustomer.linkedVendor) {
        await prisma.vendorMaster.create({
          data: {
            linkedCustomerId: id,
            name: name ?? updated.name,
            addressLine1: addressLine1 || updated.addressLine1 || null,
            addressLine2: addressLine2 || updated.addressLine2 || null,
            city: city || updated.city || null,
            state: state || updated.state || null,
            country: country || updated.country || "India",
            pincode: pincode || updated.pincode || null,
            contactPerson: contactPerson || updated.contactPerson || null,
            email: email || updated.email || null,
            phone: phone || updated.phone || null,
            gstNo: gstNo || updated.gstNo || null,
            gstType: (gstType || updated.gstType) as any || null,
            pan: (pan || panNo || updated.pan) || null,
            approvedStatus: false,
          },
        });
      }

      // Sync address/name changes to linked vendor if it exists
      if (isSupplier && existingCustomer.linkedVendor) {
        await prisma.vendorMaster.update({
          where: { linkedCustomerId: id },
          data: {
            name: name ?? undefined,
            addressLine1: addressLine1 ?? undefined,
            addressLine2: addressLine2 ?? undefined,
            city: city ?? undefined,
            state: state ?? undefined,
            country: country ?? undefined,
            pincode: pincode ?? undefined,
            contactPerson: contactPerson ?? undefined,
            email: email ?? undefined,
            phone: phone ?? undefined,
            gstNo: gstNo ?? undefined,
            gstType: gstType as any ?? undefined,
            pan: (pan || panNo) ?? undefined,
          },
        });
      }
    }

    createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      tableName: "CustomerMaster",
      recordId: id,
      newValue: JSON.stringify({ name: updated.name }),
      companyId,
    }).catch(console.error);

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
    const { authorized, session, response, companyId } = await checkAccess("masters", "delete");
    if (!authorized) return response!;

    // Check for linked records before deleting
    const customer = await prisma.customerMaster.findUnique({
      where: { id, ...companyFilter(companyId) },
      select: {
        name: true,
        _count: {
          select: {
            quotations: true,
            salesOrders: true,
            invoices: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const linkedCount =
      customer._count.quotations +
      customer._count.salesOrders +
      customer._count.invoices;

    if (linkedCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete customer "${customer.name}". It has ${customer._count.quotations} quotations, ${customer._count.salesOrders} sales orders, and ${customer._count.invoices} invoices linked. Deactivate instead.`,
        },
        { status: 400 }
      );
    }

    await prisma.customerMaster.delete({
      where: { id, ...companyFilter(companyId) },
    });

    createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      tableName: "CustomerMaster",
      recordId: id,
      oldValue: customer.name,
      companyId,
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}
