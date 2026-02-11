import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PRStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as PRStatus | null;

    const where: any = {};

    if (search) {
      where.OR = [
        { prNo: { contains: search, mode: "insensitive" as const } },
        { salesOrder: { soNo: { contains: search, mode: "insensitive" as const } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const purchaseRequisitions = await prisma.purchaseRequisition.findMany({
      where,
      include: {
        salesOrder: {
          select: { id: true, soNo: true },
        },
        suggestedVendor: {
          select: { id: true, name: true },
        },
        items: true,
      },
      orderBy: { prDate: "desc" },
    });

    return NextResponse.json({ purchaseRequisitions });
  } catch (error) {
    console.error("Error fetching purchase requisitions:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase requisitions" },
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
      salesOrderId,
      suggestedVendorId,
      requiredByDate,
      items,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    // Generate PR number (PR/YY/NNNNN)
    const year = new Date().getFullYear().toString().slice(-2);
    const currentFY =
      new Date().getMonth() >= 3
        ? year
        : (parseInt(year) - 1).toString().padStart(2, "0");

    const sequence = await prisma.documentSequence.findUnique({
      where: { documentType: "PURCHASE_REQUISITION" },
    });

    let nextNumber = 1;
    if (sequence) {
      nextNumber = sequence.currentNumber + 1;
      await prisma.documentSequence.update({
        where: { documentType: "PURCHASE_REQUISITION" },
        data: { currentNumber: nextNumber },
      });
    } else {
      await prisma.documentSequence.create({
        data: {
          documentType: "PURCHASE_REQUISITION",
          prefix: "PR",
          currentNumber: 1,
          financialYear: currentFY,
        },
      });
    }

    const prNo = `PR/${currentFY}/${nextNumber.toString().padStart(5, "0")}`;

    // Create PR with items
    const purchaseRequisition = await prisma.purchaseRequisition.create({
      data: {
        prNo,
        salesOrderId: salesOrderId || null,
        suggestedVendorId: suggestedVendorId || null,
        requiredByDate: requiredByDate ? new Date(requiredByDate) : null,
        status: "DRAFT",
        items: {
          create: items.map((item: any, index: number) => ({
            sNo: index + 1,
            product: item.product || null,
            material: item.material || null,
            additionalSpec: item.additionalSpec || null,
            sizeLabel: item.sizeLabel || null,
            quantity: parseFloat(item.quantity),
            uom: item.uom || "MTR",
            remarks: item.remarks || null,
          })),
        },
      },
      include: {
        salesOrder: {
          select: { soNo: true },
        },
        suggestedVendor: true,
        items: true,
      },
    });

    return NextResponse.json(purchaseRequisition, { status: 201 });
  } catch (error) {
    console.error("Error creating purchase requisition:", error);
    return NextResponse.json(
      { error: "Failed to create purchase requisition" },
      { status: 500 }
    );
  }
}
