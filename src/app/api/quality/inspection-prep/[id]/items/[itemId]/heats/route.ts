import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { authorized, session, response } = await checkAccess("inspectionPrep", "write");
    if (!authorized) return response!;

    const { itemId } = await params;
    const body = await request.json();
    const { heatNo, lengthMtr, pieces, make } = body;

    if (!heatNo) {
      return NextResponse.json({ error: "Heat number is required" }, { status: 400 });
    }

    const heat = await prisma.heatEntry.create({
      data: {
        inspectionPrepItemId: itemId,
        heatNo,
        lengthMtr: lengthMtr ? parseFloat(lengthMtr) : null,
        pieces: pieces ? parseInt(pieces) : null,
        make: make || null,
        addedById: session.user.id,
      },
    });

    return NextResponse.json(heat, { status: 201 });
  } catch (error: any) {
    console.error("Error adding heat entry:", error);
    // Handle unique constraint violation (duplicate heatNo for same item)
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "This heat number already exists for this item" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error?.message || "Failed to add heat entry" },
      { status: 500 }
    );
  }
}
