import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PipeType } from "@prisma/client";
import { checkAccess } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const pipeType = searchParams.get("pipeType") as PipeType | null;
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (pipeType) {
      where.pipeType = pipeType;
    }
    if (search) {
      where.sizeLabel = { contains: search };
    }

    const pipeSizes = await prisma.pipeSizeMaster.findMany({
      where,
      orderBy: { sizeLabel: "asc" },
    });

    return NextResponse.json({ pipeSizes });
  } catch (error) {
    console.error("Error fetching pipe sizes:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipe sizes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { sizeLabel, od, wt, weight, pipeType } = body;

    if (!sizeLabel || !od || !wt || !weight || !pipeType) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const newSize = await prisma.pipeSizeMaster.create({
      data: {
        sizeLabel,
        od: parseFloat(od),
        wt: parseFloat(wt),
        weight: parseFloat(weight),
        pipeType,
      },
    });

    return NextResponse.json(newSize, { status: 201 });
  } catch (error) {
    console.error("Error creating pipe size:", error);
    return NextResponse.json(
      { error: "Failed to create pipe size" },
      { status: 500 }
    );
  }
}
