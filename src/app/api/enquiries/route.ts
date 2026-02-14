import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { EnquiryStatus } from "@prisma/client";
import { checkAccess } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, session, response } = await checkAccess("enquiry", "read");
    if (!authorized) return response!;

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
    const { authorized, session, response } = await checkAccess("enquiry", "write");
    if (!authorized) return response!;

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
      projectLocation,
      endUser,
      priority,
      expectedClosureDate,
      remarks,
      items,
    } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer is required" },
        { status: 400 }
      );
    }

    // Generate enquiry number using shared document numbering utility
    const enquiryNo = await generateDocumentNumber("ENQUIRY");

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
        projectLocation: projectLocation || null,
        endUser: endUser || null,
        priority: priority || "NORMAL",
        expectedClosureDate: expectedClosureDate ? new Date(expectedClosureDate) : null,
        remarks: remarks || null,
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

    createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      tableName: "Enquiry",
      recordId: enquiry.id,
      newValue: JSON.stringify({ enquiryNo: enquiry.enquiryNo }),
    }).catch(console.error);

    return NextResponse.json(enquiry, { status: 201 });
  } catch (error) {
    console.error("Error creating enquiry:", error);
    return NextResponse.json(
      { error: "Failed to create enquiry" },
      { status: 500 }
    );
  }
}
