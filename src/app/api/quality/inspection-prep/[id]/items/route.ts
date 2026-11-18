import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response, companyId } = await checkAccess("inspectionPrep", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const prep = await prisma.inspectionPrep.findFirst({
      where: { id, ...companyFilter(companyId) },
      select: { id: true },
    });
    if (!prep) {
      return NextResponse.json({ error: "Inspection prep not found" }, { status: 404 });
    }
    const body = await request.json();
    const { poItemId, description, sizeLabel, uom, make } = body;

    const item = await prisma.inspectionPrepItem.create({
      data: {
        inspectionPrepId: id,
        poItemId: poItemId || null,
        description: description || null,
        sizeLabel: sizeLabel || null,
        uom: uom || null,
        make: make || null,
        status: "PENDING",
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error adding prep item:", error);
    return NextResponse.json(
      { error: "Failed to add item" },
      { status: 500 }
    );
  }
}
