import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

// GET /api/po-acceptance/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response } = await checkAccess("poAcceptance", "read");
  if (!authorized) return response!;

  const { id } = await params;

  try {
    const acceptance = await prisma.pOAcceptance.findUnique({
      where: { id },
      include: {
        clientPurchaseOrder: {
          include: {
            customer: {
              select: {
                id: true, name: true, city: true, state: true,
                contactPerson: true, email: true, phone: true,
                gstNo: true, addressLine1: true, addressLine2: true,
              },
            },
            quotation: { select: { id: true, quotationNo: true, quotationDate: true } },
            items: {
              orderBy: { sNo: "asc" },
            },
          },
        },
        createdBy: { select: { name: true } },
      },
    });

    if (!acceptance) {
      return NextResponse.json({ error: "PO Acceptance not found" }, { status: 404 });
    }

    // Convert Decimal fields
    const result = {
      ...acceptance,
      clientPurchaseOrder: {
        ...acceptance.clientPurchaseOrder,
        grandTotal: acceptance.clientPurchaseOrder.grandTotal
          ? Number(acceptance.clientPurchaseOrder.grandTotal)
          : null,
        subtotal: acceptance.clientPurchaseOrder.subtotal
          ? Number(acceptance.clientPurchaseOrder.subtotal)
          : null,
        items: acceptance.clientPurchaseOrder.items.map((item) => ({
          ...item,
          qtyQuoted: Number(item.qtyQuoted),
          qtyOrdered: Number(item.qtyOrdered),
          unitRate: Number(item.unitRate),
          amount: Number(item.amount),
          od: item.od ? Number(item.od) : null,
          wt: item.wt ? Number(item.wt) : null,
        })),
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch PO acceptance:", error);
    return NextResponse.json({ error: "Failed to fetch PO acceptance" }, { status: 500 });
  }
}

// PUT /api/po-acceptance/[id] - Update acceptance (edit or change status)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, session, response, companyId } = await checkAccess("poAcceptance", "write");
  if (!authorized) return response!;

  const { id } = await params;

  try {
    const body = await request.json();
    const existing = await prisma.pOAcceptance.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "PO Acceptance not found" }, { status: 404 });
    }

    const {
      acceptanceDate, committedDeliveryDate, remarks,
      followUpName, followUpEmail, followUpPhone,
      qualityName, qualityEmail, qualityPhone,
      accountsName, accountsEmail, accountsPhone,
      status,
    } = body;

    // If issuing, validate required contacts
    if (status === "ISSUED" && existing.status === "DRAFT") {
      if (!followUpName && !existing.followUpName) {
        return NextResponse.json(
          { error: "Follow-up contact is required to issue acceptance" },
          { status: 400 }
        );
      }
    }

    const acceptance = await prisma.pOAcceptance.update({
      where: { id },
      data: {
        ...(acceptanceDate && { acceptanceDate: new Date(acceptanceDate) }),
        ...(committedDeliveryDate && { committedDeliveryDate: new Date(committedDeliveryDate) }),
        ...(remarks !== undefined && { remarks: remarks || null }),
        ...(followUpName !== undefined && { followUpName: followUpName || null }),
        ...(followUpEmail !== undefined && { followUpEmail: followUpEmail || null }),
        ...(followUpPhone !== undefined && { followUpPhone: followUpPhone || null }),
        ...(qualityName !== undefined && { qualityName: qualityName || null }),
        ...(qualityEmail !== undefined && { qualityEmail: qualityEmail || null }),
        ...(qualityPhone !== undefined && { qualityPhone: qualityPhone || null }),
        ...(accountsName !== undefined && { accountsName: accountsName || null }),
        ...(accountsEmail !== undefined && { accountsEmail: accountsEmail || null }),
        ...(accountsPhone !== undefined && { accountsPhone: accountsPhone || null }),
        ...(status && { status }),
      },
      include: {
        clientPurchaseOrder: {
          include: {
            customer: { select: { id: true, name: true } },
            quotation: { select: { id: true, quotationNo: true } },
          },
        },
        createdBy: { select: { name: true } },
      },
    });

    // Audit log for status changes
    if (status && status !== existing.status) {
      await prisma.auditLog.create({
        data: {
          companyId,
          tableName: "POAcceptance",
          recordId: id,
          action: "STATUS_CHANGE",
          fieldName: "status",
          oldValue: existing.status,
          newValue: status,
          userId: session.user.id,
        },
      });
    }

    // Flag letter as generated when issuing
    if (status === "ISSUED" && existing.status === "DRAFT") {
      await prisma.pOAcceptance.update({
        where: { id },
        data: { generatedPath: `generated-${new Date().toISOString()}` },
      });
    }

    return NextResponse.json(acceptance);
  } catch (error) {
    console.error("Failed to update PO acceptance:", error);
    return NextResponse.json({ error: "Failed to update PO acceptance" }, { status: 500 });
  }
}
