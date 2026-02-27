import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { checkAccess } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response } = await checkAccess("stockIssue", "read");
    if (!authorized) return response!;

    const stockIssue = await prisma.stockIssue.findUnique({
      where: { id },
      include: {
        salesOrder: {
          select: {
            id: true, soNo: true, status: true,
            customer: { select: { id: true, name: true } },
          },
        },
        issuedBy: { select: { id: true, name: true } },
        authorizedBy: { select: { id: true, name: true } },
        items: {
          include: {
            inventoryStock: {
              select: {
                id: true, heatNo: true, product: true, sizeLabel: true,
                specification: true, status: true, quantityMtr: true,
              },
            },
          },
        },
      },
    });

    if (!stockIssue) {
      return NextResponse.json({ error: "Stock issue not found" }, { status: 404 });
    }

    return NextResponse.json({ stockIssue });
  } catch (error) {
    console.error("Error fetching stock issue:", error);
    return NextResponse.json({ error: "Failed to fetch stock issue" }, { status: 500 });
  }
}

// State machine transitions
const VALID_TRANSITIONS: Record<string, { to: string; permission: string }[]> = {
  DRAFT: [{ to: "PENDING_AUTHORIZATION", permission: "write" }],
  PENDING_AUTHORIZATION: [
    { to: "AUTHORIZED", permission: "approve" },
    { to: "REJECTED", permission: "approve" },
  ],
  REJECTED: [{ to: "DRAFT", permission: "write" }],
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status: newStatus } = body;

    if (!newStatus) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    // Determine required permission based on target status
    const requiresApproval = newStatus === "AUTHORIZED" || newStatus === "REJECTED";
    const permissionLevel = requiresApproval ? "approve" : "write";
    const { authorized, session, response } = await checkAccess("stockIssue", permissionLevel);
    if (!authorized) return response!;

    const stockIssue = await prisma.stockIssue.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!stockIssue) {
      return NextResponse.json({ error: "Stock issue not found" }, { status: 404 });
    }

    // Validate transition
    const allowed = VALID_TRANSITIONS[stockIssue.status];
    if (!allowed || !allowed.some((t) => t.to === newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${stockIssue.status} to ${newStatus}` },
        { status: 400 }
      );
    }

    // If authorizing, dispatch stock in a transaction
    if (newStatus === "AUTHORIZED") {
      await prisma.$transaction(async (tx) => {
        await tx.stockIssue.update({
          where: { id },
          data: {
            status: "AUTHORIZED",
            authorizedById: session.user.id,
          },
        });

        // Dispatch each stock item
        for (const item of stockIssue.items) {
          const stock = await tx.inventoryStock.findUnique({
            where: { id: item.inventoryStockId },
            select: { quantityMtr: true, pieces: true },
          });
          if (!stock) continue;

          if (Number(stock.quantityMtr) <= 0) {
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
            await tx.inventoryStock.update({
              where: { id: item.inventoryStockId },
              data: {
                status: "DISPATCHED",
                reservedForSO: null,
              },
            });
          }
        }
      });
    } else {
      // Simple status update for other transitions
      await prisma.stockIssue.update({
        where: { id },
        data: {
          status: newStatus,
          ...(newStatus === "DRAFT" ? { authorizedById: null } : {}),
        },
      });
    }

    createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      tableName: "StockIssue",
      recordId: id,
      newValue: JSON.stringify({ status: newStatus }),
    }).catch(console.error);

    // Return updated record
    const updated = await prisma.stockIssue.findUnique({
      where: { id },
      include: {
        salesOrder: {
          select: {
            id: true, soNo: true, status: true,
            customer: { select: { id: true, name: true } },
          },
        },
        issuedBy: { select: { id: true, name: true } },
        authorizedBy: { select: { id: true, name: true } },
        items: {
          include: {
            inventoryStock: {
              select: {
                id: true, heatNo: true, product: true, sizeLabel: true,
                specification: true, status: true, quantityMtr: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ stockIssue: updated });
  } catch (error) {
    console.error("Error updating stock issue:", error);
    return NextResponse.json({ error: "Failed to update stock issue" }, { status: 500 });
  }
}
