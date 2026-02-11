import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sizeLabel, od, wt, weight, pipeType } = body;

    const updated = await prisma.pipeSizeMaster.update({
      where: { id: params.id },
      data: {
        sizeLabel,
        od: parseFloat(od),
        wt: parseFloat(wt),
        weight: parseFloat(weight),
        pipeType,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating pipe size:", error);
    return NextResponse.json(
      { error: "Failed to update pipe size" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.pipeSizeMaster.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting pipe size:", error);
    return NextResponse.json(
      { error: "Failed to delete pipe size" },
      { status: 500 }
    );
  }
}
