import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PipeType } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { notDeleted } from "@/lib/soft-delete";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const pipeType = searchParams.get("pipeType") as PipeType | null;
    const search = searchParams.get("search") || "";

    const where: any = { ...notDeleted, ...companyFilter(companyId) };
    if (pipeType) {
      where.pipeType = pipeType;
    }
    if (search) {
      const textFilters: any[] = [
        { sizeLabel: { contains: search } },
        { schedule: { contains: search } },
      ];
      const num = parseFloat(search);
      if (!isNaN(num)) {
        textFilters.push(
          { od: num },
          { wt: num },
          { weight: num },
          { nps: num },
        );
      }
      where.OR = textFilters;
    }

    const sizes = await prisma.sizeMaster.findMany({
      where,
      orderBy: { sizeLabel: "asc" },
    });

    return NextResponse.json({ sizes });
  } catch (error) {
    console.error("Error fetching sizes:", error);
    return NextResponse.json(
      { error: "Failed to fetch sizes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { sizeLabel, od, wt, weight, pipeType } = body;

    if (!sizeLabel || !od || !wt || !weight || !pipeType) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const newSize = await prisma.sizeMaster.create({
      data: {
        sizeLabel,
        od: parseFloat(od),
        wt: parseFloat(wt),
        weight: parseFloat(weight),
        pipeType,
        companyId,
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      tableName: "SizeMaster",
      recordId: newSize.id,
      newValue: JSON.stringify({ sizeLabel, pipeType }),
      companyId,
    }).catch(console.error);

    return NextResponse.json(newSize, { status: 201 });
  } catch (error) {
    console.error("Error creating size:", error);
    return NextResponse.json(
      { error: "Failed to create size" },
      { status: 500 }
    );
  }
}
