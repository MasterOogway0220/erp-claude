import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EnquiryStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as EnquiryStatus | null;

    const where: any = {};

    if (search) {
      where.OR = [
        { enquiryNo: { contains: search, mode: "insensitive" as const } },
        { projectName: { contains: search, mode: "insensitive" as const } },
        { buyerName: { contains: search, mode: "insensitive" as const } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const enquiries = await prisma.enquiry.findMany({
      where,
      include: {
        customer: true,
        items: true,
        _count: {
          select: { quotations: true },
        },
      },
      orderBy: { enquiryDate: "desc" },
    });

    return NextResponse.json({ enquiries });
  } catch (error) {
    console.error("Error fetching enquiries:", error);
    return NextResponse.json(
      { error: "Failed to fetch enquiries" },
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
      buyerName,
      buyerDesignation,
      buyerEmail,
      buyerContact,
      clientInquiryNo,
      clientInquiryDate,
      enquiryMode,
      projectName,
      items,
    } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer is required" },
        { status: 400 }
      );
    }

    // Generate enquiry number (ENQ/YY/NNNNN)
    const year = new Date().getFullYear().toString().slice(-2);
    const currentFY = new Date().getMonth() >= 3 ? year : (parseInt(year) - 1).toString().padStart(2, "0");

    const sequence = await prisma.documentSequence.findUnique({
      where: { documentType: "ENQUIRY" },
    });

    let nextNumber = 1;
    if (sequence) {
      nextNumber = sequence.currentNumber + 1;
      await prisma.documentSequence.update({
        where: { documentType: "ENQUIRY" },
        data: { currentNumber: nextNumber },
      });
    } else {
      await prisma.documentSequence.create({
        data: {
          documentType: "ENQUIRY",
          prefix: "ENQ",
          currentNumber: 1,
          financialYear: currentFY,
        },
      });
    }

    const enquiryNo = `ENQ/${currentFY}/${nextNumber.toString().padStart(5, "0")}`;

    // Create enquiry with items
    const enquiry = await prisma.enquiry.create({
      data: {
        enquiryNo,
        customerId,
        buyerName: buyerName || null,
        buyerDesignation: buyerDesignation || null,
        buyerEmail: buyerEmail || null,
        buyerContact: buyerContact || null,
        clientInquiryNo: clientInquiryNo || null,
        clientInquiryDate: clientInquiryDate ? new Date(clientInquiryDate) : null,
        enquiryMode: enquiryMode || "EMAIL",
        projectName: projectName || null,
        items: {
          create: items.map((item: any, index: number) => ({
            sNo: index + 1,
            product: item.product || null,
            material: item.material || null,
            additionalSpec: item.additionalSpec || null,
            size: item.size || null,
            ends: item.ends || null,
            quantity: item.quantity ? parseFloat(item.quantity) : null,
            uom: item.uom || "Mtr",
            remarks: item.remarks || null,
          })),
        },
      },
      include: {
        customer: true,
        items: true,
      },
    });

    return NextResponse.json(enquiry, { status: 201 });
  } catch (error) {
    console.error("Error creating enquiry:", error);
    return NextResponse.json(
      { error: "Failed to create enquiry" },
      { status: 500 }
    );
  }
}
