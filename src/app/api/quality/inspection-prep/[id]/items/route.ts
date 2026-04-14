import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("inspectionPrep", "write");
    if (!authorized) return response!;

    const { id } = await params;
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
  } catch (error: any) {
    console.error("Error adding prep item:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to add item" },
      { status: 500 }
    );
  }
}
