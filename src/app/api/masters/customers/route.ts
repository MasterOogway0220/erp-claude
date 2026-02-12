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
    const companyType = searchParams.get("companyType") || "";

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { gstNo: { contains: search, mode: "insensitive" as const } },
        { contactPerson: { contains: search, mode: "insensitive" as const } },
      ];
    }

    if (companyType) {
      if (companyType === "BUYER") {
        where.companyType = { in: ["BUYER", "BOTH"] };
      } else if (companyType === "SUPPLIER") {
        where.companyType = { in: ["SUPPLIER", "BOTH"] };
      } else {
        where.companyType = companyType;
      }
    }

    const customers = await prisma.customerMaster.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
        buyers: { where: { isActive: true }, select: { id: true, buyerName: true } },
        dispatchAddresses: true,
        defaultPaymentTerms: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ customers });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
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
      gstNo,
      gstType,
      contactPerson,
      contactPersonEmail,
      contactPersonPhone,
      email,
      phone,
      paymentTerms,
      currency,
      companyType,
      openingBalance,
      defaultPaymentTermsId,
      defaultCurrency,
      companyReferenceCode,
      tagIds,
      dispatchAddresses,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Customer name is required" },
        { status: 400 }
      );
    }

    const newCustomer = await prisma.customerMaster.create({
      data: {
        name,
        addressLine1: addressLine1 || null,
        addressLine2: addressLine2 || null,
        city: city || null,
        state: state || null,
        country: country || "India",
        pincode: pincode || null,
        gstNo: gstNo || null,
        gstType: gstType || null,
        contactPerson: contactPerson || null,
        contactPersonEmail: contactPersonEmail || null,
        contactPersonPhone: contactPersonPhone || null,
        email: email || null,
        phone: phone || null,
        paymentTerms: paymentTerms || null,
        currency: currency || "INR",
        companyType: companyType || "BUYER",
        openingBalance: openingBalance ? parseFloat(openingBalance) : 0,
        defaultPaymentTermsId: defaultPaymentTermsId || null,
        defaultCurrency: defaultCurrency || "INR",
        companyReferenceCode: companyReferenceCode || null,
        tags: tagIds?.length
          ? {
              create: tagIds.map((tagId: string) => ({ tagId })),
            }
          : undefined,
        dispatchAddresses: dispatchAddresses?.length
          ? {
              create: dispatchAddresses.map((addr: any) => ({
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
            }
          : undefined,
      },
      include: {
        tags: { include: { tag: true } },
        dispatchAddresses: true,
      },
    });

    return NextResponse.json(newCustomer, { status: 201 });
  } catch (error) {
    console.error("Error creating customer:", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}
