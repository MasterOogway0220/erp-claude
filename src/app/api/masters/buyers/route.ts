import { NextRequest, NextResponse } from "next/server";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const customerId = searchParams.get("customerId") || "";

    const where: any = { ...companyFilter(companyId) };
    if (customerId) where.customerId = customerId;
    if (search) {
      where.OR = [
        { buyerName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const buyers = await prisma.buyerMaster.findMany({
      where,
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { buyerName: "asc" },
    });

    // Also include CustomerContact records so contacts added in the Buyer Contact master appear here
    const contactWhere: any = {};
    if (customerId) contactWhere.customerId = customerId;
    if (search) {
      contactWhere.OR = [
        { contactName: { contains: search } },
        { email: { contains: search } },
      ];
    }
    const contacts = await prisma.customerContact.findMany({
      where: contactWhere,
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { contactName: "asc" },
    });

    // Merge: skip contacts whose name already exists as a BuyerMaster entry for that customer
    const buyerKeys = new Set(buyers.map((b) => `${b.customerId}:${b.buyerName.toLowerCase()}`));
    const contactBuyers = contacts
      .filter((c) => !buyerKeys.has(`${c.customerId}:${c.contactName.toLowerCase()}`))
      .map((c) => ({
        id: `cc_${c.id}`,
        customerId: c.customerId,
        buyerName: c.contactName,
        designation: c.designation,
        email: c.email,
        mobile: null,
        telephone: null,
        isActive: c.isActive,
        customer: c.customer,
      }));

    return NextResponse.json({ buyers: [...buyers, ...contactBuyers] });
  } catch (error) {
    console.error("Error fetching buyers:", error);
    return NextResponse.json({ error: "Failed to fetch buyers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();

    if (!body.customerId || !body.buyerName) {
      return NextResponse.json(
        { error: "Customer and buyer name are required" },
        { status: 400 }
      );
    }

    const buyer = await prisma.buyerMaster.create({
      data: {
        customerId: body.customerId,
        buyerName: body.buyerName,
        designation: body.designation || null,
        email: body.email || null,
        mobile: body.mobile || null,
        telephone: body.telephone || null,
        isActive: body.isActive ?? true,
        companyId,
      },
      include: {
        customer: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      tableName: "BuyerMaster",
      recordId: buyer.id,
      action: "CREATE",
      userId: session.user?.id,
      companyId,
    });

    return NextResponse.json(buyer, { status: 201 });
  } catch (error) {
    console.error("Error creating buyer:", error);
    return NextResponse.json(
      { error: "Failed to create buyer" },
      { status: 500 }
    );
  }
}
