import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { notDeleted } from "@/lib/soft-delete";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const search = searchParams.get("search") || "";

    const where: any = { ...notDeleted, isActive: true, ...companyFilter(companyId) };
    if (type) {
      where.type = type;
    }
    if (search) {
      where.OR = [
        { type: { contains: search } },
        { size: { contains: search } },
        { materialGrade: { contains: search } },
        { standard: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const fittings = await prisma.fittingMaster.findMany({
      where,
      orderBy: [{ type: "asc" }, { size: "asc" }],
    });

    return NextResponse.json({ fittings });
  } catch (error) {
    console.error("Error fetching fittings:", error);
    return NextResponse.json(
      { error: "Failed to fetch fittings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { type, size, schedule, materialGrade, standard, endType, rating, description } = body;

    if (!type || !size || !materialGrade) {
      return NextResponse.json(
        { error: "Type, Size, and Material Grade are required" },
        { status: 400 }
      );
    }

    // Auto-generate description if not provided
    const autoDesc = description || [type, size, schedule, endType, rating, materialGrade, standard].filter(Boolean).join(" ");

    const fitting = await prisma.fittingMaster.create({
      data: {
        type,
        size,
        schedule: schedule || null,
        materialGrade,
        standard: standard || null,
        endType: endType || null,
        rating: rating || null,
        description: autoDesc,
        companyId,
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      tableName: "FittingMaster",
      recordId: fitting.id,
      newValue: JSON.stringify({ type, size, materialGrade }),
      companyId,
    }).catch(console.error);

    return NextResponse.json(fitting, { status: 201 });
  } catch (error) {
    console.error("Error creating fitting:", error);
    return NextResponse.json(
      { error: "Failed to create fitting" },
      { status: 500 }
    );
  }
}
