import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { checkAccess } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("stockIssue", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { issueNo: { contains: search as const } },
        { salesOrder: { soNo: { contains: search as const } } },
      ];
    }

    const stockIssues = await prisma.stockIssue.findMany({
      where,
      include: {
        salesOrder: {
          select: { id: true, soNo: true, status: true, customer: { select: { name: true } } },
        },
        issuedBy: { select: { id: true, name: true } },
        authorizedBy: { select: { id: true, name: true } },
        items: {
          select: {
            id: true, heatNo: true, sizeLabel: true, material: true,
            quantityMtr: true, pieces: true,
          },
        },
      },
      orderBy: { issueDate: "desc" },
    });

    return NextResponse.json({ stockIssues });
  } catch (error) {
    console.error("Error fetching stock issues:", error);
    return NextResponse.json({ error: "Failed to fetch stock issues" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response } = await checkAccess("stockIssue", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { salesOrderId, authorizedById, remarks, items } = body;

    if (!salesOrderId) {
      return NextResponse.json({ error: "Sales Order is required" }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    const so = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      select: { id: true, status: true, poAcceptanceStatus: true },
    });

    if (!so) {
      return NextResponse.json({ error: "Sales Order not found" }, { status: 404 });
    }

    if (so.poAcceptanceStatus !== "ACCEPTED") {
      return NextResponse.json(
        { error: "Customer PO must be reviewed and accepted before issuing stock. Current status: " + so.poAcceptanceStatus },
        { status: 400 }
      );
    }

    if (so.status !== "OPEN" && so.status !== "PARTIALLY_DISPATCHED") {
      return NextResponse.json(
        { error: "Sales Order must be OPEN or PARTIALLY_DISPATCHED" },
        { status: 400 }
      );
    }

    // Validate all stock items are ACCEPTED
    for (const item of items) {
      const stock = await prisma.inventoryStock.findUnique({
        where: { id: item.inventoryStockId },
        select: { id: true, status: true, heatNo: true },
      });
      if (!stock) {
        return NextResponse.json(
          { error: `Stock item not found: ${item.inventoryStockId}` },
          { status: 404 }
        );
      }
      if (stock.status !== "ACCEPTED") {
        return NextResponse.json(
          { error: `Stock item ${stock.heatNo || stock.id} is not in ACCEPTED status` },
          { status: 400 }
        );
      }
    }

    const issueNo = await generateDocumentNumber("STOCK_ISSUE");

    const stockIssue = await prisma.$transaction(async (tx) => {
      const created = await tx.stockIssue.create({
        data: {
          issueNo,
          salesOrderId,
          issuedById: session.user.id,
          authorizedById: authorizedById || null,
          remarks: remarks || null,
          items: {
            create: items.map((item: any) => ({
              inventoryStockId: item.inventoryStockId,
              heatNo: item.heatNo || null,
              sizeLabel: item.sizeLabel || null,
              material: item.material || null,
              quantityMtr: parseFloat(item.quantityMtr) || 0,
              pieces: parseInt(item.pieces) || 0,
              location: item.location || null,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Update each inventory stock status (quantity was already decremented during reservation)
      for (const item of created.items) {
        const stock = await tx.inventoryStock.findUnique({
          where: { id: item.inventoryStockId },
          select: { quantityMtr: true, pieces: true },
        });
        if (!stock) continue;

        if (Number(stock.quantityMtr) <= 0) {
          // Fully reserved/dispatched - mark as DISPATCHED and clear reservation link
          await tx.inventoryStock.update({
            where: { id: item.inventoryStockId },
            data: {
              quantityMtr: 0,
              pieces: 0,
              status: "DISPATCHED",
              reservedForSO: null,
            },
          });
        } else {
          // Partially reserved - mark dispatched, clear reservation link
          await tx.inventoryStock.update({
            where: { id: item.inventoryStockId },
            data: {
              status: "DISPATCHED",
              reservedForSO: null,
            },
          });
        }
      }

      return created;
    });

    const full = await prisma.stockIssue.findUnique({
      where: { id: stockIssue.id },
      include: {
        salesOrder: { select: { soNo: true } },
        issuedBy: { select: { name: true } },
        authorizedBy: { select: { name: true } },
        items: true,
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      tableName: "StockIssue",
      recordId: stockIssue.id,
      newValue: JSON.stringify({ issueNo }),
    }).catch(console.error);

    return NextResponse.json(full, { status: 201 });
  } catch (error) {
    console.error("Error creating stock issue:", error);
    return NextResponse.json({ error: "Failed to create stock issue" }, { status: 500 });
  }
}
