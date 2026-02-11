import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QuotationStatus, QuotationType } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as QuotationStatus | null;

    const where: any = {};

    if (search) {
      where.OR = [
        { quotationNo: { contains: search, mode: "insensitive" as const } },
        { customer: { name: { contains: search, mode: "insensitive" as const } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        customer: true,
        enquiry: true,
        preparedBy: { select: { name: true } },
        items: true,
      },
      orderBy: { quotationDate: "desc" },
    });

    return NextResponse.json({ quotations });
  } catch (error) {
    console.error("Error fetching quotations:", error);
    return NextResponse.json(
      { error: "Failed to fetch quotations" },
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
      customerId,
      enquiryId,
      quotationType,
      currency,
      validUpto,
      items,
      terms,
    } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer is required" },
        { status: 400 }
      );
    }

    // Generate quotation number (NPS/YY/NNNNN)
    const year = new Date().getFullYear().toString().slice(-2);
    const currentFY = new Date().getMonth() >= 3 ? year : (parseInt(year) - 1).toString().padStart(2, "0");

    const sequence = await prisma.documentSequence.findUnique({
      where: { documentType: "QUOTATION" },
    });

    let nextNumber = 1;
    if (sequence) {
      nextNumber = sequence.currentNumber + 1;
      await prisma.documentSequence.update({
        where: { documentType: "QUOTATION" },
        data: { currentNumber: nextNumber },
      });
    } else {
      await prisma.documentSequence.create({
        data: {
          documentType: "QUOTATION",
          prefix: "NPS",
          currentNumber: 1,
          financialYear: currentFY,
        },
      });
    }

    const quotationNo = `NPS/${currentFY}/${nextNumber.toString().padStart(5, "0")}`;

    // Create quotation with items and terms
    const quotation = await prisma.quotation.create({
      data: {
        quotationNo,
        customerId,
        enquiryId: enquiryId || null,
        quotationType: quotationType || QuotationType.DOMESTIC,
        currency: currency || "INR",
        validUpto: validUpto ? new Date(validUpto) : null,
        preparedById: session.user.id,
        items: {
          create: items.map((item: any, index: number) => ({
            sNo: index + 1,
            product: item.product || null,
            material: item.material || null,
            additionalSpec: item.additionalSpec || null,
            sizeId: item.sizeId || null,
            sizeLabel: item.sizeLabel || null,
            od: item.od ? parseFloat(item.od) : null,
            wt: item.wt ? parseFloat(item.wt) : null,
            length: item.length || null,
            ends: item.ends || null,
            quantity: parseFloat(item.quantity),
            unitRate: parseFloat(item.unitRate),
            amount: parseFloat(item.amount),
            delivery: item.delivery || null,
            remark: item.remark || null,
            unitWeight: item.unitWeight ? parseFloat(item.unitWeight) : null,
            totalWeightMT: item.totalWeightMT ? parseFloat(item.totalWeightMT) : null,
          })),
        },
        terms: {
          create: terms?.map((term: any, index: number) => ({
            termNo: index + 1,
            termName: term.termName,
            termValue: term.termValue,
            isDefault: term.isDefault ?? true,
          })) || [],
        },
      },
      include: {
        customer: true,
        items: true,
        terms: true,
      },
    });

    // Update enquiry status if linked
    if (enquiryId) {
      await prisma.enquiry.update({
        where: { id: enquiryId },
        data: { status: "QUOTATION_PREPARED" },
      });
    }

    return NextResponse.json(quotation, { status: 201 });
  } catch (error) {
    console.error("Error creating quotation:", error);
    return NextResponse.json(
      { error: "Failed to create quotation" },
      { status: 500 }
    );
  }
}
