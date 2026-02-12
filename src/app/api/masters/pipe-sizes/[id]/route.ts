import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const pipeSize = await prisma.pipeSizeMaster.findUnique({
      where: { id },
    });

    if (!pipeSize) {
      return NextResponse.json(
        { error: "Pipe size not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(pipeSize);
  } catch (error) {
    console.error("Error fetching pipe size:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipe size" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const pipeSize = await prisma.pipeSizeMaster.update({
      where: { id },
      data: {
        sizeLabel: body.sizeLabel ?? undefined,
        od: body.od != null ? parseFloat(body.od) : undefined,
        wt: body.wt != null ? parseFloat(body.wt) : undefined,
        weight: body.weight != null ? parseFloat(body.weight) : undefined,
        pipeType: body.pipeType ?? undefined,
        nps: body.nps != null ? parseFloat(body.nps) : undefined,
        schedule: body.schedule ?? undefined,
      },
    });

    return NextResponse.json(pipeSize);
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.pipeSizeMaster.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Pipe size deleted successfully" });
  } catch (error) {
    console.error("Error deleting pipe size:", error);
    return NextResponse.json(
      { error: "Failed to delete pipe size" },
      { status: 500 }
    );
  }
}
