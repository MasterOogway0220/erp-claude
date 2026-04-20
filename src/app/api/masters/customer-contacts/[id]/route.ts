import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { softDeleteData } from "@/lib/soft-delete";

// GET /api/masters/customer-contacts/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response } = await checkAccess("customerContacts", "read");
  if (!authorized) return response!;

  const { id } = await params;

  try {
    const contact = await prisma.customerContact.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true } },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json(contact);
  } catch (error) {
    console.error("Failed to fetch contact:", error);
    return NextResponse.json({ error: "Failed to fetch contact" }, { status: 500 });
  }
}

// PUT /api/masters/customer-contacts/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response } = await checkAccess("customerContacts", "write");
  if (!authorized) return response!;

  const { id } = await params;

  try {
    const body = await request.json();
    const { contactName, designation, email, phone, department, isActive } = body;

    const contact = await prisma.customerContact.update({
      where: { id },
      data: {
        ...(contactName !== undefined && { contactName }),
        ...(designation !== undefined && { designation: designation || null }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(department !== undefined && { department }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        customer: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(contact);
  } catch (error) {
    console.error("Failed to update contact:", error);
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
  }
}

// DELETE /api/masters/customer-contacts/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, response } = await checkAccess("customerContacts", "delete");
  if (!authorized) return response!;

  const { id } = await params;

  try {
    await prisma.customerContact.update({ where: { id }, data: softDeleteData(true) });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete contact:", error);
    return NextResponse.json({ error: "Failed to delete contact" }, { status: 500 });
  }
}
