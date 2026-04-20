import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";

// GET /api/masters/customer-contacts - List contacts, optionally filter by customerId and department
export async function GET(request: NextRequest) {
  const { authorized, response } = await checkAccess("customerContacts", "read");
  if (!authorized) return response!;

  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    const department = searchParams.get("department");
    const search = searchParams.get("search");

    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (department) where.department = department;
    if (search) {
      where.OR = [
        { contactName: { contains: search } },
        { email: { contains: search } },
        { designation: { contains: search } },
      ];
    }

    const contacts = await prisma.customerContact.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
      },
      orderBy: [{ department: "asc" }, { contactName: "asc" }],
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Failed to fetch customer contacts:", error);
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }
}

// POST /api/masters/customer-contacts - Create a new contact
export async function POST(request: NextRequest) {
  const { authorized, session, response } = await checkAccess("customerContacts", "write");
  if (!authorized) return response!;

  try {
    const body = await request.json();
    const { customerId, contactName, designation, email, phone, department } = body;

    if (!customerId || !contactName || !department) {
      return NextResponse.json(
        { error: "Customer, contact name, and department are required" },
        { status: 400 }
      );
    }

    const contact = await prisma.customerContact.create({
      data: {
        customerId,
        contactName,
        designation: designation || null,
        email: email || null,
        phone: phone || null,
        department,
      },
      include: {
        customer: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error("Failed to create customer contact:", error);
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }
}
