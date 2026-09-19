import { NextRequest, NextResponse } from "next/server";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

// Customer item IDs — the customer's own line identifiers used on
// non-standard quotations. Kept per customer; see ClientItemMaster.

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId") || "";
    const search = searchParams.get("search") || "";

    const clientItems = await prisma.clientItemMaster.findMany({
      where: {
        ...companyFilter(companyId),
        ...(customerId ? { customerId } : {}),
        ...(search
          ? { OR: [{ itemNo: { contains: search } }, { description: { contains: search } }] }
          : {}),
      },
      include: { customer: { select: { name: true } } },
      orderBy: [{ customer: { name: "asc" } }, { itemNo: "asc" }],
      take: 2000,
    });

    return NextResponse.json({ clientItems });
  } catch (error) {
    console.error("Error fetching client items:", error);
    return NextResponse.json({ error: "Failed to fetch client items" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const itemNo = String(body.itemNo ?? "").trim();
    if (!body.customerId || !itemNo) {
      return NextResponse.json({ error: "Customer and Item ID are required" }, { status: 400 });
    }

    const clientItem = await prisma.clientItemMaster.create({
      data: {
        customerId: body.customerId,
        itemNo,
        description: body.description?.trim() || null,
        unit: body.unit || null,
        companyId,
      },
    });

    await createAuditLog({
      tableName: "ClientItemMaster",
      recordId: clientItem.id,
      action: "CREATE",
      userId: session.user?.id,
      companyId,
    });

    return NextResponse.json(clientItem, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "This customer already has that Item ID" }, { status: 400 });
    }
    console.error("Error creating client item:", error);
    return NextResponse.json({ error: "Failed to create client item" }, { status: 500 });
  }
}
