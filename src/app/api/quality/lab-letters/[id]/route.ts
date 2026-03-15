import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response, companyId } = await checkAccess("labLetter", "read");
    if (!authorized) return response!;

    const labLetter = await prisma.labLetter.findFirst({
      where: { id, ...companyFilter(companyId) },
      include: {
        generatedBy: {
          select: { id: true, name: true },
        },
        tpiAgency: {
          select: { id: true, name: true, code: true, contactPerson: true, phone: true, email: true },
        },
        inventoryStock: {
          select: { id: true, heatNo: true, product: true, sizeLabel: true, make: true, quantityMtr: true, pieces: true, status: true },
        },
        company: {
          select: { id: true, companyName: true, regAddressLine1: true, regCity: true, regState: true, regPincode: true, telephoneNo: true, email: true },
        },
      },
    });

    if (!labLetter) {
      return NextResponse.json(
        { error: "Lab letter not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ labLetter });
  } catch (error) {
    console.error("Error fetching lab letter:", error);
    return NextResponse.json(
      { error: "Failed to fetch lab letter" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response, companyId } = await checkAccess("labLetter", "write");
    if (!authorized) return response!;

    const body = await request.json();

    const labLetter = await prisma.labLetter.update({
      where: { id },
      data: {
        status: body.status ?? undefined,
        remarks: body.remarks ?? undefined,
      },
    });

    await createAuditLog({
      tableName: "LabLetter",
      recordId: id,
      action: "UPDATE",
      userId: session.user.id,
      companyId,
    }).catch(console.error);

    return NextResponse.json(labLetter);
  } catch (error) {
    console.error("Error updating lab letter:", error);
    return NextResponse.json(
      { error: "Failed to update lab letter" },
      { status: 500 }
    );
  }
}
