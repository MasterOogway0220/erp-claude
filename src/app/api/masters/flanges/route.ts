import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const search = searchParams.get("search") || "";

    const where: any = { isActive: true, ...companyFilter(companyId) };
    if (type) {
      where.type = type;
    }
    if (search) {
      where.OR = [
        { type: { contains: search } },
        { size: { contains: search } },
        { rating: { contains: search } },
        { materialGrade: { contains: search } },
        { standard: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const flanges = await prisma.flangeMaster.findMany({
      where,
      orderBy: [{ type: "asc" }, { size: "asc" }],
    });

    return NextResponse.json({ flanges });
  } catch (error) {
    console.error("Error fetching flanges:", error);
    return NextResponse.json(
      { error: "Failed to fetch flanges" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { type, size, rating, materialGrade, standard, facing, schedule, description } = body;

    if (!type || !size || !rating || !materialGrade) {
      return NextResponse.json(
        { error: "Type, Size, Rating, and Material Grade are required" },
        { status: 400 }
      );
    }

    // Auto-generate description if not provided
    const autoDesc = description || [type, size, rating, facing, materialGrade, standard].filter(Boolean).join(" ");

    const flange = await prisma.flangeMaster.create({
      data: {
        type,
        size,
        rating,
        materialGrade,
        standard: standard || null,
        facing: facing || null,
        schedule: schedule || null,
        description: autoDesc,
        companyId,
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      tableName: "FlangeMaster",
      recordId: flange.id,
      newValue: JSON.stringify({ type, size, rating, materialGrade }),
      companyId,
    }).catch(console.error);

    return NextResponse.json(flange, { status: 201 });
  } catch (error) {
    console.error("Error creating flange:", error);
    return NextResponse.json(
      { error: "Failed to create flange" },
      { status: 500 }
    );
  }
}
